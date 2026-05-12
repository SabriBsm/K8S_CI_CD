package org.example.plansync.Services;

import org.example.plansync.Entities.TicketSummary;

public interface ITicketSummaryService {
    TicketSummary generateSummary(Long ticketId);
    TicketSummary getSummaryByTicket(Long ticketId);
}
