package com.microservices.projetservice.service.impl;


import com.microservices.projetservice.dto.request.MilestoneRequestDTO;
import com.microservices.projetservice.dto.ProjectDTO;
import com.microservices.projetservice.dto.request.ProjectRequestDTO;
import com.microservices.projetservice.dto.response.ProjectDashboardStatsDTO;
import com.microservices.projetservice.dto.response.ProjectMemberResponseDTO;
import com.microservices.projetservice.dto.response.ProjectResponseDTO;
import com.microservices.projetservice.entity.Project;
import com.microservices.projetservice.entity.ProjectDocument;
import com.microservices.projetservice.entity.ProjectMember;
import com.microservices.projetservice.entity.ProjectMeeting;
import com.microservices.projetservice.entity.ProjectNotification;
import com.microservices.projetservice.entity.Milestone;
import com.microservices.projetservice.enums.MilestoneStatus;
import com.microservices.projetservice.enums.NotificationType;
import com.microservices.projetservice.enums.ProjectStatus;
import com.microservices.projetservice.enums.ProjectDocumentType;
import com.microservices.projetservice.enums.ProjectVisibility;
import com.microservices.projetservice.exception.ProjectNotFoundException;
import com.microservices.projetservice.exception.ProjectValidationException;
import com.microservices.projetservice.exception.UnauthorizedException;
import com.microservices.projetservice.feign.UserDTO;
import com.microservices.projetservice.feign.FinanceProjectClient;
import com.microservices.projetservice.feign.UserServiceClient;
import com.microservices.projetservice.mapper.ProjectMapper;
import com.microservices.projetservice.repository.MilestoneRepository;
import com.microservices.projetservice.repository.ProjectDocumentRepository;
import com.microservices.projetservice.repository.ProjectRepository;
import com.microservices.projetservice.repository.ProjectMemberRepository;
import com.microservices.projetservice.repository.ProjectMeetingRepository;
import com.microservices.projetservice.repository.ProjectNotificationRepository;
import com.microservices.projetservice.service.interfaces.ProjectNotificationService;
import com.microservices.projetservice.service.interfaces.ProjectService;
import com.microservices.projetservice.validator.ProjectValidator;
import com.microservices.projetservice.validator.MilestoneValidator;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.context.event.ApplicationReadyEvent;
import org.springframework.context.event.EventListener;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.client.RestTemplate;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.LinkedHashMap;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.Set;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
@Transactional
public class ProjectServiceImpl implements ProjectService {

    private final ProjectRepository projectRepository;
    private final ProjectMemberRepository projectMemberRepository;
    private final MilestoneRepository milestoneRepository;
    private final ProjectMeetingRepository projectMeetingRepository;
    private final ProjectDocumentRepository projectDocumentRepository;
    private final ProjectNotificationRepository projectNotificationRepository;
    private final ProjectMapper projectMapper;
    private final ProjectValidator projectValidator;
    private final MilestoneValidator milestoneValidator;
    private final UserServiceClient userServiceClient;
    private final FinanceProjectClient financeProjectClient;
    private final ProjectNotificationService projectNotificationService;
    private final RestTemplate restTemplate = new RestTemplate();
    private final ObjectMapper objectMapper = new ObjectMapper();

    @Value("${openrouter.api.key:}")
    private String openRouterApiKey;

    @Value("${openrouter.url:https://openrouter.ai/api/v1/chat/completions}")
    private String openRouterUrl;

    // ============================================
    // CRUD
    // ============================================

    @EventListener(ApplicationReadyEvent.class)
    public void syncExistingProjectsToFinance() {
        List<Project> projects = projectRepository.findAll();
        if (projects.isEmpty()) {
            return;
        }

        log.info("Resyncing {} existing projects to finance-service", projects.size());
        projects.forEach(this::syncProjectToFinance);
    }

    @Override
    @Transactional(readOnly = true)
    public List<ProjectResponseDTO> getAllProjects() {
        log.info("Retrieving all projects");
        return projectRepository.findAll()
                .stream()
                .map(this::toResponseDTO)
                .toList();
    }

    @Override
    @Transactional(readOnly = true)
    public ProjectResponseDTO getProjectById(Long id, String userId) {
        log.info("Retrieving project with id: {} for user: {}", id, userId);
        Project project = projectRepository.findById(id)
                .orElseThrow(() -> new ProjectNotFoundException("Project not found with id: " + id));

        if (!hasProjectReadAccess(project, userId)) {
            throw new UnauthorizedException("You are not allowed to access this project");
        }

        return toResponseDTO(project);
    }

    @Override
    public ProjectResponseDTO createProject(ProjectRequestDTO request, String createdBy) {
        log.info("Creating new project by: {}", createdBy);
        if (!(isAdminUser(createdBy) || isProjectManagerRoleUser(createdBy))) {
            throw new UnauthorizedException("Only project managers can create projects");
        }

        // Validate business rules
        projectValidator.validateForCreate(request);

        String customerUserId = resolveOptionalCustomerUserId(request.getCustomerId());

        // Convert and set default values
        Project project = projectMapper.toEntity(request);
        String creatorId = resolveRequiredUserId(createdBy);
        project.setCreatedBy(creatorId);
        project.setProjectManagerId(creatorId); // The creator becomes the project manager
        project.setProgress(request.getProgress() != null ? request.getProgress() : 0.0);
        project.setCustomerId(customerUserId);

        // Set additional business logic
        if (project.getStatus() == null) {
            project.setStatus(ProjectStatus.PLANNED);
        }

        // Save
        Project savedProject = projectRepository.save(project);
        persistNewMilestones(savedProject, request.getMilestones(), creatorId);
        savedProject = refreshProjectProgress(savedProject);

        // Automatically add the project manager as a member with PROJECT_MANAGER role
        ProjectMember managerMember = ProjectMember.builder()
                .project(savedProject)
                .userId(creatorId)
                .role("PROJECT_MANAGER")
                .joinedDate(LocalDateTime.now())
                .isActive(true)
                .build();
        
        projectMemberRepository.save(managerMember);
        log.info("Project manager {} added as member to project {}", createdBy, savedProject.getId());


        // If a customer is provided, keep it only as the project customer
        if (customerUserId != null) {
            savedProject.setCustomerId(customerUserId);
            projectRepository.save(savedProject);
            log.info("Customer {} successfully associated to project {}", customerUserId, savedProject.getId());
        }

        syncProjectToFinance(savedProject);

        return toResponseDTO(savedProject);
    }

