package org.example.plansync.Repositories;

import org.example.plansync.Entities.TicketSummary;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface TicketSummaryRepo extends JpaRepository<TicketSummary, Long> {
    Optional<TicketSummary> findByTicketId(Long ticketId);
    boolean existsByTicketId(Long ticketId);
}
