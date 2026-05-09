package com.microservices.projetservice.service.impl;

import com.microservices.projetservice.dto.request.ProjectMeetingRequestDTO;
import com.microservices.projetservice.dto.response.ProjectMeetingResponseDTO;
import com.microservices.projetservice.entity.Project;
import com.microservices.projetservice.entity.ProjectMeeting;
import com.microservices.projetservice.enums.NotificationType;
import com.microservices.projetservice.exception.ProjectMeetingNotFoundException;
import com.microservices.projetservice.exception.ProjectMeetingValidationException;
import com.microservices.projetservice.exception.UnauthorizedException;
import com.microservices.projetservice.mapper.ProjectMeetingMapper;
import com.microservices.projetservice.feign.UserDTO;
import com.microservices.projetservice.feign.UserServiceClient;
import com.microservices.projetservice.repository.ProjectMeetingRepository;
import com.microservices.projetservice.repository.ProjectMemberRepository;
import com.microservices.projetservice.repository.ProjectRepository;
import com.microservices.projetservice.service.interfaces.ProjectMeetingService;
import com.microservices.projetservice.service.interfaces.ProjectNotificationService;
import com.microservices.projetservice.validator.ProjectMeetingValidator;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.time.LocalDate;
import java.time.LocalTime;
import java.util.List;

@Service
@RequiredArgsConstructor
@Slf4j
@Transactional
public class ProjectMeetingServiceImpl implements ProjectMeetingService {

    private final ProjectMeetingRepository projectMeetingRepository;
    private final ProjectRepository projectRepository;
    private final ProjectMemberRepository projectMemberRepository;
    private final ProjectMeetingMapper projectMeetingMapper;
    private final ProjectMeetingValidator projectMeetingValidator;
    private final ProjectNotificationService projectNotificationService;
    private final UserServiceClient userServiceClient;

    @Override
    @Transactional(readOnly = true)
    public List<ProjectMeetingResponseDTO> getAllProjectMeetings() {
        log.info("Retrieving all project meetings");
        return projectMeetingRepository.findAll()
                .stream()
                .map(projectMeetingMapper::toResponseDTO)
                .toList();
    }

    @Override
    @Transactional(readOnly = true)
    public ProjectMeetingResponseDTO getProjectMeetingById(Long id, String userId) {
        log.info("Retrieving project meeting with id: {} for user: {}", id, userId);
        ProjectMeeting projectMeeting = projectMeetingRepository.findById(id)
                .orElseThrow(() -> new ProjectMeetingNotFoundException("Project meeting not found with id: " + id));

        ensureProjectReadAccess(projectMeeting.getProject(), userId);

        return projectMeetingMapper.toResponseDTO(projectMeeting);
    }

    @Override
    public ProjectMeetingResponseDTO createProjectMeeting(ProjectMeetingRequestDTO request, String userId) {
        log.info("Creating a new project meeting for user: {}", userId);

        // Validation métier
        projectMeetingValidator.validateForCreate(request);

        // Récupérer le projet
        Project project = projectRepository.findById(request.getProjectId())
                .orElseThrow(() -> new ProjectMeetingValidationException("Projet non trouvé avec id: " + request.getProjectId()));

        ensureProjectMeetingCreationAccess(project, userId);

        // Conversion
        ProjectMeeting projectMeeting = projectMeetingMapper.toEntity(request);
        projectMeeting.setProject(project);
        projectMeeting.setCreatedBy(resolveMeetingCreator(userId, request.getCreatedBy()));

        // Sauvegarde
        ProjectMeeting savedProjectMeeting = projectMeetingRepository.save(projectMeeting);

        // Notification de tous les membres du projet
        notifyMembers(project, userId, "A new meeting '" + savedProjectMeeting.getTitle() + "' has been scheduled for " + savedProjectMeeting.getMeetingDate(), NotificationType.MEETING_SCHEDULED);

        return projectMeetingMapper.toResponseDTO(savedProjectMeeting);
    }

    private void notifyMembers(Project project, String initiatorUserId, String message, NotificationType type) {
        try {
            projectNotificationService.notifyProjectMembers(project.getId(), initiatorUserId, message, type);
        } catch (Exception e) {
            log.error("Error notifying members for project {}", project.getId(), e);
        }
    }

