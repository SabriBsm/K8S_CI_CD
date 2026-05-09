package com.microservices.projetservice.service.impl;

import com.microservices.projetservice.dto.request.ProjectNotificationRequestDTO;
import com.microservices.projetservice.dto.response.ProjectNotificationResponseDTO;
import com.microservices.projetservice.entity.Project;
import com.microservices.projetservice.entity.ProjectNotification;
import com.microservices.projetservice.enums.NotificationType;
import com.microservices.projetservice.enums.ProjectVisibility;
import com.microservices.projetservice.exception.ProjectNotificationNotFoundException;
import com.microservices.projetservice.exception.ProjectNotificationValidationException;
import com.microservices.projetservice.exception.UnauthorizedException;
import com.microservices.projetservice.feign.UserDTO;
import com.microservices.projetservice.feign.UserServiceClient;
import com.microservices.projetservice.mapper.ProjectNotificationMapper;
import com.microservices.projetservice.repository.ProjectMemberRepository;
import com.microservices.projetservice.repository.ProjectNotificationRepository;
import com.microservices.projetservice.repository.ProjectRepository;
import com.microservices.projetservice.service.interfaces.ProjectNotificationService;
import com.microservices.projetservice.service.ProjectNotificationEmailService;
import com.microservices.projetservice.validator.ProjectNotificationValidator;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;

@Service
@RequiredArgsConstructor
@Slf4j
@Transactional
public class ProjectNotificationServiceImpl implements ProjectNotificationService {

    private final ProjectNotificationRepository projectNotificationRepository;
    private final ProjectRepository projectRepository;
    private final ProjectMemberRepository projectMemberRepository;
    private final ProjectNotificationMapper projectNotificationMapper;
    private final ProjectNotificationValidator projectNotificationValidator;
    private final UserServiceClient userServiceClient;
    private final ProjectNotificationEmailService projectNotificationEmailService;

    @Override
    @Transactional(readOnly = true)
    public List<ProjectNotificationResponseDTO> getAllProjectNotifications(String userId) {
        log.info("Récupération de toutes les notifications de projet pour l'utilisateur: {}", userId);
        if (isCustomerUser(userId)) {
            return projectNotificationRepository.findByProjectIdIn(findAccessibleProjectIds(userId))
                    .stream()
                    .map(projectNotificationMapper::toResponseDTO)
                    .toList();
        }

        return projectNotificationRepository.findAll()
                .stream()
                .map(projectNotificationMapper::toResponseDTO)
                .toList();
    }

    @Override
    @Transactional(readOnly = true)
    public ProjectNotificationResponseDTO getProjectNotificationById(Long id, String userId) {
        log.info("Récupération de la notification de projet avec id: {} pour l'utilisateur: {}", id, userId);
        ProjectNotification projectNotification = projectNotificationRepository.findById(id)
                .orElseThrow(() -> new ProjectNotificationNotFoundException("Notification de projet non trouvée avec id: " + id));
        ensureNotificationReadAccess(projectNotification.getProject(), userId);
        return projectNotificationMapper.toResponseDTO(projectNotification);
    }

    @Override
    public ProjectNotificationResponseDTO createProjectNotification(ProjectNotificationRequestDTO request, String userId) {
        log.info("Création d'une nouvelle notification de projet pour l'utilisateur: {}", userId);

        validateNotificationWriteAccess(userId);
        projectNotificationValidator.validateForCreate(request);

        Project project = loadProject(request.getProjectId());
        return saveNotification(project, request.getUserId(), request.getMessage(), request.getType(), request.getIsRead());
    }

    @Override
    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public ProjectNotificationResponseDTO createMemberAddedNotification(Long projectId, Long userId, String message) {
        log.info("Création d'une notification d'ajout de membre pour le projet {} et l'utilisateur {}", projectId, userId);

        Project project = loadProject(projectId);
        return saveNotification(project, userId, message, NotificationType.TEAM_CHANGE, false);
    }

    @Override
    public void notifyProjectMembers(Long projectId, String initiatorUserId, String message, NotificationType type) {
        log.info("Diffusion d'une notification de type {} pour le projet {} en excluant l'initiateur {}", type, projectId, initiatorUserId);

        Project project = loadProject(projectId);
        String normalizedInitiator = resolveUserIdentifier(initiatorUserId);

        projectMemberRepository.findByProjectId(projectId).stream()
                .filter(member -> Boolean.TRUE.equals(member.getIsActive()))
                .filter(member -> !isSameUserIdentifier(member.getUserId(), normalizedInitiator))
                .forEach(member -> {
                    Long recipientUserId = resolveNumericUserId(member.getUserId());
                    if (recipientUserId == null) {
                        log.warn("Impossible de résoudre l'identifiant du membre {} pour la notification du projet {}", member.getUserId(), projectId);
                        return;
                    }
                    saveNotification(project, recipientUserId, message, type, false);
                });
    }

