package org.example.plansync.Services;

import org.example.plansync.Entities.AiGenerateRequest;
import org.example.plansync.Entities.AiGenerateResponse;
import org.example.plansync.Entities.TicketSummary;
import org.example.plansync.Entities.Ticket;

import java.util.List;

public interface IAiService {
    AiGenerateResponse generateTicketResponse(AiGenerateRequest request);
    TicketSummary generateTicketSummary(Ticket ticket, List<String> responses, List<String> chatMessages);
}