    @Override
    public ProjectResponseDTO updateProject(Long id, ProjectRequestDTO request, String userId) {
        log.info("Updating project with id: {} by user: {}", id, userId);

        // Check project exists
        Project existingProject = projectRepository.findById(id)
                .orElseThrow(() -> new ProjectNotFoundException("Project not found with id: " + id));

        // Check authorization: project manager or admin can update
        if (!hasProjectManagementAccess(existingProject, userId)) {
            throw new UnauthorizedException("Only the project manager or an admin can update this project");
        }

        // Validate business rules
        projectValidator.validateForUpdate(request, existingProject);

        String previousCustomerId = existingProject.getCustomerId();
        String customerUserId = resolveOptionalCustomerUserId(request.getCustomerId());

        // Update
        projectMapper.updateEntity(request, existingProject);
        synchronizeCustomerAssociation(existingProject, previousCustomerId, customerUserId);

        // Update business logic
        if (existingProject.getProgress() >= 100.0 || existingProject.getStatus() == ProjectStatus.COMPLETED) {
            existingProject.setStatus(ProjectStatus.COMPLETED);
            if (request.getActualEndDate() != null) {
                existingProject.setActualEndDate(request.getActualEndDate());
            } else if (existingProject.getActualEndDate() == null) {
                existingProject.setActualEndDate(LocalDate.now());
            }
        }
        existingProject.setUpdatedAt(LocalDateTime.now());

        // Save
        Project updatedProject = projectRepository.save(existingProject);
        persistNewMilestones(updatedProject, request.getMilestones(), userId);
        updatedProject = refreshProjectProgress(updatedProject);
        syncProjectToFinance(updatedProject);

        return toResponseDTO(updatedProject);
    }

    @Override
    public void deleteProject(Long id, String userId) {
        log.info("Deleting project with id: {} by user: {}", id, userId);

        Project project = projectRepository.findById(id)
                .orElseThrow(() -> new ProjectNotFoundException("Project not found with id: " + id));

        // Check authorization: project manager or admin can delete
        if (!hasProjectManagementAccess(project, userId)) {
            throw new UnauthorizedException("Only the project manager or an admin can delete this project");
        }

        // Don't allow deletion of completed projects
        if (project.getStatus() == ProjectStatus.COMPLETED) {
            throw new ProjectValidationException("Cannot delete a completed project");
        }

        projectRepository.deleteById(id);
    }

    // ============================================
    // BUSINESS METHODS
    // ============================================

    @Override
    @Transactional(readOnly = true)
    public List<ProjectResponseDTO> getProjectsByStatus(ProjectStatus status) {
        log.info("Retrieving projects with status: {}", status);
        return projectRepository.findByStatus(status)
                .stream()
                .map(this::toResponseDTO)
                .toList();
    }

    @Override
    @Transactional(readOnly = true)
    public List<ProjectResponseDTO> getProjectsByUser(String userId) {
        log.info("Retrieving all projects for user: {} (creator, manager, or member)", userId);
        return findAccessibleProjects(userId)
                .stream()
                .map(this::toResponseDTO)
                .toList();
    }

    @Override
    @Transactional(readOnly = true)
    public List<ProjectResponseDTO> getProjectsWhereUserIsManager(String userId) {
        log.info("Retrieving projects where user {} is project manager", userId);
        return (isAdminUser(userId)
                ? projectRepository.findAll()
                : projectRepository.findByProjectManagerId(resolveUserIdentifier(userId)))
                .stream()
                .map(this::toResponseDTO)
                .toList();
    }

    @Override
    @Transactional(readOnly = true)
    public List<ProjectResponseDTO> searchProjectsByUser(String name, ProjectStatus status, String userId) {
        log.info("Searching projects for user {} with name: {} and status: {}", userId, name, status);
        
        List<Project> projects = findAccessibleProjects(userId);

        return projects.stream()
                .filter(p -> name == null || p.getName().toLowerCase().contains(name.toLowerCase()))
                .filter(p -> status == null || p.getStatus() == status)
                .map(this::toResponseDTO)
                .toList();
    }

    @Override
    @Transactional(readOnly = true)
    public List<ProjectResponseDTO> getDelayedProjects() {
        log.info("Retrieving delayed projects");
        return projectRepository.findDelayedProjects()
                .stream()
                .map(this::toResponseDTO)
                .toList();
    }

    // ============================================
    // ANALYTICS
    // ============================================

    @Override
    public Double getAverageProgress() {
        return projectRepository.getAverageProgress();
    }

    @Override
    @Transactional(readOnly = true)
    public String getProjectSummary(Long id, String userId) {
        Project project = projectRepository.findById(id)
                .orElseThrow(() -> new ProjectNotFoundException("Project not found with id: " + id));

        if (!hasProjectReadAccess(project, userId)) {
            throw new UnauthorizedException("You are not allowed to access this project");
        }

        List<ProjectMember> members = projectMemberRepository.findByProjectId(id);
        List<Milestone> milestones = milestoneRepository.findByProjectId(id);
        List<ProjectMeeting> meetings = projectMeetingRepository.findByProjectIdOrderByMeetingDateAscStartTimeAsc(id);
        List<ProjectDocument> documents = projectDocumentRepository.findByProjectId(id);
        List<ProjectNotification> notifications = projectNotificationRepository.findByProjectId(id);

        String prompt = buildProjectSummaryPrompt(project, members, documents, meetings, milestones, notifications);
        String aiSummary = generateProjectSummaryWithAi(prompt);
        if (aiSummary != null && !aiSummary.isBlank()) {
            return aiSummary.trim();
        }

        return buildFallbackProjectSummary(project, members, documents, meetings, milestones, notifications);
    }