    @Override
    public String sendNotificationByEmail(Long notificationId, String userId) {
        log.info("Envoi d'un email pour la notification {} par l'utilisateur {}", notificationId, userId);

        validateNotificationWriteAccess(userId);
        ProjectNotification notification = projectNotificationRepository.findById(notificationId)
                .orElseThrow(() -> new ProjectNotificationNotFoundException("Notification de projet non trouvée avec id: " + notificationId));

        Project project = notification.getProject();
        UserDTO recipient = resolveUserDTO(notification.getUserId() != null ? notification.getUserId().toString() : null);
        if (recipient == null || recipient.getEmail() == null || recipient.getEmail().isBlank()) {
            throw new ProjectNotificationValidationException("Impossible de résoudre l'adresse email du destinataire");
        }

        String recipientName = buildRecipientName(recipient);
        String projectName = project != null && project.getName() != null && !project.getName().isBlank() ? project.getName() : "your project";
        projectNotificationEmailService.sendProjectNotificationEmail(recipient.getEmail(), recipientName, projectName, notification.getMessage());

        String recipientLabel = buildRecipientLabel(recipient, notification.getUserId());
        return "Notification sent by mail to \"" + recipientLabel + "\"";
    }

    @Override
    public ProjectNotificationResponseDTO updateProjectNotification(Long id, ProjectNotificationRequestDTO request, String userId) {
        log.info("Mise à jour de la notification de projet avec id: {} pour l'utilisateur: {}", id, userId);

        validateNotificationWriteAccess(userId);
        ProjectNotification existingProjectNotification = projectNotificationRepository.findById(id)
                .orElseThrow(() -> new ProjectNotificationNotFoundException("Notification de projet non trouvée avec id: " + id));

        projectNotificationValidator.validateForUpdate(request, existingProjectNotification);
        projectNotificationMapper.updateEntity(request, existingProjectNotification);

        ProjectNotification updatedProjectNotification = projectNotificationRepository.save(existingProjectNotification);
        return projectNotificationMapper.toResponseDTO(updatedProjectNotification);
    }

    @Override
    public void deleteProjectNotification(Long id, String userId) {
        log.info("Suppression de la notification de projet avec id: {} pour l'utilisateur: {}", id, userId);

        validateNotificationWriteAccess(userId);
        projectNotificationRepository.findById(id)
                .orElseThrow(() -> new ProjectNotificationNotFoundException("Notification de projet non trouvée avec id: " + id));

        projectNotificationRepository.deleteById(id);
    }

    @Override
    @Transactional(readOnly = true)
    public List<ProjectNotificationResponseDTO> getProjectNotificationsByProjectId(Long projectId, String userId) {
        log.info("Récupération des notifications pour le projet: {} et l'utilisateur: {}", projectId, userId);
        ensureNotificationReadAccess(loadProject(projectId), userId);
        return projectNotificationRepository.findByProjectId(projectId)
                .stream()
                .map(projectNotificationMapper::toResponseDTO)
                .toList();
    }

    @Override
    @Transactional(readOnly = true)
    public List<ProjectNotificationResponseDTO> getProjectNotificationsByUserId(Long userId, String callerUserId) {
        log.info("Récupération des notifications pour l'utilisateur: {} demandées par: {}", userId, callerUserId);
        ensureUserScopedAccess(userId, callerUserId);
        return projectNotificationRepository.findByUserId(userId)
                .stream()
                .filter(notification -> hasProjectReadAccess(notification.getProject(), callerUserId))
                .map(projectNotificationMapper::toResponseDTO)
                .toList();
    }

    @Override
    @Transactional(readOnly = true)
    public List<ProjectNotificationResponseDTO> getProjectNotificationsByType(NotificationType type, String userId) {
        log.info("Récupération des notifications de type: {} pour l'utilisateur: {}", type, userId);
        if (isCustomerUser(userId)) {
            return projectNotificationRepository.findByType(type)
                    .stream()
                    .filter(notification -> hasProjectReadAccess(notification.getProject(), userId))
                    .map(projectNotificationMapper::toResponseDTO)
                    .toList();
        }

        return projectNotificationRepository.findByType(type)
                .stream()
                .map(projectNotificationMapper::toResponseDTO)
                .toList();
    }

