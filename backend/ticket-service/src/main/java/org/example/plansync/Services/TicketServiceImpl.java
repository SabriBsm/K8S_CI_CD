package org.example.plansync.Services;

import lombok.RequiredArgsConstructor;
import org.example.plansync.Entities.Ticket;
import org.example.plansync.Entities.TicketCategory;
import org.example.plansync.Entities.TicketPriority;
import org.example.plansync.Entities.TicketStatus;
import org.example.plansync.Repositories.ChannelRepo;
import org.example.plansync.Repositories.TicketRepo;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.time.LocalDateTime;
import java.util.Collections;
import java.util.List;
import java.util.NoSuchElementException;
import static org.springframework.http.HttpStatus.FORBIDDEN;

@Service
@RequiredArgsConstructor
public class TicketServiceImpl implements ITicketService {

    private final TicketRepo ticketRepo;
    private final ChannelRepo channelRepo;
    private final IChannelService iChannelService;
    private final ITicketSummaryService ticketSummaryService;

    @Override
    public List<Ticket> retrieveAllTickets() {
        return ticketRepo.findAll();
    }

    @Override
    public List<Ticket> retrieveVisibleTickets(String username, boolean canViewAll) {
        if (canViewAll) {
            return ticketRepo.findAll();
        }
        if (username == null || username.isBlank()) {
            return Collections.emptyList();
        }
        return ticketRepo.findBySubmittedByOrAssignedTo(username, username);
    }

    @Override
    public Ticket retrieveTicket(Long ticketId) {
        return ticketRepo.findById(ticketId).get();
    }

    @Override
    public Ticket retrieveVisibleTicket(Long ticketId, String username, boolean canViewAll) {
        if (canViewAll) {
            return ticketRepo.findById(ticketId).orElseThrow(() -> new NoSuchElementException("Ticket not found"));
        }
        if (username == null || username.isBlank()) {
            throw new NoSuchElementException("Ticket not found");
        }
        return ticketRepo.findByIdAndSubmittedByOrIdAndAssignedTo(ticketId, username, ticketId, username)
                .orElseThrow(() -> new NoSuchElementException("Ticket not found"));
    }

    @Override
    public Ticket retrieveTicketByReference(String reference) {
        return ticketRepo.findByReference(reference).get();
    }

    @Override
    public Ticket retrieveVisibleTicketByReference(String reference, String username, boolean canViewAll) {
        if (canViewAll) {
            return ticketRepo.findByReference(reference).orElseThrow(() -> new NoSuchElementException("Ticket not found"));
        }
        if (username == null || username.isBlank()) {
            throw new NoSuchElementException("Ticket not found");
        }
        return ticketRepo.findByReferenceAndSubmittedByOrReferenceAndAssignedTo(reference, username, reference, username)
                .orElseThrow(() -> new NoSuchElementException("Ticket not found"));
    }

    @Override
    @Transactional
    public Ticket addTicket(Ticket ticket) {
        ticket.setStatus(TicketStatus.NEW);
        ticket.setReference(generateReference(ticket.getCategory()));
        Ticket saved = ticketRepo.save(ticket);
        iChannelService.createChannelForTicket(saved);
        return saved;
    }

    private String generateReference(TicketCategory category) {
        String prefix = switch (category) {
            case INCIDENT        -> "INC";
            case BUG             -> "BUG";
            case SERVICE_REQUEST -> "SR";
            case CHANGE_REQUEST  -> "CHG";
        };
        long count = ticketRepo.countByReferenceStartingWith(prefix);
        return String.format("%s-%03d", prefix, count + 1);
    }

    @Override
    public Ticket updateTicket(Ticket ticket) {
        return ticketRepo.save(ticket);
    }

    @Override
    public Ticket updateTicket(Ticket ticket, String username) {
        if (ticket.getId() == null) {
            throw new NoSuchElementException("Ticket not found");
        }
        Ticket existing = ticketRepo.findById(ticket.getId())
                .orElseThrow(() -> new NoSuchElementException("Ticket not found"));

        if (username == null || username.isBlank() || !username.equalsIgnoreCase(existing.getSubmittedBy())) {
            throw new ResponseStatusException(FORBIDDEN, "Only ticket creator can update this ticket");
        }

        ticket.setSubmittedBy(existing.getSubmittedBy());
        return ticketRepo.save(ticket);
    }

    @Override
    @Transactional
    public void removeTicket(Long ticketId) {
        channelRepo.findByTicketId(ticketId).ifPresent(channelRepo::delete);
        ticketRepo.deleteById(ticketId);
    }