    @Override
    @Transactional(readOnly = true)
    public ProjectDashboardStatsDTO getDashboardStats(String userId, String period) {
        log.info("Generating project dashboard stats for user: {} and period: {}", userId, period);

        List<Project> projects = findAccessibleProjects(userId);
        boolean globalScope = userId == null || userId.isBlank() || isAdminUser(userId);

        List<Project> scopedProjects = projects.stream()
                .filter(project -> isProjectInPeriod(project, period))
                .toList();

        Set<Long> projectIds = scopedProjects.stream()
                .map(Project::getId)
                .filter(Objects::nonNull)
                .collect(Collectors.toSet());

        LocalDate today = LocalDate.now();

        List<ProjectMember> members = projectIds.isEmpty() ? List.of() : projectMemberRepository.findByProjectIdIn(projectIds);
        List<Milestone> milestones = projectIds.isEmpty() ? List.of() : milestoneRepository.findByProjectIdIn(projectIds);
        List<ProjectMeeting> meetings = projectIds.isEmpty() ? List.of() : projectMeetingRepository.findByProjectIdIn(projectIds);
        List<ProjectDocument> documents = projectIds.isEmpty() ? List.of() : projectDocumentRepository.findByProjectIdIn(projectIds);
        List<ProjectNotification> notifications = projectIds.isEmpty() ? List.of() : projectNotificationRepository.findByProjectIdIn(projectIds);

        long totalProjects = scopedProjects.size();
        long completedProjects = scopedProjects.stream().filter(p -> p.getStatus() == ProjectStatus.COMPLETED).count();
        long delayedProjects = scopedProjects.stream()
                .filter(p -> p.getProgress() != null && p.getProgress() < 100)
                .filter(p -> p.getEndDate() != null && p.getEndDate().isBefore(today))
                .count();
        long activeProjects = scopedProjects.stream()
                .filter(p -> p.getStatus() != ProjectStatus.COMPLETED && p.getStatus() != ProjectStatus.CANCELLED)
                .count();

        double averageProgress = totalProjects == 0
                ? 0.0
                : scopedProjects.stream()
                .map(Project::getProgress)
                .filter(Objects::nonNull)
                .mapToDouble(Double::doubleValue)
                .average()
                .orElse(0.0);

        Map<String, Long> projectsByStatus = buildStatusCountMap(ProjectStatus.values(),
                scopedProjects.stream().map(project -> project.getStatus() != null ? project.getStatus().name() : ProjectStatus.PLANNED.name()).toList());

        List<ProjectMember> activeProjectMembers = members.stream()
                .filter(member -> Boolean.TRUE.equals(member.getIsActive()))
                .toList();

        long totalMembers = members.size();
        long activeMembers = activeProjectMembers.size();
        Map<String, Long> membersByRole = countByKey(
                activeProjectMembers.stream().map(member -> normalizeMemberRole(member.getRole())).toList(),
                List.of("PROJECT_MANAGER", "CUSTOMER", "PROJECT_MEMBER", "ADMIN")
        );

        long totalMilestones = milestones.size();
        long plannedMilestones = milestones.stream().filter(m -> m.getStatus() == MilestoneStatus.PENDING).count();
        long inProgressMilestones = milestones.stream().filter(m -> m.getStatus() == MilestoneStatus.IN_PROGRESS).count();
        long achievedMilestones = milestones.stream().filter(m -> m.getStatus() == MilestoneStatus.ACHIEVED).count();
        long missedMilestones = milestones.stream().filter(m -> m.getStatus() == MilestoneStatus.MISSED).count();
        long cancelledMilestones = milestones.stream().filter(m -> m.getStatus() == MilestoneStatus.CANCELLED).count();
        long criticalMilestones = milestones.stream().filter(m -> Boolean.TRUE.equals(m.getIsCritical())).count();
        long overdueMilestones = milestones.stream()
                .filter(m -> m.getDueDate() != null && m.getDueDate().isBefore(today))
                .filter(m -> m.getStatus() != MilestoneStatus.ACHIEVED && m.getStatus() != MilestoneStatus.CANCELLED)
                .count();
        Map<String, Long> milestonesByStatus = buildStatusCountMap(MilestoneStatus.values(),
                milestones.stream().map(milestone -> milestone.getStatus() != null ? milestone.getStatus().name() : MilestoneStatus.PENDING.name()).toList());

        long totalMeetings = meetings.size();
        long upcomingMeetings = meetings.stream().filter(meeting -> meeting.getMeetingDate() != null && !meeting.getMeetingDate().isBefore(today)).count();
        long pastMeetings = meetings.stream().filter(meeting -> meeting.getMeetingDate() != null && meeting.getMeetingDate().isBefore(today)).count();
        Map<String, Long> meetingsByStatus = countByKey(meetings.stream().map(meeting -> normalizeKey(meeting.getStatus())).toList(), List.of("SCHEDULED", "COMPLETED", "CANCELLED"));

        long totalDocuments = documents.size();
        Map<String, Long> documentsByType = buildEnumCountMap(ProjectDocumentType.values(),
                documents.stream().map(document -> document.getType() != null ? document.getType().name() : ProjectDocumentType.OTHER.name()).toList());

        long totalNotifications = notifications.size();
        long unreadNotifications = notifications.stream().filter(notification -> !Boolean.TRUE.equals(notification.getIsRead())).count();
        Map<String, Long> notificationsByType = buildEnumCountMap(NotificationType.values(),
                notifications.stream().map(notification -> notification.getType() != null ? notification.getType().name() : NotificationType.PROGRESS_UPDATE.name()).toList());

        double completionRate = totalProjects == 0 ? 0.0 : (completedProjects * 100.0 / totalProjects);

        return ProjectDashboardStatsDTO.builder()
                .scope(globalScope ? "GLOBAL" : "USER")
                .userId(globalScope ? null : userId)
                .totalProjects(totalProjects)
                .activeProjects(activeProjects)
                .completedProjects(completedProjects)
                .delayedProjects(delayedProjects)
                .averageProgress(roundOneDecimal(averageProgress))
                .completionRate(roundOneDecimal(completionRate))
                .projectsByStatus(projectsByStatus)
                .totalMembers(totalMembers)
                .activeMembers(activeMembers)
                .membersByRole(membersByRole)
                .totalMilestones(totalMilestones)
                .plannedMilestones(plannedMilestones)
                .inProgressMilestones(inProgressMilestones)
                .achievedMilestones(achievedMilestones)
                .missedMilestones(missedMilestones)
                .cancelledMilestones(cancelledMilestones)
                .criticalMilestones(criticalMilestones)
                .overdueMilestones(overdueMilestones)
                .milestonesByStatus(milestonesByStatus)
                .totalMeetings(totalMeetings)
                .upcomingMeetings(upcomingMeetings)
                .pastMeetings(pastMeetings)
                .meetingsByStatus(meetingsByStatus)
                .totalDocuments(totalDocuments)
                .documentsByType(documentsByType)
                .totalNotifications(totalNotifications)
                .unreadNotifications(unreadNotifications)
                .notificationsByType(notificationsByType)
                .generatedAt(LocalDateTime.now())
                .build();
    }

