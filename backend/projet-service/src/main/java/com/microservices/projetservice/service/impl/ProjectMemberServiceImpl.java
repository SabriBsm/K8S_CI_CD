package com.microservices.projetservice.service.impl;

import com.microservices.projetservice.dto.request.ProjectMemberRequestDTO;
import com.microservices.projetservice.dto.response.ProjectMemberResponseDTO;
import com.microservices.projetservice.entity.Project;
import com.microservices.projetservice.entity.ProjectMember;
import com.microservices.projetservice.enums.NotificationType;
import com.microservices.projetservice.exception.ProjectNotFoundException;
import com.microservices.projetservice.feign.UserDTO;
import com.microservices.projetservice.feign.UserServiceClient;
import com.microservices.projetservice.mapper.ProjectMemberMapper;
import com.microservices.projetservice.exception.UnauthorizedException;
import com.microservices.projetservice.repository.ProjectRepository;
import com.microservices.projetservice.repository.ProjectMemberRepository;
import com.microservices.projetservice.service.interfaces.ProjectNotificationService;
import com.microservices.projetservice.service.interfaces.ProjectMemberService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.util.ArrayList;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Optional;

@Service
@RequiredArgsConstructor
@Slf4j
@Transactional
public class ProjectMemberServiceImpl implements ProjectMemberService {

    private final ProjectMemberRepository projectMemberRepository;
    private final ProjectRepository projectRepository;
    private final ProjectMemberMapper projectMemberMapper;
    private final UserServiceClient userServiceClient;
    private final ProjectNotificationService projectNotificationService;

    @Override
    public ProjectMemberResponseDTO addMember(ProjectMemberRequestDTO request, String projectManagerId) {
        log.info("Adding member {} to project {} by project manager {}",
                request.getUserEmail(), request.getProjectId(), projectManagerId);

        // Validate input - userEmail now contains a user identifier
        if (request.getUserEmail() == null || request.getUserEmail().trim().isEmpty()) {
            log.warn("User ID/email is empty");
            throw new IllegalArgumentException("User ID/email cannot be empty");
        }

        String userId = resolveRequiredUserId(request.getUserEmail().trim());
        String memberRole = resolveMemberRole(request.getUserEmail().trim());
        if ("CUSTOMER".equalsIgnoreCase(memberRole)) {
            userId = resolveRequiredCustomerUserId(request.getUserEmail().trim());
        }

        // Check project exists
        Project project = projectRepository.findById(request.getProjectId())
                .orElseThrow(() -> {
                    log.error("Project not found with id: {}", request.getProjectId());
                    return new IllegalArgumentException("Project not found with id: " + request.getProjectId());
                });

        // Check authorization: project manager or admin can add members
        if (!isProjectManager(project, projectManagerId) && !isAdmin(projectManagerId)) {
            log.warn("User {} is not authorized to add members to project {}", projectManagerId, request.getProjectId());
            throw new IllegalArgumentException("Only the project manager or admin can add members to this project");
        }

        // Check if member already exists and is active
        var existingMember = findMemberByAnyIdentifier(request.getProjectId(), request.getUserEmail().trim());
        if (existingMember.isPresent()) {
            ProjectMember member = existingMember.get();
            if (member.getIsActive() != null && member.getIsActive()) {
                log.warn("User {} is already an active member of project {}", userId, request.getProjectId());
                throw new IllegalArgumentException("User is already a member of this project");
            }
            // Reactivate inactive member with new role
            log.info("Reactivating member {} in project {} with role {}", userId, request.getProjectId(), memberRole);
            member.setIsActive(true);
            member.setUserId(userId);
            member.setRole(memberRole);
            ProjectMember savedMember = projectMemberRepository.save(member);
            createMemberAddedNotification(project, savedMember.getUserId(), memberRole, projectManagerId);
            if ("CUSTOMER".equalsIgnoreCase(memberRole)) {
                synchronizeCustomerAssignment(project, savedMember.getUserId());
            }
            return toResponseDTO(savedMember);
        }

        // Create new member - store the real user id in user_id
        log.info("Creating new member {} in project {} with role {}", userId, request.getProjectId(), memberRole);
        ProjectMember member = ProjectMember.builder()
                .project(project)
                .userId(userId)
                .role(memberRole)
                .isActive(true)
                .build();

        ProjectMember savedMember = projectMemberRepository.save(member);
        createMemberAddedNotification(project, savedMember.getUserId(), memberRole, projectManagerId);

        // If this is a CUSTOMER role, set it as the project's customer
        if ("CUSTOMER".equalsIgnoreCase(memberRole)) {
            log.info("Setting member {} as customer for project {}", userId, request.getProjectId());
            synchronizeCustomerAssignment(project, userId);
        }

        log.info("Member {} successfully added to project {}", userId, request.getProjectId());
        return toResponseDTO(savedMember);
    }

