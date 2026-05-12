package org.example.plansync.Services;

import lombok.RequiredArgsConstructor;
import org.example.plansync.Entities.*;
import org.example.plansync.Repositories.ChannelMessageRepo;
import org.example.plansync.Repositories.ChannelRepo;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
@RequiredArgsConstructor
public class ChannelServiceImpl implements IChannelService {

    private final ChannelRepo channelRepo;
    private final ChannelMessageRepo channelMessageRepo;

    @Override
    public Channel createChannelForTicket(Ticket ticket) {
        String channelName = "ticket-" + ticket.getReference().toLowerCase();
        String members = buildMembers(ticket.getSubmittedBy(), ticket.getAssignedTo());

        Channel channel = Channel.builder()
                .name(channelName)
                .status(ChannelStatus.ACTIVE)
                .ticket(ticket)
                .members(members)
                .build();

        return channelRepo.save(channel);
    }

    @Override
    public Channel archiveChannelForTicket(Long ticketId) {
        Channel channel = channelRepo.findByTicketId(ticketId)
                .orElseThrow(() -> new IllegalStateException(
                        "No channel found for ticket id: " + ticketId));
        channel.setStatus(ChannelStatus.ARCHIVED);
        return channelRepo.save(channel);
    }

    @Override
    public Channel getChannelByTicketId(Long ticketId) {
        return channelRepo.findByTicketId(ticketId)
                .orElseThrow(() -> new IllegalStateException(
                        "No channel found for ticket id: " + ticketId));
    }

    @Override
    public Channel getChannelById(Long channelId) {
        return channelRepo.findById(channelId)
                .orElseThrow(() -> new IllegalStateException(
                        "Channel not found: " + channelId));
    }

    @Override
    @Transactional
    public ChannelMessage sendMessage(Long channelId, String senderUsername, String content) {
        Channel channel = getChannelById(channelId);
        if (channel.getStatus() == ChannelStatus.ARCHIVED) {
            throw new IllegalStateException("Channel is archived. No new messages allowed.");
        }
        ChannelMessage message = ChannelMessage.builder()
                .channel(channel)
                .senderUsername(senderUsername)
                .content(content)
                .build();
        return channelMessageRepo.save(message);
    }

    @Override
    public List<ChannelMessage> getMessageHistory(Long channelId) {
        return channelMessageRepo.findByChannelIdOrderBySentAtAsc(channelId);
    }

    private String buildMembers(String submittedBy, String assignedTo) {
        if (submittedBy == null && assignedTo == null) return "";
        if (submittedBy == null) return assignedTo;
        if (assignedTo == null) return submittedBy;
        if (submittedBy.equals(assignedTo)) return submittedBy;
        return submittedBy + "," + assignedTo;
    }
}