    @Override
    @Transactional(readOnly = true)
    public List<ProjectResponseDTO> advancedSearchProjects(
            String name, ProjectStatus status, String description, String customer,
            Double minProgress, Double maxProgress,
            String startDateFrom, String startDateTo,
            String createdBy, boolean delayedOnly,
            String sortBy, String sortDirection, String userId) {

        log.info("Advanced search for projects by user: {} with filters - name: {}, status: {}, customer: {}, progress: {}-{}, dates: {}-{}, delayedOnly: {}, sortBy: {}, sortDirection: {}",
                userId, name, status, customer, minProgress, maxProgress, startDateFrom, startDateTo, delayedOnly, sortBy, sortDirection);

        // Get all projects accessible by the user
        List<Project> projects = findAccessibleProjects(userId);

        LocalDate startDate = null;
        LocalDate endDate = null;

        // Parse dates safely
        try {
            if (startDateFrom != null && !startDateFrom.isBlank()) {
                startDate = LocalDate.parse(startDateFrom);
            }
            if (startDateTo != null && !startDateTo.isBlank()) {
                endDate = LocalDate.parse(startDateTo);
            }
        } catch (Exception e) {
            log.warn("Error parsing dates: startDateFrom={}, startDateTo={}", startDateFrom, startDateTo, e);
        }

        // Apply filters
        final LocalDate finalStartDate = startDate;
        final LocalDate finalEndDate = endDate;

        return projects.stream()
                // Filter by name (case-insensitive, partial match)
                .filter(p -> name == null || name.isBlank() || p.getName().toLowerCase().contains(name.toLowerCase()))

                // Filter by status (exact match)
                .filter(p -> status == null || p.getStatus() == status)

                // Filter by description (case-insensitive, partial match)
                .filter(p -> description == null || description.isBlank() ||
                        (p.getDescription() != null && p.getDescription().toLowerCase().contains(description.toLowerCase())))

                // Filter by customer (stored on the project, with backward-compatible fallback)
                .filter(p -> customer == null || customer.isBlank() || matchesCustomerFilter(p, customer))

                // Filter by progress range
                .filter(p -> minProgress == null || p.getProgress() >= minProgress)
                .filter(p -> maxProgress == null || p.getProgress() <= maxProgress)

                // Filter by created by (accept id, username, email, or visible user details)
                .filter(p -> createdBy == null || createdBy.isBlank() || matchesUserSearch(p.getCreatedBy(), createdBy))

                // Filter delayed projects (progress < 100 AND endDate is before today)
                .filter(p -> !delayedOnly || (p.getProgress() < 100 && p.getEndDate() != null && p.getEndDate().isBefore(LocalDate.now())))

                // Filter by start date range
                .filter(p -> finalStartDate == null || (p.getStartDate() != null && (p.getStartDate().isAfter(finalStartDate) || p.getStartDate().isEqual(finalStartDate))))
                .filter(p -> finalEndDate == null || (p.getStartDate() != null && (p.getStartDate().isBefore(finalEndDate) || p.getStartDate().isEqual(finalEndDate))))

                // Sort by the specified field and direction
                .sorted((p1, p2) -> {
                    int comparison = 0;
                    switch (sortBy != null ? sortBy.toUpperCase() : "CREATED_DATE") {
                        case "NAME":
                            comparison = p1.getName().compareTo(p2.getName());
                            log.debug("Sorting by NAME: {} vs {}", p1.getName(), p2.getName());
                            break;
                        case "PROGRESS":
                            comparison = Double.compare(p1.getProgress() != null ? p1.getProgress() : 0,
                                                       p2.getProgress() != null ? p2.getProgress() : 0);
                            log.debug("Sorting by PROGRESS: {} vs {}", p1.getProgress(), p2.getProgress());
                            break;
                        case "STATUS":
                            comparison = (p1.getStatus() != null ? p1.getStatus() : ProjectStatus.PLANNED)
                                    .compareTo(p2.getStatus() != null ? p2.getStatus() : ProjectStatus.PLANNED);
                            log.debug("Sorting by STATUS: {} vs {}", p1.getStatus(), p2.getStatus());
                            break;
                        case "START_DATE":
                            comparison = (p1.getStartDate() != null ? p1.getStartDate() : LocalDate.now())
                                    .compareTo(p2.getStartDate() != null ? p2.getStartDate() : LocalDate.now());
                            log.debug("Sorting by START_DATE: {} vs {}", p1.getStartDate(), p2.getStartDate());
                            break;
                        case "END_DATE":
                            comparison = (p1.getEndDate() != null ? p1.getEndDate() : LocalDate.now())
                                    .compareTo(p2.getEndDate() != null ? p2.getEndDate() : LocalDate.now());
                            log.debug("Sorting by END_DATE: {} vs {}", p1.getEndDate(), p2.getEndDate());
                            break;
                        case "CREATED_DATE":
                        default:
                            comparison = (p1.getUpdatedAt() != null ? p1.getUpdatedAt() : LocalDateTime.now())
                                    .compareTo(p2.getUpdatedAt() != null ? p2.getUpdatedAt() : LocalDateTime.now());
                            log.debug("Sorting by CREATED_DATE: {} vs {}", p1.getUpdatedAt(), p2.getUpdatedAt());
                    }

                    // Apply sort direction
                    boolean isAscending = "ASC".equalsIgnoreCase(sortDirection);
                    log.debug("Sort direction: {}, isAscending: {}", sortDirection, isAscending);
                    return isAscending ? comparison : -comparison;
                })
                .map(this::toResponseDTO)
                .toList();
    }

    // ============================================
    // HELPER METHODS
    // ============================================

    /**
     * Check whether the project customer matches the provided search value.
     * Supports stored IDs as well as username/email inputs resolved through the user service.
     * Falls back to legacy CUSTOMER member records if needed.
     */
    private boolean matchesCustomerFilter(Project project, String customerIdentifier) {
        if (project == null || customerIdentifier == null || customerIdentifier.isBlank()) {
            return true;
        }

        String projectCustomerId = project.getCustomerId();
        if (matchesUserSearch(projectCustomerId, customerIdentifier)) {
            return true;
        }

        String normalizedCustomerId = resolveUserIdentifier(customerIdentifier);
        if (matchesUserSearch(projectCustomerId, normalizedCustomerId)) {
            return true;
        }

        if (project.getId() == null) {
            return false;
        }

        boolean legacyCustomerMemberMatch = projectMemberRepository.findAll().stream()
                .anyMatch(member -> member.getProject() != null
                        && project.getId().equals(member.getProject().getId())
                        && "CUSTOMER".equalsIgnoreCase(member.getRole())
                        && member.getUserId() != null
                        && matchesUserSearch(member.getUserId(), customerIdentifier));

        if (legacyCustomerMemberMatch) {
            log.debug("Found legacy CUSTOMER member match for projectId={} and identifier={}", project.getId(), customerIdentifier);
        }

        return legacyCustomerMemberMatch;
    }

