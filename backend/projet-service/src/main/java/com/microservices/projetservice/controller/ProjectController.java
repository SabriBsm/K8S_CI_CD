package com.microservices.projetservice.controller;



import com.microservices.projetservice.dto.request.ProjectRequestDTO;
import com.microservices.projetservice.dto.request.MilestoneRequestDTO;
import com.microservices.projetservice.dto.response.ProjectDashboardStatsDTO;
import com.microservices.projetservice.dto.response.MilestoneResponseDTO;
import com.microservices.projetservice.dto.response.ProjectResponseDTO;
import com.microservices.projetservice.enums.ProjectStatus;
import com.microservices.projetservice.feign.UserDTO;
import com.microservices.projetservice.feign.UserServiceClient;
import com.microservices.projetservice.service.interfaces.MilestoneService;
import com.microservices.projetservice.service.interfaces.ProjectService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.responses.ApiResponses;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import java.util.List;

@RestController
@RequestMapping("/api/projects")
@RequiredArgsConstructor
public class ProjectController {

    private final ProjectService projectService;
    private final MilestoneService milestoneService;
    private final UserServiceClient userServiceClient;

    @GetMapping
    @Operation(summary = "Get all projects")
    public ResponseEntity<List<ProjectResponseDTO>> getAllProjects(
            @RequestHeader(value = "X-User-Id", required = false) String userId) {
        return ResponseEntity.ok(projectService.getProjectsByUser(userId));
    }

    @GetMapping("/{id}")
    @Operation(summary = "Get a project by ID")
    public ResponseEntity<ProjectResponseDTO> getProjectById(
            @PathVariable Long id,
            @RequestHeader(value = "X-User-Id", required = false) String userId) {
        return ResponseEntity.ok(projectService.getProjectById(id, userId));
    }

    @GetMapping(value = "/{id}/summary", produces = MediaType.TEXT_PLAIN_VALUE)
    @Operation(summary = "Generate an AI summary of project tabs")
    public ResponseEntity<String> getProjectSummary(
            @PathVariable Long id,
            @RequestHeader(value = "X-User-Id", required = false) String userId) {
        return ResponseEntity.ok(projectService.getProjectSummary(id, userId));
    }

