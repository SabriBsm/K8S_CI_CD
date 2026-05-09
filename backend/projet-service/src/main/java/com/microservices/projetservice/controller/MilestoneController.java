package com.microservices.projetservice.controller;

import com.microservices.projetservice.dto.request.MilestoneRequestDTO;
import com.microservices.projetservice.dto.response.MilestoneResponseDTO;
import com.microservices.projetservice.enums.MilestoneStatus;
import com.microservices.projetservice.service.interfaces.MilestoneService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.responses.ApiResponses;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import java.time.LocalDate;
import java.util.List;

@RestController
@RequestMapping("/api/milestones")
@RequiredArgsConstructor
public class MilestoneController {

    private final MilestoneService milestoneService;

    @GetMapping
    @Operation(summary = "Récupérer tous les milestones")
    public ResponseEntity<List<MilestoneResponseDTO>> getAllMilestones(
            @RequestHeader(value = "X-User-Id") String userId) {
        return ResponseEntity.ok(milestoneService.getAllMilestones(userId));
    }

    @GetMapping("/{id}")
    @Operation(summary = "Récupérer un milestone par son ID")
    public ResponseEntity<MilestoneResponseDTO> getMilestoneById(@PathVariable Long id,
                                                                 @RequestHeader(value = "X-User-Id") String userId) {
        return ResponseEntity.ok(milestoneService.getMilestoneById(id, userId));
    }

    @PostMapping
    @Operation(summary = "Créer un nouveau milestone")
    @ApiResponses(value = {
            @ApiResponse(responseCode = "201", description = "Milestone créé avec succès"),
            @ApiResponse(responseCode = "400", description = "Données invalides")
    })
    public ResponseEntity<MilestoneResponseDTO> createMilestone(
            @Valid @RequestBody MilestoneRequestDTO request,
            @RequestHeader(value = "X-User-Id") String userId) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(milestoneService.createMilestone(request, userId));
    }

    @PutMapping("/{id}")
    public ResponseEntity<MilestoneResponseDTO> updateMilestone(
            @PathVariable Long id,
            @Valid @RequestBody MilestoneRequestDTO request,
            @RequestHeader(value = "X-User-Id") String userId) {
        return ResponseEntity.ok(milestoneService.updateMilestone(id, request, userId));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteMilestone(@PathVariable Long id,
                                                @RequestHeader(value = "X-User-Id") String userId) {
        milestoneService.deleteMilestone(id, userId);
        return ResponseEntity.noContent().build();
    }

    @GetMapping("/project/{projectId}")
    public ResponseEntity<List<MilestoneResponseDTO>> getMilestonesByProjectId(@PathVariable Long projectId,
                                                                                @RequestHeader(value = "X-User-Id") String userId) {
        return ResponseEntity.ok(milestoneService.getMilestonesByProjectId(projectId, userId));
    }

    @GetMapping("/status/{status}")
    public ResponseEntity<List<MilestoneResponseDTO>> getMilestonesByStatus(@PathVariable MilestoneStatus status,
                                                                            @RequestHeader(value = "X-User-Id") String userId) {
        return ResponseEntity.ok(milestoneService.getMilestonesByStatus(status, userId));
    }

    @GetMapping("/critical")
    public ResponseEntity<List<MilestoneResponseDTO>> getCriticalMilestones(
            @RequestHeader(value = "X-User-Id") String userId) {
        return ResponseEntity.ok(milestoneService.getCriticalMilestones(userId));
    }

    @GetMapping("/project/{projectId}/status/{status}")
    public ResponseEntity<List<MilestoneResponseDTO>> getMilestonesByProjectIdAndStatus(
            @PathVariable Long projectId, @PathVariable MilestoneStatus status,
            @RequestHeader(value = "X-User-Id") String userId) {
        return ResponseEntity.ok(milestoneService.getMilestonesByProjectIdAndStatus(projectId, status, userId));
    }

    @GetMapping("/overdue")
    public ResponseEntity<List<MilestoneResponseDTO>> getOverdueMilestones(
            @RequestHeader(value = "X-User-Id") String userId) {
        return ResponseEntity.ok(milestoneService.getOverdueMilestones(userId));
    }

    @GetMapping("/upcoming/{days}")
    public ResponseEntity<List<MilestoneResponseDTO>> getUpcomingMilestones(@PathVariable int days,
                                                                            @RequestHeader(value = "X-User-Id") String userId) {
        LocalDate withinDays = LocalDate.now().plusDays(days);
        return ResponseEntity.ok(milestoneService.getUpcomingMilestones(withinDays, userId));
    }

    @GetMapping("/due-between")
    public ResponseEntity<List<MilestoneResponseDTO>> getMilestonesDueBetween(
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate startDate,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate endDate,
            @RequestHeader(value = "X-User-Id") String userId) {
        return ResponseEntity.ok(milestoneService.getMilestonesDueBetween(startDate, endDate, userId));
    }

    @PutMapping("/{id}/achieved")
    public ResponseEntity<MilestoneResponseDTO> markAsAchieved(
            @PathVariable Long id,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate actualCompletionDate,
            @RequestHeader(value = "X-User-Id") String userId) {
        return ResponseEntity.ok(milestoneService.markAsAchieved(id, actualCompletionDate, userId));
    }

    @PutMapping("/{id}/status/{status}")
    public ResponseEntity<MilestoneResponseDTO> updateStatus(
            @PathVariable Long id, @PathVariable MilestoneStatus status,
            @RequestHeader(value = "X-User-Id") String userId) {
        return ResponseEntity.ok(milestoneService.updateStatus(id, status, userId));
    }

    @PostMapping("/update-overdue")
    public ResponseEntity<Void> updateOverdueMilestones(@RequestHeader(value = "X-User-Id") String userId) {
        milestoneService.updateOverdueMilestones(userId);
        return ResponseEntity.ok().build();
    }
}