    private boolean matchesUserSearch(String storedIdentifier, String searchTerm) {
        if (storedIdentifier == null || storedIdentifier.isBlank() || searchTerm == null || searchTerm.isBlank()) {
            return false;
        }

        if (matchesUserIdentifier(storedIdentifier, searchTerm)) {
            return true;
        }

        String normalizedSearch = searchTerm.trim().toLowerCase();
        try {
            String resolvedUserId = resolveUserIdentifier(storedIdentifier);
            UserDTO userDTO = userServiceClient.getUserById(resolvedUserId);
            if (userDTO == null) {
                return false;
            }

            return matchesText(userDTO.getUsername(), normalizedSearch)
                    || matchesText(userDTO.getEmail(), normalizedSearch)
                    || matchesText(userDTO.getFirstName(), normalizedSearch)
                    || matchesText(userDTO.getLastName(), normalizedSearch)
                    || matchesText(buildFullName(userDTO), normalizedSearch);
        } catch (Exception e) {
            log.debug("Unable to match user search term '{}' against stored identifier '{}'", searchTerm, storedIdentifier, e);
            return false;
        }
    }

    private boolean matchesText(String value, String normalizedSearch) {
        return value != null && !normalizedSearch.isBlank() && value.toLowerCase().contains(normalizedSearch);
    }

    private String buildFullName(UserDTO userDTO) {
        if (userDTO == null) {
            return "";
        }

        String firstName = userDTO.getFirstName() != null ? userDTO.getFirstName().trim() : "";
        String lastName = userDTO.getLastName() != null ? userDTO.getLastName().trim() : "";
        return (firstName + " " + lastName).trim();
    }

    /**
     * Check if a user is the project manager
     */
    private boolean isProjectManager(Project project, String userId) {
        if (project.getProjectManagerId() == null || userId == null || userId.isBlank()) {
            return false;
        }

        String resolvedUserId = resolveUserIdentifier(userId);
        return project.getProjectManagerId().equalsIgnoreCase(userId.trim())
                || project.getProjectManagerId().equalsIgnoreCase(resolvedUserId);
    }

    private boolean hasProjectManagementAccess(Project project, String userId) {
        return isAdminUser(userId) || (isProjectManagerRoleUser(userId) && isProjectManager(project, userId));
    }

    private boolean hasProjectReadAccess(Project project, String userId) {
        if (project == null) {
            return false;
        }

        if (isAdminUser(userId)) {
            return true;
        }

        String role = resolveUserRole(userId);
        if (isCustomerRoleUser(role)) {
            return project.getVisibility() == ProjectVisibility.PUBLIC
                    && (isActiveMemberOfProject(project.getId(), userId) || isProjectCustomer(project, userId));
        }

        if (isProjectMemberRoleUser(role)) {
            return isActiveMemberOfProject(project.getId(), userId);
        }

        if (isProjectManagerRoleUser(role)) {
            return isProjectManager(project, userId);
        }

        return false;
    }

    private boolean isProjectCreator(Project project, String userId) {
        if (project.getCreatedBy() == null || userId == null || userId.isBlank()) {
            return false;
        }

        String resolvedUserId = resolveUserIdentifier(userId);
        return project.getCreatedBy().equalsIgnoreCase(userId.trim())
                || project.getCreatedBy().equalsIgnoreCase(resolvedUserId);
    }

    private boolean isActiveMemberOfProject(Long projectId, String userId) {
        if (projectId == null || userId == null || userId.isBlank()) {
            return false;
        }

        String resolvedUserId = resolveUserIdentifier(userId);
        return projectMemberRepository.findByProjectIdAndUserIdAndIsActiveTrue(projectId, userId.trim()).isPresent()
                || projectMemberRepository.findByProjectIdAndUserIdAndIsActiveTrue(projectId, resolvedUserId).isPresent();
    }

    private String resolveUserRole(String identifier) {
        UserDTO userDTO = resolveUserDTO(identifier);
        if (userDTO != null && userDTO.getRole() != null && !userDTO.getRole().isBlank()) {
            return userDTO.getRole().trim().toUpperCase();
        }
        return null;
    }

    private boolean isCustomerRoleUser(String role) {
        return "CUSTOMER".equalsIgnoreCase(role)
                || "CLIENT".equalsIgnoreCase(role)
                || "ROLE_CLIENT".equalsIgnoreCase(role);
    }

    private boolean isProjectMemberRoleUser(String role) {
        return "PROJECT_MEMBER".equalsIgnoreCase(role);
    }

    private boolean isProjectManagerRoleUser(String roleOrIdentifier) {
        if (roleOrIdentifier == null || roleOrIdentifier.isBlank()) {
            return false;
        }

        String normalized = roleOrIdentifier.trim().toUpperCase();
        if ("PROJECT_MANAGER".equals(normalized) || "MANAGER".equals(normalized) || "ROLE_MANAGER".equals(normalized)) {
            return true;
        }

        String resolvedRole = resolveUserRole(roleOrIdentifier);
        return "PROJECT_MANAGER".equalsIgnoreCase(resolvedRole)
                || "MANAGER".equalsIgnoreCase(resolvedRole)
                || "ROLE_MANAGER".equalsIgnoreCase(resolvedRole);
    }

    private boolean isAdminUser(String userId) {
        if (userId == null || userId.isBlank()) {
            return false;
        }

        String trimmed = userId.trim();
        if ("admin".equalsIgnoreCase(trimmed) || "system".equalsIgnoreCase(trimmed)) {
            return true;
        }

        UserDTO userDTO = resolveUserDTO(trimmed);
        return userDTO != null && userDTO.getRole() != null && "ADMIN".equalsIgnoreCase(userDTO.getRole());
    }

    private List<Project> findAccessibleProjects(String userId) {
        if (userId == null || userId.isBlank() || isAdminUser(userId)) {
            return projectRepository.findAll();
        }

        String role = resolveUserRole(userId);
        if (isCustomerRoleUser(role)) {
            return projectRepository.findAll().stream()
                    .filter(project -> project.getVisibility() == ProjectVisibility.PUBLIC)
                    .filter(project -> isActiveMemberOfProject(project.getId(), userId) || isProjectCustomer(project, userId))
                    .toList();
        }

        if (isProjectMemberRoleUser(role)) {
            Set<String> candidateIdentifiers = resolveUserIdentifiers(userId);
            return projectMemberRepository.findAll().stream()
                    .filter(member -> Boolean.TRUE.equals(member.getIsActive()))
                    .filter(member -> member.getProject() != null)
                    .filter(member -> {
                        String memberUserId = member.getUserId();
                        if (memberUserId == null) {
                            return false;
                        }
                        String normalizedMemberUserId = memberUserId.trim();
                        return candidateIdentifiers.stream()
                                .anyMatch(candidate -> candidate.equalsIgnoreCase(normalizedMemberUserId));
                    })
                    .map(ProjectMember::getProject)
                    .filter(Objects::nonNull)
                    .distinct()
                    .toList();
        }

        if (isProjectManagerRoleUser(role)) {
            return projectRepository.findByProjectManagerId(resolveUserIdentifier(userId));
        }

        return List.of();
    }

