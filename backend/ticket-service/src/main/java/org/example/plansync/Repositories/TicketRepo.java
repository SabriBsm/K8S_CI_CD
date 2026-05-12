package org.example.plansync.Repositories;

import org.example.plansync.Entities.Ticket;
import org.example.plansync.Entities.TicketCategory;
import org.example.plansync.Entities.TicketPriority;
import org.example.plansync.Entities.TicketStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface TicketRepo extends JpaRepository<Ticket, Long> {

    Optional<Ticket> findByReference(String reference);

    List<Ticket> findByStatus(TicketStatus status);

    List<Ticket> findByPriority(TicketPriority priority);

    List<Ticket> findByCategory(TicketCategory category);

    List<Ticket> findByAssignedTo(String assignedTo);

    List<Ticket> findBySubmittedBy(String submittedBy);

    List<Ticket> findBySubmittedByOrAssignedTo(String submittedBy, String assignedTo);

    List<Ticket> findByStatusAndSubmittedByOrStatusAndAssignedTo(TicketStatus status, String submittedBy, TicketStatus status2, String assignedTo);

    List<Ticket> findByPriorityAndSubmittedByOrPriorityAndAssignedTo(TicketPriority priority, String submittedBy, TicketPriority priority2, String assignedTo);

    List<Ticket> findByCategoryAndSubmittedByOrCategoryAndAssignedTo(TicketCategory category, String submittedBy, TicketCategory category2, String assignedTo);

    Optional<Ticket> findByIdAndSubmittedByOrIdAndAssignedTo(Long id, String submittedBy, Long id2, String assignedTo);

    Optional<Ticket> findByReferenceAndSubmittedByOrReferenceAndAssignedTo(String reference, String submittedBy, String reference2, String assignedTo);

    long countByReferenceStartingWith(String prefix);
}