    @Override
    @Transactional(readOnly = true)
    public List<ProjectNotificationResponseDTO> getProjectNotificationsByIsRead(Boolean isRead, String userId) {
        log.info("Récupération des notifications avec statut lu: {} pour l'utilisateur: {}", isRead, userId);
        if (isCustomerUser(userId)) {
            return projectNotificationRepository.findByIsRead(isRead)
                    .stream()
                    .filter(notification -> hasProjectReadAccess(notification.getProject(), userId))
                    .map(projectNotificationMapper::toResponseDTO)
                    .toList();
        }

        return projectNotificationRepository.findByIsRead(isRead)
                .stream()
                .map(projectNotificationMapper::toResponseDTO)
                .toList();
    }

    @Override
    @Transactional(readOnly = true)
    public List<ProjectNotificationResponseDTO> getUnreadNotificationsByProjectId(Long projectId, String userId) {
        log.info("Récupération des notifications non lues pour le projet: {} et l'utilisateur: {}", projectId, userId);
        ensureNotificationReadAccess(loadProject(projectId), userId);
        return projectNotificationRepository.findByProjectIdAndIsRead(projectId, false)
                .stream()
                .map(projectNotificationMapper::toResponseDTO)
                .toList();
    }

    @Override
    @Transactional(readOnly = true)
    public List<ProjectNotificationResponseDTO> getUnreadNotificationsByUserId(Long userId, String callerUserId) {
        log.info("Récupération des notifications non lues pour l'utilisateur: {} demandées par: {}", userId, callerUserId);
        ensureUserScopedAccess(userId, callerUserId);
        return projectNotificationRepository.findByUserIdAndIsRead(userId, false)
                .stream()
                .filter(notification -> hasProjectReadAccess(notification.getProject(), callerUserId))
                .map(projectNotificationMapper::toResponseDTO)
                .toList();
    }

    @Override
    public ProjectNotificationResponseDTO markAsRead(Long id, String userId) {
        log.info("Marquage de la notification {} comme lue pour l'utilisateur: {}", id, userId);

        validateNotificationWriteAccess(userId);
        ProjectNotification projectNotification = projectNotificationRepository.findById(id)
                .orElseThrow(() -> new ProjectNotificationNotFoundException("Notification de projet non trouvée avec id: " + id));

        projectNotification.setIsRead(true);
        ProjectNotification updatedNotification = projectNotificationRepository.save(projectNotification);
        return projectNotificationMapper.toResponseDTO(updatedNotification);
    }

    @Override
    public void markAllAsReadByUserId(Long userId, String callerUserId) {
        log.info("Marquage de toutes les notifications comme lues pour l'utilisateur: {} demandées par: {}", userId, callerUserId);

        ensureUserScopedAccess(userId, callerUserId);
        validateNotificationWriteAccess(callerUserId);
        List<ProjectNotification> unreadNotifications = projectNotificationRepository.findByUserIdAndIsRead(userId, false);
        unreadNotifications.forEach(notification -> notification.setIsRead(true));
        projectNotificationRepository.saveAll(unreadNotifications);
    }

    @Override
    public void markAllAsReadByProjectId(Long projectId, String userId) {
        log.info("Marquage de toutes les notifications comme lues pour le projet: {} et l'utilisateur: {}", projectId, userId);

        validateNotificationWriteAccess(userId);
        Project project = loadProject(projectId);
        ensureNotificationReadAccess(project, userId);
        List<ProjectNotification> unreadNotifications = projectNotificationRepository.findByProjectIdAndIsRead(projectId, false);
        unreadNotifications.forEach(notification -> notification.setIsRead(true));
        projectNotificationRepository.saveAll(unreadNotifications);
    }

    private Project loadProject(Long projectId) {
        return projectRepository.findById(projectId)
                .orElseThrow(() -> new ProjectNotificationValidationException("Projet non trouvé avec id: " + projectId));
    }

    private ProjectNotificationResponseDTO saveNotification(Project project, Long userId, String message, NotificationType type, Boolean isRead) {
        ProjectNotification projectNotification = ProjectNotification.builder()
                .project(project)
                .userId(userId)
                .message(message)
                .type(type)
                .isRead(isRead != null ? isRead : Boolean.FALSE)
                .reminderSent(false)
                .createdAt(LocalDateTime.now())
                .build();

        ProjectNotification savedProjectNotification = projectNotificationRepository.save(projectNotification);
        return projectNotificationMapper.toResponseDTO(savedProjectNotification);
    }

