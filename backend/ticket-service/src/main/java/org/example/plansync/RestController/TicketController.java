package org.example.plansync.RestController;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.example.plansync.Client.UserDTO;
import org.example.plansync.Client.UserServiceClient;
import org.example.plansync.Entities.Ticket;
import org.example.plansync.Entities.TicketCategory;
import org.example.plansync.Entities.TicketPriority;
import org.example.plansync.Entities.TicketStatus;
import org.example.plansync.Services.ITicketService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Collections;
import java.util.List;
import java.util.Locale;

@RestController
@RequiredArgsConstructor
@Tag(name = "Ticket Management")
@RequestMapping("/api/ticket")
public class TicketController {

    private final ITicketService iTicketService;
    private final UserServiceClient userServiceClient;

    @Operation(description = "Retrieve all tickets")
    @GetMapping("/getAll")
    public List<Ticket> getAll(
            @RequestHeader(value = "X-Username", required = false) String username,
            @RequestHeader(value = "X-Roles", required = false) String rolesHeader) {
        return iTicketService.retrieveVisibleTickets(username, canViewAllTickets(rolesHeader));
    }

    @Operation(description = "Retrieve a ticket by id")
    @GetMapping("/getTicket/{id}")
    public Ticket getTicket(
            @PathVariable Long id,
            @RequestHeader(value = "X-Username", required = false) String username,
            @RequestHeader(value = "X-Roles", required = false) String rolesHeader) {
        return iTicketService.retrieveVisibleTicket(id, username, canViewAllTickets(rolesHeader));
    }

    @Operation(description = "Retrieve a ticket by reference")
    @GetMapping("/getByReference/{reference}")
    public Ticket getByReference(
            @PathVariable String reference,
            @RequestHeader(value = "X-Username", required = false) String username,
            @RequestHeader(value = "X-Roles", required = false) String rolesHeader) {
        return iTicketService.retrieveVisibleTicketByReference(reference, username, canViewAllTickets(rolesHeader));
    }

    @Operation(description = "Add a new ticket. submittedBy est rempli automatiquement depuis l'en-tête X-Username")
    @PostMapping("/addTicket")
    public Ticket addTicket(
            @RequestBody Ticket ticket,
            @RequestHeader(value = "X-Username", required = false) String username) {
        if (username != null && !username.isBlank()) {
            ticket.setSubmittedBy(username);
        }
        return iTicketService.addTicket(ticket);
    }

    @Operation(description = "Update an existing ticket")
    @PutMapping("/updateTicket")
    public Ticket updateTicket(
            @RequestBody Ticket ticket,
            @RequestHeader(value = "X-Username", required = false) String username) {
        return iTicketService.updateTicket(ticket, username);
    }

    @Operation(description = "Delete a ticket by id")
    @DeleteMapping("/deleteTicket/{id}")
    public void deleteTicket(
            @PathVariable Long id,
            @RequestHeader(value = "X-Username", required = false) String username) {
        iTicketService.removeTicket(id, username);
    }

    @Operation(description = "Get tickets by status (NEW, IN_PROGRESS, ON_HOLD, RESOLVED, CLOSED)")
    @GetMapping("/getByStatus/{status}")
    public List<Ticket> getByStatus(
            @PathVariable TicketStatus status,
            @RequestHeader(value = "X-Username", required = false) String username,
            @RequestHeader(value = "X-Roles", required = false) String rolesHeader) {
        return iTicketService.retrieveVisibleTicketsByStatus(status, username, canViewAllTickets(rolesHeader));
    }

    @Operation(description = "Get tickets by priority (LOW, MEDIUM, HIGH, CRITICAL)")
    @GetMapping("/getByPriority/{priority}")
    public List<Ticket> getByPriority(
            @PathVariable TicketPriority priority,
            @RequestHeader(value = "X-Username", required = false) String username,
            @RequestHeader(value = "X-Roles", required = false) String rolesHeader) {
        return iTicketService.retrieveVisibleTicketsByPriority(priority, username, canViewAllTickets(rolesHeader));
    }

    @Operation(description = "Get tickets by category (INCIDENT, SERVICE_REQUEST, BUG, CHANGE_REQUEST)")
    @GetMapping("/getByCategory/{category}")
    public List<Ticket> getByCategory(
            @PathVariable TicketCategory category,
            @RequestHeader(value = "X-Username", required = false) String username,
            @RequestHeader(value = "X-Roles", required = false) String rolesHeader) {
        return iTicketService.retrieveVisibleTicketsByCategory(category, username, canViewAllTickets(rolesHeader));
    }

    @Operation(description = "Get tickets assigned to a specific user")
    @GetMapping("/getByAssignedTo/{assignedTo}")
    public List<Ticket> getByAssignedTo(
            @PathVariable String assignedTo,
            @RequestHeader(value = "X-Username", required = false) String username,
            @RequestHeader(value = "X-Roles", required = false) String rolesHeader) {
        return iTicketService.retrieveVisibleTicketsByAssignedTo(assignedTo, username, canViewAllTickets(rolesHeader));
    }

    @Operation(description = "Update only the status of a ticket")
    @PatchMapping("/updateStatus/{id}/{status}")
    public Ticket updateStatus(
            @PathVariable Long id,
            @PathVariable TicketStatus status,
            @RequestHeader(value = "X-Username", required = false) String username) {
        return iTicketService.updateTicketStatus(id, status, username);
    }

    @Operation(description = "Récupérer la liste de tous les utilisateurs (pour la liste déroulante assignedTo / submittedTo)")
    @GetMapping("/users")
    public ResponseEntity<List<UserDTO>> getUsers() {
        try {
            return ResponseEntity.ok(userServiceClient.getAllUsers());
        } catch (Exception e) {
            return ResponseEntity.ok(Collections.emptyList());
        }
    }

    private boolean canViewAllTickets(String rolesHeader) {
        if (rolesHeader == null || rolesHeader.isBlank()) {
            return false;
        }
        String roles = rolesHeader.toUpperCase(Locale.ROOT);
        return roles.contains("ADMIN") || roles.contains("PROJECT_MANAGER");
    }
}