    private UserDTO resolveUserDTO(String identifier) {
        if (identifier == null || identifier.isBlank()) {
            return null;
        }

        String trimmed = identifier.trim();
        try {
            if (trimmed.matches("\\d+")) {
                return userServiceClient.getUserById(trimmed);
            }

            try {
                return userServiceClient.getUserByUsername(trimmed);
            } catch (Exception usernameLookupFailed) {
                return userServiceClient.getUserByEmail(trimmed);
            }
        } catch (Exception e) {
            log.debug("Unable to resolve user '{}' to a user DTO", identifier, e);
            return null;
        }
    }

    private String resolveUserIdentifier(String identifier) {
        if (identifier == null || identifier.isBlank()) {
            return identifier;
        }

        String trimmed = identifier.trim();
        try {
            UserDTO userDTO;

            if (trimmed.matches("\\d+")) {
                userDTO = userServiceClient.getUserById(trimmed);
            } else {
                try {
                    userDTO = userServiceClient.getUserByUsername(trimmed);
                } catch (Exception usernameLookupFailed) {
                    userDTO = userServiceClient.getUserByEmail(trimmed);
                }
            }

            if (userDTO != null && userDTO.getId() != null && !userDTO.getId().isBlank()) {
                return userDTO.getId().trim();
            }
        } catch (Exception e) {
            log.debug("Unable to resolve user identifier '{}' to user id, using raw value", identifier, e);
        }

        return trimmed;
    }

    private Set<String> resolveUserIdentifiers(String identifier) {
        Set<String> identifiers = new LinkedHashSet<>();
        if (identifier == null || identifier.isBlank()) {
            return identifiers;
        }

        String trimmed = identifier.trim();
        identifiers.add(trimmed);

        UserDTO userDTO = resolveUserDTO(trimmed);
        if (userDTO != null) {
            if (userDTO.getId() != null && !userDTO.getId().isBlank()) {
                identifiers.add(userDTO.getId().trim());
            }
            if (userDTO.getUsername() != null && !userDTO.getUsername().isBlank()) {
                identifiers.add(userDTO.getUsername().trim());
            }
            if (userDTO.getEmail() != null && !userDTO.getEmail().isBlank()) {
                identifiers.add(userDTO.getEmail().trim());
            }
        }

        return identifiers;
    }

    private String resolveRequiredUserId(String identifier) {
        if (identifier == null || identifier.isBlank()) {
            throw new IllegalArgumentException("User identifier cannot be empty");
        }

        String trimmed = identifier.trim();
        if (trimmed.matches("\\d+")) {
            return trimmed;
        }

        UserDTO userDTO;
        try {
            userDTO = userServiceClient.getUserByUsername(trimmed);
        } catch (Exception usernameLookupFailed) {
            try {
                userDTO = userServiceClient.getUserByEmail(trimmed);
            } catch (Exception emailLookupFailed) {
                userDTO = userServiceClient.getUserById(trimmed);
            }
        }

        if (userDTO != null && userDTO.getId() != null && !userDTO.getId().isBlank()) {
            return userDTO.getId().trim();
        }

        throw new IllegalArgumentException("Unable to resolve user identifier to a valid user id: " + identifier);
    }

    private String resolveOptionalCustomerUserId(String identifier) {
        if (identifier == null || identifier.isBlank()) {
            return null;
        }

        String customerUserId = resolveRequiredUserId(identifier);
        UserDTO userDTO = userServiceClient.getUserById(customerUserId);
        if (userDTO == null || userDTO.getRole() == null || !"CUSTOMER".equalsIgnoreCase(userDTO.getRole())) {
            throw new ProjectValidationException("Selected customer must be a user with role CUSTOMER");
        }

        return customerUserId;
    }

    private void synchronizeCustomerAssociation(Project project, String previousCustomerId, String customerUserId) {
        List<ProjectMember> projectMembers = projectMemberRepository.findByProjectId(project.getId());

        if (customerUserId == null) {
            if (previousCustomerId != null && !previousCustomerId.isBlank()) {
                projectMembers.stream()
                        .filter(this::isCustomerMember)
                        .filter(member -> matchesUserIdentifier(member.getUserId(), previousCustomerId))
                        .forEach(member -> {
                            member.setIsActive(false);
                            projectMemberRepository.save(member);
                        });
            }

            project.setCustomerId(null);
            return;
        }

        if (previousCustomerId != null && !matchesUserIdentifier(previousCustomerId, customerUserId)) {
            projectMembers.stream()
                    .filter(this::isCustomerMember)
                    .filter(member -> matchesUserIdentifier(member.getUserId(), previousCustomerId))
                    .forEach(member -> {
                        member.setIsActive(false);
                        projectMemberRepository.save(member);
                    });
        }

        projectMembers.stream()
                .filter(this::isCustomerMember)
                .filter(member -> matchesUserIdentifier(member.getUserId(), customerUserId))
                .forEach(member -> {
                    member.setIsActive(false);
                    projectMemberRepository.save(member);
                });

        project.setCustomerId(customerUserId);
    }

    private void persistNewMilestones(Project project, List<MilestoneRequestDTO> milestoneRequests, String userId) {
        if (project == null || milestoneRequests == null || milestoneRequests.isEmpty()) {
            return;
        }

        if ("CUSTOMER".equalsIgnoreCase(resolveUserRole(userId))) {
            throw new UnauthorizedException("Customers are not allowed to create, update or delete project milestones");
        }

        for (MilestoneRequestDTO milestoneRequest : milestoneRequests) {
            if (milestoneRequest == null || milestoneRequest.getId() != null) {
                continue;
            }

            milestoneValidator.validateForCreate(milestoneRequest);

            Milestone milestone = new Milestone();
            milestone.setTitle(milestoneRequest.getTitle());
            milestone.setDescription(milestoneRequest.getDescription());
            milestone.setDueDate(milestoneRequest.getDueDate());
            milestone.setStatus(milestoneRequest.getStatus() != null ? milestoneRequest.getStatus() : MilestoneStatus.PENDING);
            milestone.setIsCritical(milestoneRequest.getIsCritical() != null ? milestoneRequest.getIsCritical() : false);
            milestone.setActualCompletionDate(milestoneRequest.getActualCompletionDate());
            milestone.setProject(project);

            Milestone savedMilestone = milestoneRepository.save(milestone);
            project.getMilestones().add(savedMilestone);
        }
    }