    @Override
    public void removeMember(Long projectId, String userId, String projectManagerId) {
        log.info("Removing member {} from project {} by project manager {}",
                userId, projectId, projectManagerId);

        // Check authorization: project manager or admin can remove members
        Project project = projectRepository.findById(projectId)
                .orElseThrow(() -> new ProjectNotFoundException("Project not found with id: " + projectId));

        if (!isProjectManager(project, projectManagerId) && !isAdmin(projectManagerId)) {
            throw new UnauthorizedException("Only the project manager or admin can remove members from this project");
        }

        ProjectMember member = findMemberByAnyIdentifier(projectId, userId)
                .orElseThrow(() -> new IllegalArgumentException("Member does not exist"));

        // If removing a customer member, clear the project's customerId
        if ("CUSTOMER".equalsIgnoreCase(member.getRole()) && project.getCustomerId() != null && matchesAnyIdentifier(project.getCustomerId(), userId)) {
            log.info("Removing customer member {} from project {}, clearing project customerId", userId, projectId);
            project.setCustomerId(null);
            projectRepository.save(project);
        }

        // Soft delete (mark as inactive)
        member.setIsActive(false);
        projectMemberRepository.save(member);
    }

    @Override
    @Transactional(readOnly = true)
    public List<ProjectMemberResponseDTO> getProjectMembers(Long projectId) {
        log.info("Retrieving members of project {}", projectId);

        // Check project exists
        projectRepository.findById(projectId)
                .orElseThrow(() -> new ProjectNotFoundException("Project not found with id: " + projectId));

        return projectMemberRepository.findByProjectId(projectId).stream()
                .filter(m -> m.getIsActive() != null && m.getIsActive())
                .map(this::toResponseDTO)
                .toList();
    }

    @Override
    @Transactional(readOnly = true)
    public List<ProjectMemberResponseDTO> getUserProjects(String userId) {
        log.info("Retrieving projects of user {}", userId);

        return findMembersByAnyIdentifier(userId).stream()
                .map(this::toResponseDTO)
                .toList();
    }

    @Override
    @Transactional(readOnly = true)
    public boolean isMember(Long projectId, String userId) {
        return findMemberByAnyIdentifier(projectId, userId)
                .filter(member -> member.getIsActive() != null && member.getIsActive())
                .isPresent();
    }

    @Override
    public void assignProjectManager(Long projectId, String userId) {
        log.info("Assigning project manager {} to project {}", userId, projectId);

        Project project = projectRepository.findById(projectId)
                .orElseThrow(() -> new ProjectNotFoundException("Project not found with id: " + projectId));

        project.setProjectManagerId(resolveRequiredUserId(userId));
        projectRepository.save(project);
    }

    @Override
    public ProjectMemberResponseDTO updateMemberRole(Long projectId, String userId, String newRole) {
        log.info("Updating role of member {} in project {} to {}", userId, projectId, newRole);

        String normalizedUserId = resolveUserIdentifier(userId);
        if ("CUSTOMER".equalsIgnoreCase(newRole)) {
            normalizedUserId = resolveRequiredCustomerUserId(userId);
        }

        Project project = projectRepository.findById(projectId)
                .orElseThrow(() -> new ProjectNotFoundException("Project not found with id: " + projectId));

        ProjectMember member = findMemberByAnyIdentifier(projectId, userId)
                .orElseThrow(() -> new IllegalArgumentException("Member does not exist"));

        String previousRole = member.getRole();
        member.setUserId(normalizedUserId);
        member.setRole(newRole);
        ProjectMember updatedMember = projectMemberRepository.save(member);

        if ("CUSTOMER".equalsIgnoreCase(newRole)) {
            synchronizeCustomerAssignment(project, normalizedUserId);
        } else if ("CUSTOMER".equalsIgnoreCase(previousRole) && project.getCustomerId() != null && matchesAnyIdentifier(project.getCustomerId(), normalizedUserId)) {
            project.setCustomerId(null);
            projectRepository.save(project);
        }

        return toResponseDTO(updatedMember);
    }

    @Override
    @Transactional(readOnly = true)
    public List<ProjectMemberResponseDTO> getManagedProjects(String userId) {
        log.info("Retrieving projects managed by {}", userId);

        return findMembersByAnyIdentifier(userId).stream()
                .filter(m -> "PROJECT_MANAGER".equalsIgnoreCase(m.getRole()))
                .map(this::toResponseDTO)
                .toList();
    }

    // ============================================
    // HELPER METHODS
    // ============================================

    /**
     * Check if a user is the project manager
     */
    private boolean isProjectManager(Project project, String userId) {
        return project.getProjectManagerId() != null && 
               project.getProjectManagerId().equals(userId);
    }

    /**
     * Check if a user is an admin
     */
    private boolean isAdmin(String userId) {
        if (userId == null || userId.isBlank()) {
            return false;
        }

        String trimmed = userId.trim();
        if ("admin".equalsIgnoreCase(trimmed) || "system".equalsIgnoreCase(trimmed)) {
            return true;
        }

        return "ADMIN".equalsIgnoreCase(resolveUserRole(trimmed));
    }

    private String resolveUserRole(String identifier) {
        UserDTO userDTO = resolveUserDTO(identifier);
        if (userDTO != null && userDTO.getRole() != null && !userDTO.getRole().isBlank()) {
            return userDTO.getRole().trim().toUpperCase();
        }
        return null;
    }