    @Override
    public ProjectMeetingResponseDTO updateProjectMeeting(Long id, ProjectMeetingRequestDTO request, String userId) {
        log.info("Updating project meeting with id: {} for user: {}", id, userId);

        // Vérifier existence
        ProjectMeeting existingProjectMeeting = projectMeetingRepository.findById(id)
                .orElseThrow(() -> new ProjectMeetingNotFoundException("Réunion de projet non trouvée avec id: " + id));

        ensureProjectMeetingManagementAccess(existingProjectMeeting.getProject(), userId);

        String oldStatus = existingProjectMeeting.getStatus();
        LocalDate oldDate = existingProjectMeeting.getMeetingDate();
        LocalTime oldStartTime = existingProjectMeeting.getStartTime();
        LocalTime oldEndTime = existingProjectMeeting.getEndTime();
        String oldTitle = existingProjectMeeting.getTitle();
        String oldLocation = existingProjectMeeting.getLocation();
        String oldLink = existingProjectMeeting.getMeetingLink();
        String oldDescription = existingProjectMeeting.getDescription();

        // Validation métier
        projectMeetingValidator.validateForUpdate(request, existingProjectMeeting);

        // Mise à jour
        projectMeetingMapper.updateEntity(request, existingProjectMeeting);

        // Sauvegarde
        ProjectMeeting updatedProjectMeeting = projectMeetingRepository.save(existingProjectMeeting);

        // Notification si changement de statut
        if (request.getStatus() != null && !request.getStatus().equalsIgnoreCase(oldStatus)) {
            notifyMembers(updatedProjectMeeting.getProject(), userId,
                "The status of meeting '" + updatedProjectMeeting.getTitle() + "' has changed to " + updatedProjectMeeting.getStatus(),
                NotificationType.STATUS_CHANGED);
        } else if ((request.getMeetingDate() != null && !request.getMeetingDate().equals(oldDate)) ||
                   (request.getStartTime() != null && !request.getStartTime().equals(oldStartTime)) ||
                   (request.getEndTime() != null && !request.getEndTime().equals(oldEndTime)) ||
                   (request.getTitle() != null && !request.getTitle().equals(oldTitle)) ||
                   (request.getLocation() != null && !request.getLocation().equals(oldLocation)) ||
                   (request.getMeetingLink() != null && !request.getMeetingLink().equals(oldLink)) ||
                   (request.getDescription() != null && !request.getDescription().equals(oldDescription))) {

            // Notification if any relevant field changed
            String timeInfo = updatedProjectMeeting.getStartTime() != null ? " at " + updatedProjectMeeting.getStartTime() : "";
            notifyMembers(updatedProjectMeeting.getProject(), userId,
                "The meeting '" + updatedProjectMeeting.getTitle() + "' scheduled for " + updatedProjectMeeting.getMeetingDate() + timeInfo + " has been updated.",
                NotificationType.MEETING_SCHEDULED);
        }

        return projectMeetingMapper.toResponseDTO(updatedProjectMeeting);
    }

    @Override
    public void deleteProjectMeeting(Long id, String userId) {
        log.info("Deleting project meeting with id: {} for user: {}", id, userId);

        ProjectMeeting projectMeeting = projectMeetingRepository.findById(id)
                .orElseThrow(() -> new ProjectMeetingNotFoundException("Réunion de projet non trouvée avec id: " + id));

        ensureProjectMeetingManagementAccess(projectMeeting.getProject(), userId);

        projectMeetingRepository.deleteById(id);
    }

    @Override
    @Transactional(readOnly = true)
    public List<ProjectMeetingResponseDTO> getProjectMeetingsByProjectId(Long projectId, String userId) {
        log.info("Retrieving meetings for project: {} for user: {}", projectId, userId);
        ensureProjectReadAccess(loadProject(projectId), userId);
        return projectMeetingRepository.findByProjectIdOrderByMeetingDateAscStartTimeAsc(projectId)
                .stream()
                .map(projectMeetingMapper::toResponseDTO)
                .toList();
    }

    @Override
    @Transactional(readOnly = true)
    public List<ProjectMeetingResponseDTO> getUpcomingProjectMeetingsByProjectId(Long projectId, String userId) {
        LocalDate today = LocalDate.now();
        log.info("Retrieving upcoming meetings for project: {} from {} for user: {}", projectId, today, userId);
        ensureProjectReadAccess(loadProject(projectId), userId);
        return projectMeetingRepository.findUpcomingByProjectId(projectId, today)
                .stream()
                .map(projectMeetingMapper::toResponseDTO)
                .toList();
    }

    @Override
    @Transactional(readOnly = true)
    public List<ProjectMeetingResponseDTO> getPastProjectMeetingsByProjectId(Long projectId, String userId) {
        LocalDate today = LocalDate.now();
        log.info("Retrieving past meetings for project: {} before {} for user: {}", projectId, today, userId);
        ensureProjectReadAccess(loadProject(projectId), userId);
        return projectMeetingRepository.findPastByProjectId(projectId, today)
                .stream()
                .map(projectMeetingMapper::toResponseDTO)
                .toList();
    }