    @PostMapping
    @Operation(summary = "Create a new project")
    @ApiResponses(value = {
            @ApiResponse(responseCode = "201", description = "Project created successfully"),
            @ApiResponse(responseCode = "400", description = "Invalid data")
    })
    public ResponseEntity<ProjectResponseDTO> createProject(
            @Valid @RequestBody ProjectRequestDTO request,
            @RequestHeader(value = "X-User-Id", defaultValue = "system") String userId) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(projectService.createProject(request, userId));
    }

    @PutMapping("/{id}")
    public ResponseEntity<ProjectResponseDTO> updateProject(
            @PathVariable Long id,
            @Valid @RequestBody ProjectRequestDTO request,
            @RequestHeader(value = "X-User-Id", defaultValue = "system") String userId) {
        return ResponseEntity.ok(projectService.updateProject(id, request, userId));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteProject(
            @PathVariable Long id,
            @RequestHeader(value = "X-User-Id", defaultValue = "system") String userId) {
        projectService.deleteProject(id, userId);
        return ResponseEntity.noContent().build();
    }

    @PostMapping("/{projectId}/milestones")
    @Operation(summary = "Add a milestone to a project")
    @ApiResponses(value = {
            @ApiResponse(responseCode = "201", description = "Milestone created successfully"),
            @ApiResponse(responseCode = "400", description = "Invalid data")
    })
    public ResponseEntity<MilestoneResponseDTO> addMilestoneToProject(
            @PathVariable Long projectId,
            @Valid @RequestBody MilestoneRequestDTO request,
            @RequestHeader(value = "X-User-Id", defaultValue = "system") String userId) {
        request.setProjectId(projectId);
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(milestoneService.createMilestone(request, userId));
    }

    @GetMapping("/status/{status}")
    public ResponseEntity<List<ProjectResponseDTO>> getProjectsByStatus(@PathVariable ProjectStatus status) {
        return ResponseEntity.ok(projectService.getProjectsByStatus(status));
    }

    @GetMapping("/user/{userId}")
    public ResponseEntity<List<ProjectResponseDTO>> getProjectsByUser(@PathVariable String userId) {
        return ResponseEntity.ok(projectService.getProjectsByUser(userId));
    }

    @GetMapping("/delayed")
    public ResponseEntity<List<ProjectResponseDTO>> getDelayedProjects() {
        return ResponseEntity.ok(projectService.getDelayedProjects());
    }

    @GetMapping("/stats/average-progress")
    public ResponseEntity<Double> getAverageProgress() {
        return ResponseEntity.ok(projectService.getAverageProgress());
    }

    @GetMapping("/dashboard")
    @Operation(summary = "Get project dashboard statistics")
    public ResponseEntity<ProjectDashboardStatsDTO> getDashboardStats(
            @RequestHeader(value = "X-User-Id", required = false) String headerUserId,
            @RequestParam(required = false) String userId,
            @RequestParam(required = false, defaultValue = "30D") String period) {
        String resolvedUserId = (userId != null && !userId.isBlank()) ? userId : headerUserId;
        return ResponseEntity.ok(projectService.getDashboardStats(resolvedUserId, period));
    }

    @GetMapping("/my-projects")
    @Operation(summary = "Get my managed projects (as project manager)")
    public ResponseEntity<List<ProjectResponseDTO>> getMyManagedProjects(
            @RequestHeader(value = "X-User-Id", defaultValue = "system") String userId) {
        return ResponseEntity.ok(projectService.getProjectsWhereUserIsManager(userId));
    }

    @GetMapping("/search")
    @Operation(summary = "Search projects by name with status filter")
    public ResponseEntity<List<ProjectResponseDTO>> searchProjects(
            @RequestParam(required = false) String name,
            @RequestParam(required = false) ProjectStatus status,
            @RequestParam(required = false) String userId,
            @RequestHeader(value = "X-User-Id", defaultValue = "system") String headerUserId) {
        String resolvedUserId = (userId != null && !userId.isBlank()) ? userId : headerUserId;
        return ResponseEntity.ok(projectService.searchProjectsByUser(name, status, resolvedUserId));
    }

    @GetMapping("/search/advanced")
    @Operation(summary = "Advanced project search with multiple filters")
    public ResponseEntity<List<ProjectResponseDTO>> advancedSearch(
            @RequestParam(required = false) String name,
            @RequestParam(required = false) ProjectStatus status,
            @RequestParam(required = false) String description,
            @RequestParam(required = false) String customer,
            @RequestParam(required = false) Double minProgress,
            @RequestParam(required = false) Double maxProgress,
            @RequestParam(required = false) String startDateFrom,
            @RequestParam(required = false) String startDateTo,
            @RequestParam(required = false) String createdBy,
            @RequestParam(defaultValue = "false") boolean delayedOnly,
            @RequestParam(defaultValue = "CREATED_DATE") String sortBy,
            @RequestParam(defaultValue = "DESC") String sortDirection,
            @RequestParam(required = false) String userId,
            @RequestHeader(value = "X-User-Id", defaultValue = "system") String headerUserId) {
        String resolvedUserId = (userId != null && !userId.isBlank()) ? userId : headerUserId;
        return ResponseEntity.ok(projectService.advancedSearchProjects(
                name, status, description, customer, minProgress, maxProgress,
                startDateFrom, startDateTo, createdBy, delayedOnly, sortBy, sortDirection, resolvedUserId));
    }

    @GetMapping("/customers")
    @Operation(summary = "Get all customers (users with CUSTOMER role)")
    @ApiResponse(responseCode = "200", description = "List of customers retrieved successfully")
    public ResponseEntity<List<UserDTO>> getCustomers() {
        try {
            return ResponseEntity.ok(userServiceClient.getActiveUsersByRole("CUSTOMER"));
        } catch (Exception e) {
            // Fallback if user service is not available
            return ResponseEntity.ok(List.of());
        }
    }

    @GetMapping("/customers/search")
    @Operation(summary = "Search customers by username")
    @ApiResponse(responseCode = "200", description = "Customers matching the search criteria")
    public ResponseEntity<List<UserDTO>> searchCustomers(
            @RequestParam String username) {
        try {
            String query = username == null ? "" : username.trim().toLowerCase();
            return ResponseEntity.ok(userServiceClient.getActiveUsersByRole("CUSTOMER").stream()
                    .filter(user -> query.isEmpty()
                            || matchesQuery(user.getUsername(), query)
                            || matchesQuery(user.getEmail(), query)
                            || matchesQuery(user.getFirstName(), query)
                            || matchesQuery(user.getLastName(), query))
                    .toList());
        } catch (Exception e) {
            // Fallback if user service is not available
            return ResponseEntity.ok(List.of());
        }
    }

    private boolean matchesQuery(String value, String query) {
        return value != null && value.toLowerCase().contains(query);
    }
}