    private Optional<ProjectMember> findMemberByAnyIdentifier(Long projectId, String identifier) {
        for (String candidate : getIdentifierCandidates(identifier)) {
            Optional<ProjectMember> member = projectMemberRepository.findByProjectIdAndUserId(projectId, candidate);
            if (member.isPresent()) {
                return member;
            }
        }
        return Optional.empty();
    }

    private List<ProjectMember> findMembersByAnyIdentifier(String identifier) {
        LinkedHashSet<ProjectMember> members = new LinkedHashSet<>();
        for (String candidate : getIdentifierCandidates(identifier)) {
            members.addAll(projectMemberRepository.findByUserId(candidate));
        }
        return new ArrayList<>(members);
    }

    private List<String> getIdentifierCandidates(String identifier) {
        LinkedHashSet<String> candidates = new LinkedHashSet<>();
        if (identifier == null || identifier.isBlank()) {
            return List.of();
        }

        String trimmed = identifier.trim();
        candidates.add(trimmed);

        String resolved = resolveUserIdentifier(trimmed);
        if (resolved != null && !resolved.isBlank()) {
            candidates.add(resolved.trim());
        }

        return new ArrayList<>(candidates);
    }

    private boolean matchesAnyIdentifier(String storedIdentifier, String identifier) {
        if (storedIdentifier == null || storedIdentifier.isBlank()) {
            return false;
        }

        for (String candidate : getIdentifierCandidates(identifier)) {
            if (storedIdentifier.equalsIgnoreCase(candidate)) {
                return true;
            }
        }
        return false;
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

    private String resolveRequiredUserId(String identifier) {
        if (identifier == null || identifier.isBlank()) {
            throw new IllegalArgumentException("User identifier cannot be empty");
        }

        String trimmed = identifier.trim();
        if (trimmed.matches("\\d+")) {
            return trimmed;
        }

        UserDTO userDTO = resolveUserDTO(trimmed);
        if (userDTO != null && userDTO.getId() != null && !userDTO.getId().isBlank()) {
            return userDTO.getId().trim();
        }

        throw new IllegalArgumentException("Unable to resolve user identifier to a valid user id: " + identifier);
    }

    private String resolveMemberRole(String identifier) {
        try {
            UserDTO userDTO = resolveUserDTO(identifier);
            if (userDTO != null && userDTO.getRole() != null && !userDTO.getRole().isBlank()) {
                return normalizeMemberRole(userDTO.getRole());
            }
        } catch (Exception e) {
            log.debug("Unable to resolve role for user '{}' , defaulting to PROJECT_MEMBER", identifier, e);
        }

        return "PROJECT_MEMBER";
    }

    private String normalizeMemberRole(String role) {
        if (role == null || role.isBlank()) {
            return "PROJECT_MEMBER";
        }

       return switch (role.trim().toUpperCase()) {
           case "PROJECT_MANAGER", "CUSTOMER", "ADMIN", "PROJECT_MEMBER" -> role.trim().toUpperCase();
           case "MEMBER" -> "PROJECT_MEMBER";
           default -> role.trim().toUpperCase();
       };
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

    private String resolveRequiredCustomerUserId(String identifier) {
        String userId = resolveRequiredUserId(identifier);
        UserDTO userDTO = resolveUserDTO(userId);
        if (userDTO == null || userDTO.getRole() == null || !"CUSTOMER".equalsIgnoreCase(userDTO.getRole())) {
            throw new IllegalArgumentException("Selected customer must be a user with role CUSTOMER");
        }
        return userId;
    }

    private void synchronizeCustomerAssignment(Project project, String customerUserId) {
        List<ProjectMember> projectMembers = projectMemberRepository.findByProjectId(project.getId());

        projectMembers.stream()
                .filter(m -> "CUSTOMER".equalsIgnoreCase(m.getRole()))
                .filter(m -> !matchesAnyIdentifier(m.getUserId(), customerUserId))
                .forEach(m -> {
                    m.setIsActive(false);
                    projectMemberRepository.save(m);
                });

        project.setCustomerId(customerUserId);
        projectRepository.save(project);
    }

    private ProjectMemberResponseDTO toResponseDTO(ProjectMember member) {
        ProjectMemberResponseDTO responseDTO = projectMemberMapper.toResponseDTO(member);
        responseDTO.setUserId(resolveUserIdentifier(member.getUserId()));
        return responseDTO;
    }

    private void createMemberAddedNotification(Project project, String userId, String role, String initiatorUserId) {
        try {
            Long numericUserId = Long.valueOf(resolveUserIdentifier(userId));
            String projectName = project.getName() != null && !project.getName().isBlank() ? project.getName() : "your project";
            String normalizedRole = role != null && !role.isBlank() ? role.toUpperCase() : "MEMBER";
            String message = "You have been added to project '" + projectName + "' as " + normalizedRole + ".";
            projectNotificationService.createMemberAddedNotification(project.getId(), numericUserId, message);
        } catch (Exception ex) {
            log.warn("Unable to create notification for member {} added to project {}", userId, project.getId(), ex);
        }
    }
}
