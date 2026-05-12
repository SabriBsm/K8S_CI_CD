package org.example.plansync.RestController;

import lombok.RequiredArgsConstructor;
import org.example.plansync.Entities.TicketSummary;
import org.example.plansync.Services.ITicketSummaryService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/ticket")
@RequiredArgsConstructor
public class TicketSummaryController {

    private final ITicketSummaryService summaryService;

    @PostMapping("/{id}/summary/generate")
    public ResponseEntity<TicketSummary> generateSummary(@PathVariable Long id) {
        return ResponseEntity.ok(summaryService.generateSummary(id));
    }

    @GetMapping("/{id}/summary")
    public ResponseEntity<TicketSummary> getSummary(@PathVariable Long id) {
        return ResponseEntity.ok(summaryService.getSummaryByTicket(id));
    }
}