    private Project refreshProjectProgress(Project project) {
        if (project == null || project.getId() == null) {
            return project;
        }

        List<Milestone> milestones = milestoneRepository.findByProjectId(project.getId());
        long plannedMilestones = milestones.stream()
                .filter(milestone -> milestone.getStatus() != MilestoneStatus.CANCELLED)
                .count();
        long achievedMilestones = milestones.stream()
                .filter(milestone -> milestone.getStatus() == MilestoneStatus.ACHIEVED)
                .count();

        double progress = plannedMilestones == 0
                ? 0.0
                : roundOneDecimal((achievedMilestones * 100.0) / plannedMilestones);

        project.setProgress(progress);
        return projectRepository.save(project);
    }

    private boolean isCustomerMember(ProjectMember member) {
        return member != null && "CUSTOMER".equalsIgnoreCase(member.getRole());
    }

    private boolean matchesUserIdentifier(String storedIdentifier, String candidateIdentifier) {
        if (storedIdentifier == null || storedIdentifier.isBlank() || candidateIdentifier == null || candidateIdentifier.isBlank()) {
            return false;
        }

        if (storedIdentifier.equalsIgnoreCase(candidateIdentifier)) {
            return true;
        }

        String normalizedStored = resolveUserIdentifier(storedIdentifier);
        String normalizedCandidate = resolveUserIdentifier(candidateIdentifier);
        return normalizedStored != null && normalizedCandidate != null && normalizedStored.equalsIgnoreCase(normalizedCandidate);
    }

    private ProjectResponseDTO toResponseDTO(Project project) {
        ProjectResponseDTO responseDTO = projectMapper.toResponseDTO(project);
        if (responseDTO.getMembers() != null) {
            responseDTO.setMembers(responseDTO.getMembers().stream()
                    .map(this::normalizeMemberResponse)
                    .toList());
        }
        if (responseDTO.getCustomerId() != null) {
            responseDTO.setCustomerId(resolveUserIdentifier(responseDTO.getCustomerId()));
        }
        return responseDTO;
    }

    private ProjectMemberResponseDTO normalizeMemberResponse(ProjectMemberResponseDTO member) {
        if (member == null || member.getUserId() == null || member.getUserId().isBlank()) {
            return member;
        }
        member.setUserId(resolveUserIdentifier(member.getUserId()));
        return member;
    }

    private void createMemberAddedNotification(Project project, String userId, String role) {
        try {
            Long numericUserId = Long.valueOf(userId);
            String projectName = project.getName() != null && !project.getName().isBlank() ? project.getName() : "your project";
            String normalizedRole = role != null && !role.isBlank() ? role.toUpperCase() : "MEMBER";
            String message = "You have been added to project '" + projectName + "' as " + normalizedRole + ".";
            projectNotificationService.createMemberAddedNotification(project.getId(), numericUserId, message);
        } catch (Exception ex) {
            log.warn("Unable to create notification for project {} and user {}", project.getId(), userId, ex);
        }
    }


    private boolean isProjectInPeriod(Project project, String period) {
        if (project == null) {
            return false;
        }

        String normalizedPeriod = period == null ? "30D" : period.trim().toUpperCase();
        if (normalizedPeriod.isBlank() || "ALL".equals(normalizedPeriod)) {
            return true;
        }

        LocalDateTime updatedAt = project.getUpdatedAt();
        if (updatedAt == null) {
            return false;
        }

        int days = resolvePeriodDays(normalizedPeriod);
        LocalDateTime from = LocalDateTime.now().minusDays(days);
        return !updatedAt.isBefore(from);
    }

    private int resolvePeriodDays(String period) {
        return switch (period) {
            case "7D" -> 7;
            case "90D" -> 90;
            case "1Y", "12M" -> 365;
            case "30D" -> 30;
            default -> 30;
        };
    }

    private String normalizeKey(String value) {
        return value == null || value.isBlank() ? "UNKNOWN" : value.trim().toUpperCase();
    }

    private String normalizeMemberRole(String value) {
        String normalized = normalizeKey(value);
        return switch (normalized) {
            case "MEMBER" -> "PROJECT_MEMBER";
            default -> normalized;
        };
    }

    private Map<String, Long> buildEnumCountMap(Enum<?>[] values, List<String> observedKeys) {
        Map<String, Long> result = new LinkedHashMap<>();
        for (Enum<?> value : values) {
            result.put(value.name(), 0L);
        }
        for (String key : observedKeys) {
            result.computeIfPresent(key, (k, current) -> current + 1);
            if (!result.containsKey(key)) {
                result.put(key, 1L);
            }
        }
        return result;
    }

    private Map<String, Long> buildStatusCountMap(Enum<?>[] values, List<String> observedKeys) {
        return buildEnumCountMap(values, observedKeys);
    }

    private Map<String, Long> countByKey(List<String> observedKeys, List<String> knownKeys) {
        Map<String, Long> result = new LinkedHashMap<>();
        for (String key : knownKeys) {
            result.put(key, 0L);
        }
        for (String key : observedKeys) {
            if (key == null || key.isBlank()) {
                key = "UNKNOWN";
            }
            result.put(key, result.getOrDefault(key, 0L) + 1);
        }
        return result;
    }

    private Double roundOneDecimal(Double value) {
        if (value == null) {
            return 0.0;
        }
        return Math.round(value * 10.0) / 10.0;
    }

