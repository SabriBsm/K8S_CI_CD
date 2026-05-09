package com.microservices.projetservice.controller;

import com.microservices.projetservice.dto.request.ProjectNotificationRequestDTO;
import com.microservices.projetservice.dto.response.ProjectNotificationResponseDTO;
import com.microservices.projetservice.enums.NotificationType;
import com.microservices.projetservice.service.interfaces.ProjectNotificationService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.responses.ApiResponses;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import java.util.Map;
import java.util.List;

@RestController
@RequestMapping("/api/project-notifications")
@RequiredArgsConstructor
public class ProjectNotificationController {

    private final ProjectNotificationService projectNotificationService;

    @GetMapping
    @Operation(summary = "Récupérer toutes les notifications de projet")
    public ResponseEntity<List<ProjectNotificationResponseDTO>> getAllProjectNotifications(
            @RequestHeader(value = "X-User-Id") String userId) {
        return ResponseEntity.ok(projectNotificationService.getAllProjectNotifications(userId));
    }

    @GetMapping("/{id}")
    @Operation(summary = "Récupérer une notification de projet par son ID")
    public ResponseEntity<ProjectNotificationResponseDTO> getProjectNotificationById(@PathVariable Long id,
                                                                                    @RequestHeader(value = "X-User-Id") String userId) {
        return ResponseEntity.ok(projectNotificationService.getProjectNotificationById(id, userId));
    }

    @PostMapping
    @Operation(summary = "Créer une nouvelle notification de projet")
    @ApiResponses(value = {
            @ApiResponse(responseCode = "201", description = "Notification créée avec succès"),
            @ApiResponse(responseCode = "400", description = "Données invalides")
    })
    public ResponseEntity<ProjectNotificationResponseDTO> createProjectNotification(
            @Valid @RequestBody ProjectNotificationRequestDTO request,
            @RequestHeader(value = "X-User-Id") String userId) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(projectNotificationService.createProjectNotification(request, userId));
    }

    @PutMapping("/{id}")
    public ResponseEntity<ProjectNotificationResponseDTO> updateProjectNotification(
            @PathVariable Long id,
            @Valid @RequestBody ProjectNotificationRequestDTO request,
            @RequestHeader(value = "X-User-Id") String userId) {
        return ResponseEntity.ok(projectNotificationService.updateProjectNotification(id, request, userId));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteProjectNotification(@PathVariable Long id,
                                                          @RequestHeader(value = "X-User-Id") String userId) {
        projectNotificationService.deleteProjectNotification(id, userId);
        return ResponseEntity.noContent().build();
    }

    @GetMapping("/project/{projectId}")
    public ResponseEntity<List<ProjectNotificationResponseDTO>> getProjectNotificationsByProjectId(@PathVariable Long projectId,
                                                                                                   @RequestHeader(value = "X-User-Id") String userId) {
        return ResponseEntity.ok(projectNotificationService.getProjectNotificationsByProjectId(projectId, userId));
    }

    @GetMapping("/user/{userId}")
    public ResponseEntity<List<ProjectNotificationResponseDTO>> getProjectNotificationsByUserId(@PathVariable Long userId,
                                                                                                @RequestHeader(value = "X-User-Id") String callerUserId) {
        return ResponseEntity.ok(projectNotificationService.getProjectNotificationsByUserId(userId, callerUserId));
    }

    @GetMapping("/type/{type}")
    public ResponseEntity<List<ProjectNotificationResponseDTO>> getProjectNotificationsByType(@PathVariable NotificationType type,
                                                                                              @RequestHeader(value = "X-User-Id") String userId) {
        return ResponseEntity.ok(projectNotificationService.getProjectNotificationsByType(type, userId));
    }

    @GetMapping("/read-status/{isRead}")
    public ResponseEntity<List<ProjectNotificationResponseDTO>> getProjectNotificationsByIsRead(@PathVariable Boolean isRead,
                                                                                                @RequestHeader(value = "X-User-Id") String userId) {
        return ResponseEntity.ok(projectNotificationService.getProjectNotificationsByIsRead(isRead, userId));
    }

    @GetMapping("/project/{projectId}/unread")
    public ResponseEntity<List<ProjectNotificationResponseDTO>> getUnreadNotificationsByProjectId(@PathVariable Long projectId,
                                                                                                   @RequestHeader(value = "X-User-Id") String userId) {
        return ResponseEntity.ok(projectNotificationService.getUnreadNotificationsByProjectId(projectId, userId));
    }

    @GetMapping("/user/{userId}/unread")
    public ResponseEntity<List<ProjectNotificationResponseDTO>> getUnreadNotificationsByUserId(@PathVariable Long userId,
                                                                                                @RequestHeader(value = "X-User-Id") String callerUserId) {
        return ResponseEntity.ok(projectNotificationService.getUnreadNotificationsByUserId(userId, callerUserId));
    }

    @PutMapping("/{id}/mark-read")
    public ResponseEntity<ProjectNotificationResponseDTO> markAsRead(@PathVariable Long id,
                                                                      @RequestHeader(value = "X-User-Id") String userId) {
        return ResponseEntity.ok(projectNotificationService.markAsRead(id, userId));
    }

    @PostMapping("/{id}/notify-email")
    public ResponseEntity<Map<String, String>> notifyByEmail(@PathVariable Long id,
                                                             @RequestHeader(value = "X-User-Id") String userId) {
        return ResponseEntity.ok(Map.of("message", projectNotificationService.sendNotificationByEmail(id, userId)));
    }

    @PutMapping("/user/{userId}/mark-all-read")
    public ResponseEntity<Void> markAllAsReadByUserId(@PathVariable Long userId,
                                                      @RequestHeader(value = "X-User-Id") String callerUserId) {
        projectNotificationService.markAllAsReadByUserId(userId, callerUserId);
        return ResponseEntity.ok().build();
    }

    @PutMapping("/project/{projectId}/mark-all-read")
    public ResponseEntity<Void> markAllAsReadByProjectId(@PathVariable Long projectId,
                                                         @RequestHeader(value = "X-User-Id") String userId) {
        projectNotificationService.markAllAsReadByProjectId(projectId, userId);
        return ResponseEntity.ok().build();
    }
}