    @Override
    @Transactional(readOnly = true)
    public List<ProjectMeetingResponseDTO> getProjectMeetingsByCreatedBy(String createdBy, String userId) {
        log.info("Retrieving meetings created by: {} for user: {}", createdBy, userId);
        return projectMeetingRepository.findByCreatedByOrderByMeetingDateAscStartTimeAsc(createdBy)
                .stream()
                .map(projectMeetingMapper::toResponseDTO)
                .toList();
    }

    private Project loadProject(Long projectId) {
        return projectRepository.findById(projectId)
                .orElseThrow(() -> new ProjectMeetingValidationException("Projet non trouvé avec id: " + projectId));
    }

    private void ensureProjectReadAccess(Project project, String userId) {
        if (!hasReadAccess(project, userId)) {
            throw new UnauthorizedException("You are not allowed to access this project meetings");
        }
    }

    private void ensureProjectMeetingCreationAccess(Project project, String userId) {
        if (!hasMeetingCreationAccess(project, userId)) {
            throw new UnauthorizedException("Only a member of a public project can create a meeting");
        }
    }

    private void ensureProjectMeetingManagementAccess(Project project, String userId) {
        if (!hasMeetingManagementAccess(project, userId)) {
            throw new UnauthorizedException("Only the project manager or an admin can modify meetings");
        }
    }

    private boolean hasReadAccess(Project project, String userId) {
        if (project == null) return false;
        if (isAdminUser(userId)) return true;

        String role = resolveUserRole(userId);
        if ("CUSTOMER".equalsIgnoreCase(role)) {
            return project.getVisibility() == com.microservices.projetservice.enums.ProjectVisibility.PUBLIC
                    && isActiveMember(project.getId(), userId);
        }

        return isProjectManager(project, userId)
                || isActiveMember(project.getId(), userId)
                || isProjectCreator(project, userId);
    }

    private boolean hasMeetingCreationAccess(Project project, String userId) {
        if (isAdminUser(userId)) return true;
        String role = resolveUserRole(userId);
        if ("CUSTOMER".equalsIgnoreCase(role)) {
            return project.getVisibility() == com.microservices.projetservice.enums.ProjectVisibility.PUBLIC
                    && isActiveMember(project.getId(), userId);
        }
        return isProjectManager(project, userId)
                || isActiveMember(project.getId(), userId)
                || isProjectCreator(project, userId);
    }

    private boolean hasMeetingManagementAccess(Project project, String userId) {
        return isAdminUser(userId) || isProjectManager(project, userId);
    }

    private boolean isProjectManager(Project project, String userId) {
        if (project == null || project.getProjectManagerId() == null || userId == null || userId.isBlank()) {
            return false;
        }
        String resolvedUserId = resolveUserIdentifier(userId);
        return project.getProjectManagerId().equalsIgnoreCase(userId.trim())
                || project.getProjectManagerId().equalsIgnoreCase(resolvedUserId);
    }

    private boolean isProjectCreator(Project project, String userId) {
        if (project == null || project.getCreatedBy() == null || userId == null || userId.isBlank()) {
            return false;
        }
        String resolvedUserId = resolveUserIdentifier(userId);
        return project.getCreatedBy().equalsIgnoreCase(userId.trim())
                || project.getCreatedBy().equalsIgnoreCase(resolvedUserId);
    }

    private boolean isActiveMember(Long projectId, String userId) {
        if (projectId == null || userId == null || userId.isBlank()) {
            return false;
        }
        String resolved = resolveUserIdentifier(userId);
        return projectMemberRepository.findByProjectIdAndUserIdAndIsActiveTrue(projectId, userId.trim()).isPresent()
                || projectMemberRepository.findByProjectIdAndUserIdAndIsActiveTrue(projectId, resolved).isPresent();
    }

    private boolean isAdminUser(String userId) {
        return "ADMIN".equalsIgnoreCase(resolveUserRole(userId));
    }

    private String resolveUserRole(String identifier) {
        UserDTO userDTO = resolveUserDTO(identifier);
        return userDTO != null && userDTO.getRole() != null ? userDTO.getRole().trim().toUpperCase() : null;
    }

    private String resolveMeetingCreator(String userId, String fallback) {
        if (userId != null && !userId.isBlank()) {
            return resolveUserIdentifier(userId);
        }
        return fallback;
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
            } catch (Exception ex) {
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
                } catch (Exception ex) {
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
}