    private String buildProjectSummaryPrompt(Project project,
                                             List<ProjectMember> members,
                                             List<ProjectDocument> documents,
                                             List<ProjectMeeting> meetings,
                                             List<Milestone> milestones,
                                             List<ProjectNotification> notifications) {
        StringBuilder context = new StringBuilder();
        context.append("Projet: ").append(safe(project.getName())).append("\n");
        context.append("Statut: ").append(project.getStatus() != null ? project.getStatus().name() : "PLANNED").append("\n");
        context.append("Progression: ").append(project.getProgress() != null ? roundOneDecimal(project.getProgress()) : 0.0).append("%\n");
        context.append("Visibilité: ").append(project.getVisibility() != null ? project.getVisibility().name() : "PRIVATE").append("\n");
        context.append("Dates: ").append(formatDate(project.getStartDate())).append(" -> ").append(formatDate(project.getEndDate())).append("\n");
        context.append("Description: ").append(safe(project.getDescription())).append("\n");
        context.append("Objectifs: ").append(safe(project.getObjectives())).append("\n");
        context.append("Client: ").append(safe(project.getCustomerId())).append("\n");
        context.append("Chef de projet: ").append(safe(project.getProjectManagerId())).append("\n");

        context.append("\nMembres (").append(members.size()).append("):\n");
        members.stream().limit(10).forEach(member -> context.append("- ")
                .append(safe(member.getUserId()))
                .append(" | role=")
                .append(safe(member.getRole()))
                .append(" | active=")
                .append(Boolean.TRUE.equals(member.getIsActive()))
                .append("\n"));

        context.append("\nDocuments (").append(documents.size()).append("):\n");
        documents.stream().limit(10).forEach(document -> context.append("- ")
                .append(safe(document.getName()))
                .append(" | type=")
                .append(document.getType() != null ? document.getType().name() : "OTHER")
                .append(" | version=")
                .append(safe(document.getVersion()))
                .append("\n"));

        context.append("\nRéunions (").append(meetings.size()).append("):\n");
        meetings.stream().limit(10).forEach(meeting -> context.append("- ")
                .append(formatDate(meeting.getMeetingDate()))
                .append(" ")
                .append(meeting.getStartTime() != null ? meeting.getStartTime() : "")
                .append(" | ")
                .append(safe(meeting.getTitle()))
                .append(" | status=")
                .append(safe(meeting.getStatus()))
                .append("\n"));

        context.append("\nJalons (").append(milestones.size()).append("):\n");
        milestones.stream().limit(10).forEach(milestone -> context.append("- ")
                .append(formatDate(milestone.getDueDate()))
                .append(" | ")
                .append(safe(milestone.getTitle()))
                .append(" | status=")
                .append(milestone.getStatus() != null ? milestone.getStatus().name() : "PENDING")
                .append(" | critical=")
                .append(Boolean.TRUE.equals(milestone.getIsCritical()))
                .append("\n"));

        context.append("\nNotifications (").append(notifications.size()).append("):\n");
        notifications.stream().limit(10).forEach(notification -> context.append("- ")
                .append(notification.getCreatedAt() != null ? notification.getCreatedAt().toLocalDate().format(DateTimeFormatter.ISO_DATE) : "")
                .append(" | type=")
                .append(notification.getType() != null ? notification.getType().name() : "UNKNOWN")
                .append(" | read=")
                .append(Boolean.TRUE.equals(notification.getIsRead()))
                .append(" | ")
                .append(safe(notification.getMessage()))
                .append("\n"));

        return """
                You are a project management assistant. Write a concise, useful project summary in English based on the Edit Project tabs: General Info, Members, Documents, Meetings, Milestones, and Notifications.

                Instructions:
                - Write 6 short sections with the titles: Overview, Members, Documents, Meetings, Milestones, Alerts.
                - Highlight the most important points, items to watch, and any delays.
                - Use only the information provided.
                - Do not invent missing data.
                - Return plain text, without complex markdown.

                Project data:
                %s
                """.formatted(context.toString());
    }

    private String generateProjectSummaryWithAi(String prompt) {
        if (openRouterApiKey == null || openRouterApiKey.isBlank()) {
            return null;
        }

        try {
            Map<String, Object> body = new LinkedHashMap<>();
            body.put("model", "openai/gpt-4o-mini");
            body.put("messages", List.of(Map.of("role", "user", "content", prompt)));
            body.put("temperature", 0.2);

            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.APPLICATION_JSON);
            headers.setBearerAuth(openRouterApiKey);

            HttpEntity<Map<String, Object>> request = new HttpEntity<>(body, headers);
            ResponseEntity<String> response = restTemplate.postForEntity(openRouterUrl, request, String.class);
            if (response.getBody() == null || response.getBody().isBlank()) {
                return null;
            }

            JsonNode root = objectMapper.readTree(response.getBody());
            JsonNode choices = root.path("choices");
            if (!choices.isArray() || choices.isEmpty()) {
                return null;
            }

            JsonNode message = choices.get(0).path("message");
            String content = message.path("content").asText(null);
            return content != null ? content.trim() : null;
        } catch (Exception ex) {
            log.warn("Unable to generate AI project summary for project data", ex);
            return null;
        }
    }

    private String buildFallbackProjectSummary(Project project,
                                               List<ProjectMember> members,
                                               List<ProjectDocument> documents,
                                               List<ProjectMeeting> meetings,
                                               List<Milestone> milestones,
                                               List<ProjectNotification> notifications) {
        long activeMembers = members.stream().filter(member -> Boolean.TRUE.equals(member.getIsActive())).count();
        long unreadNotifications = notifications.stream().filter(notification -> !Boolean.TRUE.equals(notification.getIsRead())).count();
        long upcomingMeetings = meetings.stream()
                .filter(meeting -> meeting.getMeetingDate() != null && !meeting.getMeetingDate().isBefore(LocalDate.now()))
                .count();
        long overdueMilestones = milestones.stream()
                .filter(milestone -> milestone.getDueDate() != null && milestone.getDueDate().isBefore(LocalDate.now()))
                .filter(milestone -> milestone.getStatus() == null || milestone.getStatus() != MilestoneStatus.ACHIEVED)
                .count();

        return String.format(
                "Project %s summary: status %s, progress %.1f%%, %d active members, %d documents, %d upcoming meetings, %d overdue milestones, and %d unread notifications.",
                safe(project.getName()),
                project.getStatus() != null ? project.getStatus().name() : "PLANNED",
                project.getProgress() != null ? roundOneDecimal(project.getProgress()) : 0.0,
                activeMembers,
                documents.size(),
                upcomingMeetings,
                overdueMilestones,
                unreadNotifications
        );
    }

    private void syncProjectToFinance(Project project) {
        if (project == null || project.getId() == null) {
            return;
        }

        try {
            financeProjectClient.syncProject("projet-service", new ProjectDTO(
                    project.getId(),
                    project.getName(),
                    project.getDescription(),
                    project.getStatus() != null ? project.getStatus().name() : null,
                    project.getUpdatedAt() != null ? project.getUpdatedAt() : LocalDateTime.now(),
                    resolveFinanceOwnerId(project)
            ));
            log.info("Project {} synced to finance-service", project.getId());
        } catch (Exception exception) {
            log.warn("Project {} could not be synced to finance-service", project.getId(), exception);
        }
    }

    private String resolveFinanceOwnerId(Project project) {
        if (project.getCustomerId() != null && !project.getCustomerId().isBlank()) {
            return project.getCustomerId();
        }
        if (project.getCreatedBy() != null && !project.getCreatedBy().isBlank()) {
            return project.getCreatedBy();
        }
        return project.getProjectManagerId();
    }

    private boolean isProjectCustomer(Project project, String userId) {
        if (project == null || userId == null || userId.isBlank()
                || project.getCustomerId() == null || project.getCustomerId().isBlank()) {
            return false;
        }

        String resolvedUserId = resolveUserIdentifier(userId);
        return project.getCustomerId().equalsIgnoreCase(userId.trim())
                || project.getCustomerId().equalsIgnoreCase(resolvedUserId);
    }

    private String formatDate(LocalDate date) {
        return date != null ? date.format(DateTimeFormatter.ISO_DATE) : "-";
    }

    private String safe(String value) {
        return value == null || value.isBlank() ? "-" : value.trim();
    }
}