    @Override
    @Transactional
    public void removeTicket(Long ticketId, String username) {
        Ticket existing = ticketRepo.findById(ticketId)
                .orElseThrow(() -> new NoSuchElementException("Ticket not found"));

        if (username == null || username.isBlank() || !username.equalsIgnoreCase(existing.getSubmittedBy())) {
            throw new ResponseStatusException(FORBIDDEN, "Only ticket creator can delete this ticket");
        }

        channelRepo.findByTicketId(ticketId).ifPresent(channelRepo::delete);
        ticketRepo.deleteById(ticketId);
    }

    @Override
    public List<Ticket> retrieveTicketsByStatus(TicketStatus status) {
        return ticketRepo.findByStatus(status);
    }

    @Override
    public List<Ticket> retrieveVisibleTicketsByStatus(TicketStatus status, String username, boolean canViewAll) {
        if (canViewAll) {
            return ticketRepo.findByStatus(status);
        }
        if (username == null || username.isBlank()) {
            return Collections.emptyList();
        }
        return ticketRepo.findByStatusAndSubmittedByOrStatusAndAssignedTo(status, username, status, username);
    }

    @Override
    public List<Ticket> retrieveTicketsByPriority(TicketPriority priority) {
        return ticketRepo.findByPriority(priority);
    }

    @Override
    public List<Ticket> retrieveVisibleTicketsByPriority(TicketPriority priority, String username, boolean canViewAll) {
        if (canViewAll) {
            return ticketRepo.findByPriority(priority);
        }
        if (username == null || username.isBlank()) {
            return Collections.emptyList();
        }
        return ticketRepo.findByPriorityAndSubmittedByOrPriorityAndAssignedTo(priority, username, priority, username);
    }

    @Override
    public List<Ticket> retrieveTicketsByCategory(TicketCategory category) {
        return ticketRepo.findByCategory(category);
    }

    @Override
    public List<Ticket> retrieveVisibleTicketsByCategory(TicketCategory category, String username, boolean canViewAll) {
        if (canViewAll) {
            return ticketRepo.findByCategory(category);
        }
        if (username == null || username.isBlank()) {
            return Collections.emptyList();
        }
        return ticketRepo.findByCategoryAndSubmittedByOrCategoryAndAssignedTo(category, username, category, username);
    }

    @Override
    public List<Ticket> retrieveTicketsByAssignedTo(String assignedTo) {
        return ticketRepo.findByAssignedTo(assignedTo);
    }

    @Override
    public List<Ticket> retrieveVisibleTicketsByAssignedTo(String assignedTo, String username, boolean canViewAll) {
        if (canViewAll) {
            return ticketRepo.findByAssignedTo(assignedTo);
        }
        if (username == null || username.isBlank()) {
            return Collections.emptyList();
        }
        if (!username.equalsIgnoreCase(assignedTo)) {
            return Collections.emptyList();
        }
        return ticketRepo.findByAssignedTo(assignedTo);
    }

    @Override
    @Transactional
    public Ticket updateTicketStatus(Long ticketId, TicketStatus status) {
        Ticket ticket = ticketRepo.findById(ticketId).get();
        if (ticket.getStatus() == TicketStatus.CLOSED) {
            throw new IllegalStateException("Cannot change the status of a closed ticket.");
        }
        ticket.setStatus(status);
        if (status == TicketStatus.RESOLVED) {
            ticket.setResolvedAt(LocalDateTime.now());
        }
        Ticket saved = ticketRepo.save(ticket);
        if (status == TicketStatus.RESOLVED) {
            try {
                ticketSummaryService.generateSummary(saved.getId());
            } catch (Exception ignored) {
                // Summary generation is non-blocking
            }
        }
        if (status == TicketStatus.CLOSED) {
            iChannelService.archiveChannelForTicket(ticketId);
        }
        return saved;
    }

    @Override
    @Transactional
    public Ticket updateTicketStatus(Long ticketId, TicketStatus status, String username) {
        Ticket ticket = ticketRepo.findById(ticketId)
                .orElseThrow(() -> new NoSuchElementException("Ticket not found"));

        if (username == null || username.isBlank() || !username.equalsIgnoreCase(ticket.getSubmittedBy())) {
            throw new ResponseStatusException(FORBIDDEN, "Only ticket creator can update ticket status");
        }

        if (ticket.getStatus() == TicketStatus.CLOSED) {
            throw new IllegalStateException("Cannot change the status of a closed ticket.");
        }

        ticket.setStatus(status);
        if (status == TicketStatus.RESOLVED) {
            ticket.setResolvedAt(LocalDateTime.now());
        }
        Ticket saved = ticketRepo.save(ticket);
        if (status == TicketStatus.RESOLVED) {
            try {
                ticketSummaryService.generateSummary(saved.getId());
            } catch (Exception ignored) {
                // Summary generation is non-blocking
            }
        }
        if (status == TicketStatus.CLOSED) {
            iChannelService.archiveChannelForTicket(ticketId);
        }
        return saved;
    }
}
