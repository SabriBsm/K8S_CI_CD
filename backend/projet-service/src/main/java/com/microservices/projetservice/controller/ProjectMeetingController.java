package com.microservices.projetservice.controller;

import com.microservices.projetservice.dto.request.ProjectMeetingRequestDTO;
import com.microservices.projetservice.dto.response.ProjectMeetingResponseDTO;
import com.microservices.projetservice.service.interfaces.ProjectMeetingService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.responses.ApiResponses;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import java.util.List;

@RestController
@RequestMapping("/api/project-meetings")
@RequiredArgsConstructor
public class ProjectMeetingController {

    private final ProjectMeetingService projectMeetingService;

    @GetMapping
    @Operation(summary = "Récupérer toutes les réunions de projet")
    public ResponseEntity<List<ProjectMeetingResponseDTO>> getAllProjectMeetings() {
        return ResponseEntity.ok(projectMeetingService.getAllProjectMeetings());
    }

    @GetMapping("/{id}")
    @Operation(summary = "Récupérer une réunion de projet par son ID")
    public ResponseEntity<ProjectMeetingResponseDTO> getProjectMeetingById(
            @PathVariable Long id,
            @RequestHeader(value = "X-User-Id", required = false) String userId) {
        return ResponseEntity.ok(projectMeetingService.getProjectMeetingById(id, userId));
    }

    @PostMapping
    @Operation(summary = "Créer une nouvelle réunion de projet")
    @ApiResponses(value = {
            @ApiResponse(responseCode = "201", description = "Réunion créée avec succès"),
            @ApiResponse(responseCode = "400", description = "Données invalides")
    })
    public ResponseEntity<ProjectMeetingResponseDTO> createProjectMeeting(
            @Valid @RequestBody ProjectMeetingRequestDTO request,
            @RequestHeader(value = "X-User-Id", required = false) String userId) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(projectMeetingService.createProjectMeeting(request, userId));
    }

    @PutMapping("/{id}")
    public ResponseEntity<ProjectMeetingResponseDTO> updateProjectMeeting(
            @PathVariable Long id,
            @Valid @RequestBody ProjectMeetingRequestDTO request,
            @RequestHeader(value = "X-User-Id", required = false) String userId) {
        return ResponseEntity.ok(projectMeetingService.updateProjectMeeting(id, request, userId));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteProjectMeeting(@PathVariable Long id,
                                                     @RequestHeader(value = "X-User-Id", required = false) String userId) {
        projectMeetingService.deleteProjectMeeting(id, userId);
        return ResponseEntity.noContent().build();
    }

    @GetMapping("/project/{projectId}")
    public ResponseEntity<List<ProjectMeetingResponseDTO>> getProjectMeetingsByProjectId(@PathVariable Long projectId,
                                                                                         @RequestHeader(value = "X-User-Id", required = false) String userId) {
        return ResponseEntity.ok(projectMeetingService.getProjectMeetingsByProjectId(projectId, userId));
    }

    @GetMapping("/project/{projectId}/upcoming")
    @Operation(summary = "Récupérer les réunions à venir d'un projet")
    public ResponseEntity<List<ProjectMeetingResponseDTO>> getUpcomingProjectMeetingsByProjectId(@PathVariable Long projectId,
                                                                                                  @RequestHeader(value = "X-User-Id", required = false) String userId) {
        return ResponseEntity.ok(projectMeetingService.getUpcomingProjectMeetingsByProjectId(projectId, userId));
    }

    @GetMapping("/project/{projectId}/past")
    @Operation(summary = "Récupérer les réunions passées d'un projet")
    public ResponseEntity<List<ProjectMeetingResponseDTO>> getPastProjectMeetingsByProjectId(@PathVariable Long projectId,
                                                                                             @RequestHeader(value = "X-User-Id", required = false) String userId) {
        return ResponseEntity.ok(projectMeetingService.getPastProjectMeetingsByProjectId(projectId, userId));
    }

    @GetMapping("/created-by/{createdBy}")
    public ResponseEntity<List<ProjectMeetingResponseDTO>> getProjectMeetingsByCreatedBy(@PathVariable String createdBy,
                                                                                         @RequestHeader(value = "X-User-Id", required = false) String userId) {
        return ResponseEntity.ok(projectMeetingService.getProjectMeetingsByCreatedBy(createdBy, userId));
    }
}
