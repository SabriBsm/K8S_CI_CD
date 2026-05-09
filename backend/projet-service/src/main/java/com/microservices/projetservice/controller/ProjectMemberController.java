package com.microservices.projetservice.controller;

import com.microservices.projetservice.dto.request.ProjectMemberRequestDTO;
import com.microservices.projetservice.dto.response.ProjectMemberResponseDTO;
import com.microservices.projetservice.service.interfaces.ProjectMemberService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.responses.ApiResponses;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/projects/members")
@RequiredArgsConstructor
@Slf4j
public class ProjectMemberController {

    private final ProjectMemberService projectMemberService;

    @PostMapping
    @Operation(summary = "Add a member to a project (role inferred from user profile)")
    @ApiResponses(value = {
            @ApiResponse(responseCode = "201", description = "Member added successfully"),
            @ApiResponse(responseCode = "400", description = "Invalid data"),
            @ApiResponse(responseCode = "401", description = "Not authorized"),
            @ApiResponse(responseCode = "404", description = "Project not found")
    })
    public ResponseEntity<?> addMember(
            @Valid @RequestBody ProjectMemberRequestDTO request,
            @RequestHeader(value = "X-User-Id", defaultValue = "system") String userId) {
        try {
            log.info("Adding member {} to project {}", request.getUserEmail(), request.getProjectId());
            ProjectMemberResponseDTO response = projectMemberService.addMember(request, userId);
            return ResponseEntity.status(HttpStatus.CREATED).body(response);
        } catch (IllegalArgumentException e) {
            log.warn("Invalid argument when adding member: {}", e.getMessage());
            Map<String, String> error = new HashMap<>();
            error.put("error", e.getMessage());
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(error);
        } catch (Exception e) {
            log.error("Error adding member: {}", e.getMessage(), e);
            Map<String, String> error = new HashMap<>();
            error.put("error", e.getMessage() != null ? e.getMessage() : "Failed to add member");
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(error);
        }
    }

    @DeleteMapping
    @Operation(summary = "Remove a member from a project (Project Manager only)")
    @ApiResponses(value = {
            @ApiResponse(responseCode = "204", description = "Member removed successfully"),
            @ApiResponse(responseCode = "401", description = "Not authorized"),
            @ApiResponse(responseCode = "404", description = "Member not found")
    })
    public ResponseEntity<?> removeMember(
            @RequestParam Long projectId,
            @RequestParam String userId,
            @RequestHeader(value = "X-User-Id", defaultValue = "system") String managerId) {
        try {
            log.info("Removing member {} from project {}", userId, projectId);
            projectMemberService.removeMember(projectId, userId, managerId);
            return ResponseEntity.noContent().build();
        } catch (IllegalArgumentException e) {
            log.warn("Invalid argument when removing member: {}", e.getMessage());
            Map<String, String> error = new HashMap<>();
            error.put("error", e.getMessage());
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(error);
        } catch (Exception e) {
            log.error("Error removing member: {}", e.getMessage(), e);
            Map<String, String> error = new HashMap<>();
            error.put("error", e.getMessage() != null ? e.getMessage() : "Failed to remove member");
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(error);
        }
    }

    @GetMapping("/project/{projectId}")
    @Operation(summary = "Get all members of a project")
    public ResponseEntity<List<ProjectMemberResponseDTO>> getProjectMembers(
            @PathVariable Long projectId) {
        return ResponseEntity.ok(projectMemberService.getProjectMembers(projectId));
    }

    @GetMapping("/user/{userId}")
    @Operation(summary = "Get all projects of a user")
    public ResponseEntity<List<ProjectMemberResponseDTO>> getUserProjects(
            @PathVariable String userId) {
        return ResponseEntity.ok(projectMemberService.getUserProjects(userId));
    }

    @GetMapping("/check")
    @Operation(summary = "Check if a user is a member of a project")
    public ResponseEntity<Boolean> isMember(
            @RequestParam Long projectId,
            @RequestParam String userId) {
        return ResponseEntity.ok(projectMemberService.isMember(projectId, userId));
    }

    @PutMapping("/project-manager/{projectId}/{userId}")
    @Operation(summary = "Assign a project manager to a project")
    public ResponseEntity<Void> assignProjectManager(
            @PathVariable Long projectId,
            @PathVariable String userId) {
        projectMemberService.assignProjectManager(projectId, userId);
        return ResponseEntity.ok().build();
    }

    @PutMapping("/role")
    @Operation(summary = "Update a member's role")
    public ResponseEntity<ProjectMemberResponseDTO> updateMemberRole(
            @RequestParam Long projectId,
            @RequestParam String userId,
            @RequestParam String newRole) {
        return ResponseEntity.ok(
                projectMemberService.updateMemberRole(projectId, userId, newRole));
    }

    @GetMapping("/manager/{userId}")
    @Operation(summary = "Get projects managed by a user")
    public ResponseEntity<List<ProjectMemberResponseDTO>> getManagedProjects(
            @PathVariable String userId) {
        return ResponseEntity.ok(projectMemberService.getManagedProjects(userId));
    }
}

