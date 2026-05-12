package org.example.plansync.Services;

import org.example.plansync.Entities.Ticket;
import org.example.plansync.Entities.TicketCategory;
import org.example.plansync.Entities.TicketPriority;
import org.example.plansync.Entities.TicketStatus;

import java.util.List;

public interface ITicketService {

    List<Ticket> retrieveAllTickets();
    List<Ticket> retrieveVisibleTickets(String username, boolean canViewAll);

    Ticket retrieveTicket(Long ticketId);
    Ticket retrieveVisibleTicket(Long ticketId, String username, boolean canViewAll);

    Ticket retrieveTicketByReference(String reference);
    Ticket retrieveVisibleTicketByReference(String reference, String username, boolean canViewAll);

    Ticket addTicket(Ticket ticket);

    Ticket updateTicket(Ticket ticket);
    Ticket updateTicket(Ticket ticket, String username);

    void removeTicket(Long ticketId);
    void removeTicket(Long ticketId, String username);

    List<Ticket> retrieveTicketsByStatus(TicketStatus status);
    List<Ticket> retrieveVisibleTicketsByStatus(TicketStatus status, String username, boolean canViewAll);

    List<Ticket> retrieveTicketsByPriority(TicketPriority priority);
    List<Ticket> retrieveVisibleTicketsByPriority(TicketPriority priority, String username, boolean canViewAll);

    List<Ticket> retrieveTicketsByCategory(TicketCategory category);
    List<Ticket> retrieveVisibleTicketsByCategory(TicketCategory category, String username, boolean canViewAll);

    List<Ticket> retrieveTicketsByAssignedTo(String assignedTo);
    List<Ticket> retrieveVisibleTicketsByAssignedTo(String assignedTo, String username, boolean canViewAll);

    Ticket updateTicketStatus(Long ticketId, TicketStatus status);
    Ticket updateTicketStatus(Long ticketId, TicketStatus status, String username);
}