    private String buildRecipientName(UserDTO recipient) {
        if (recipient == null) {
            return "User";
        }

        String firstName = recipient.getFirstName() != null ? recipient.getFirstName().trim() : "";
        String lastName = recipient.getLastName() != null ? recipient.getLastName().trim() : "";
        String fullName = (firstName + " " + lastName).trim();
        if (!fullName.isBlank()) {
            return fullName;
        }

        if (recipient.getUsername() != null && !recipient.getUsername().isBlank()) {
            return recipient.getUsername().trim();
        }

        return recipient.getEmail() != null && !recipient.getEmail().isBlank() ? recipient.getEmail().trim() : "User";
    }

    private String buildRecipientLabel(UserDTO recipient, Long userId) {
        if (recipient == null) {
            return userId != null ? userId.toString() : "User";
        }

        if (recipient.getUsername() != null && !recipient.getUsername().isBlank()) {
            return recipient.getUsername().trim();
        }

        if (recipient.getEmail() != null && !recipient.getEmail().isBlank()) {
            return recipient.getEmail().trim();
        }

        return userId != null ? userId.toString() : "User";
    }

    private Long resolveNumericUserId(String identifier) {
        if (identifier == null || identifier.isBlank()) {
            return null;
        }

        String resolved = resolveUserIdentifier(identifier);
        try {
            return Long.valueOf(resolved.trim());
        } catch (Exception ex) {
            return null;
        }
    }

    private boolean isSameUserIdentifier(String storedIdentifier, String candidateIdentifier) {
        if (storedIdentifier == null || storedIdentifier.isBlank() || candidateIdentifier == null || candidateIdentifier.isBlank()) {
            return false;
        }

        if (storedIdentifier.equalsIgnoreCase(candidateIdentifier)) {
            return true;
        }

        String normalizedStored = resolveUserIdentifier(storedIdentifier);
        String normalizedCandidate = resolveUserIdentifier(candidateIdentifier);
        return normalizedStored.equalsIgnoreCase(normalizedCandidate);
    }

    private void ensureNotificationReadAccess(Project project, String userId) {
        if (!hasProjectReadAccess(project, userId)) {
            throw new UnauthorizedException("You are not allowed to access this project notifications");
        }
    }

    private void ensureUserScopedAccess(Long targetUserId, String callerUserId) {
        if (!isCustomerUser(callerUserId)) {
            return;
        }
        Long callerResolvedId = resolveNumericUserId(callerUserId);
        if (callerResolvedId == null || !callerResolvedId.equals(targetUserId)) {
            throw new UnauthorizedException("Customers can only access their own notifications");
        }
    }

    private void validateNotificationWriteAccess(String userId) {
        if (isCustomerUser(userId)) {
            throw new UnauthorizedException("Customers are not allowed to create, update or delete project notifications");
        }
    }

    private boolean hasProjectReadAccess(Project project, String userId) {
        if (project == null) {
            return false;
        }
        if (!isCustomerUser(userId)) {
            return true;
        }
        return project.getVisibility() == ProjectVisibility.PUBLIC && isActiveMember(project.getId(), userId);
    }

    private boolean isCustomerUser(String userId) {
        return "CUSTOMER".equalsIgnoreCase(resolveUserRole(userId));
    }

    private boolean isActiveMember(Long projectId, String userId) {
        if (projectId == null || userId == null || userId.isBlank()) {
            return false;
        }
        String resolved = resolveUserIdentifier(userId);
        return projectMemberRepository.findByProjectIdAndUserIdAndIsActiveTrue(projectId, userId.trim()).isPresent()
                || projectMemberRepository.findByProjectIdAndUserIdAndIsActiveTrue(projectId, resolved).isPresent();
    }

    private List<Long> findAccessibleProjectIds(String userId) {
        return projectRepository.findAll().stream()
                .filter(project -> hasProjectReadAccess(project, userId))
                .map(Project::getId)
                .toList();
    }

    private String resolveUserRole(String identifier) {
        UserDTO userDTO = resolveUserDTO(identifier);
        return userDTO != null && userDTO.getRole() != null ? userDTO.getRole().trim().toUpperCase() : null;
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
        UserDTO userDTO = resolveUserDTO(identifier);
        if (userDTO != null && userDTO.getId() != null && !userDTO.getId().isBlank()) {
            return userDTO.getId().trim();
        }
        return identifier.trim();
    }

}
