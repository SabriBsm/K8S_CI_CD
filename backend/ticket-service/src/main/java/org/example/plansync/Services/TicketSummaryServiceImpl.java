package org.example.plansync.Services;

import lombok.RequiredArgsConstructor;
import org.example.plansync.Entities.Channel;
import org.example.plansync.Entities.Ticket;
import org.example.plansync.Entities.TicketSummary;
import org.example.plansync.Repositories.ChannelRepo;
import org.example.plansync.Repositories.ResponseRepo;
import org.example.plansync.Repositories.TicketRepo;
import org.example.plansync.Repositories.TicketSummaryRepo;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Collections;
import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class TicketSummaryServiceImpl implements ITicketSummaryService {

    private final TicketRepo ticketRepo;
    private final ResponseRepo responseRepo;
    private final ChannelRepo channelRepo;
    private final TicketSummaryRepo ticketSummaryRepo;
    private final IAiService aiService;

    @Override
    @Transactional
    public TicketSummary generateSummary(Long ticketId) {
        Ticket ticket = ticketRepo.findById(ticketId)
                .orElseThrow(() -> new RuntimeException("Ticket introuvable : " + ticketId));

        List<String> responses = responseRepo.findByTicketId(ticketId)
                .stream()
                .map(r -> "[" + r.getRespondedBy() + "] " + r.getContent())
                .collect(Collectors.toList());

        List<String> chatMessages = channelRepo.findByTicketId(ticketId)
                .map(Channel::getMessages)
                .orElse(Collections.emptyList())
                .stream()
                .map(m -> "[" + m.getSenderUsername() + "] " + m.getContent())
                .collect(Collectors.toList());

        ticketSummaryRepo.findByTicketId(ticketId).ifPresent(ticketSummaryRepo::delete);

        TicketSummary summary = aiService.generateTicketSummary(ticket, responses, chatMessages);
        return ticketSummaryRepo.save(summary);
    }

    @Override
    public TicketSummary getSummaryByTicket(Long ticketId) {
        return ticketSummaryRepo.findByTicketId(ticketId)
                .orElseThrow(() -> new RuntimeException("Aucun résumé trouvé pour le ticket : " + ticketId));
    }
}
