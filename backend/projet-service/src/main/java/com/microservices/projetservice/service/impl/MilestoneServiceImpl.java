package com.microservices.projetservice.service.impl;

import com.microservices.projetservice.dto.request.MilestoneRequestDTO;
import com.microservices.projetservice.dto.response.MilestoneResponseDTO;
import com.microservices.projetservice.entity.Milestone;
import com.microservices.projetservice.entity.Project;
import com.microservices.projetservice.enums.MilestoneStatus;
import com.microservices.projetservice.enums.ProjectVisibility;
import com.microservices.projetservice.exception.MilestoneNotFoundException;
import com.microservices.projetservice.exception.MilestoneValidationException;
import com.microservices.projetservice.exception.UnauthorizedException;
import com.microservices.projetservice.feign.UserDTO;
import com.microservices.projetservice.feign.UserServiceClient;
import com.microservices.projetservice.mapper.MilestoneMapper;
import com.microservices.projetservice.repository.MilestoneRepository;
import com.microservices.projetservice.repository.ProjectMemberRepository;
import com.microservices.projetservice.repository.ProjectRepository;
import com.microservices.projetservice.service.interfaces.MilestoneService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.util.HashSet;
import java.util.List;
import java.util.Set;

@Service
@RequiredArgsConstructor
@Slf4j
@Transactional
public class MilestoneServiceImpl implements MilestoneService {

    private final MilestoneRepository milestoneRepository;
    private final ProjectRepository projectRepository;
    private final ProjectMemberRepository projectMemberRepository;
    private final MilestoneMapper milestoneMapper;
    private final UserServiceClient userServiceClient;

    @Override
    @Transactional(readOnly = true)
    public List<MilestoneResponseDTO> getAllMilestones(String userId) {
        log.info("Retrieving all milestones for user: {}", userId);
        if (isCustomerUser(userId)) {
            return milestoneRepository.findByProjectIdIn(findAccessibleProjectIds(userId))
                    .stream()
                    .map(milestoneMapper::toResponseDTO)
                    .toList();
        }

        return milestoneRepository.findAll()
                .stream()
                .map(milestoneMapper::toResponseDTO)
                .toList();
    }

    @Override
    @Transactional(readOnly = true)
    public MilestoneResponseDTO getMilestoneById(Long id, String userId) {
        log.info("Retrieving milestone {} for user: {}", id, userId);
        Milestone milestone = milestoneRepository.findById(id)
                .orElseThrow(() -> new MilestoneNotFoundException("Milestone not found with id: " + id));
        ensureMilestoneReadAccess(milestone.getProject(), userId);
        return milestoneMapper.toResponseDTO(milestone);
    }

    @Override
    public MilestoneResponseDTO createMilestone(MilestoneRequestDTO request, String userId) {
        log.info("Creating milestone for user: {}", userId);

        validateMilestoneForCreate(request);

        if (request.getProjectId() == null) {
            throw new MilestoneValidationException("Project is required to create a milestone");
        }

        Project project = loadProject(request.getProjectId());
        ensureMilestoneWriteAccess(userId);

        Milestone milestone = milestoneMapper.toEntity(request);
        milestone.setProject(project);
        if (milestone.getStatus() == null) {
            milestone.setStatus(MilestoneStatus.PENDING);
        }
        if (milestone.getIsCritical() == null) {
            milestone.setIsCritical(false);
        }

        Milestone savedMilestone = milestoneRepository.save(milestone);
        refreshProjectProgress(project);
        return milestoneMapper.toResponseDTO(savedMilestone);
    }

    @Override
    public MilestoneResponseDTO updateMilestone(Long id, MilestoneRequestDTO request, String userId) {
        log.info("Updating milestone {} for user: {}", id, userId);

        Milestone existingMilestone = milestoneRepository.findById(id)
                .orElseThrow(() -> new MilestoneNotFoundException("Milestone not found with id: " + id));

        ensureMilestoneWriteAccess(userId);
        validateMilestoneForUpdate(request);

        if (request.getProjectId() != null
                && (existingMilestone.getProject() == null
                || !request.getProjectId().equals(existingMilestone.getProject().getId()))) {
            Project project = loadProject(request.getProjectId());
            existingMilestone.setProject(project);
        }

        milestoneMapper.updateEntity(request, existingMilestone);
        Milestone updatedMilestone = milestoneRepository.save(existingMilestone);
        refreshProjectProgress(updatedMilestone.getProject());
        return milestoneMapper.toResponseDTO(updatedMilestone);
    }

    @Override
    public void deleteMilestone(Long id, String userId) {
        log.info("Deleting milestone {} for user: {}", id, userId);

        Milestone milestone = milestoneRepository.findById(id)
                .orElseThrow(() -> new MilestoneNotFoundException("Milestone not found with id: " + id));

        ensureMilestoneWriteAccess(userId);
        milestoneRepository.deleteById(id);
        refreshProjectProgress(milestone.getProject());
    }

    @Override
    @Transactional(readOnly = true)
    public List<MilestoneResponseDTO> getMilestonesByProjectId(Long projectId, String userId) {
        log.info("Retrieving milestones for project {} and user {}", projectId, userId);
        ensureMilestoneReadAccess(loadProject(projectId), userId);
        return milestoneRepository.findByProjectId(projectId)
                .stream()
                .map(milestoneMapper::toResponseDTO)
                .toList();
    }

    @Override
    @Transactional(readOnly = true)
    public List<MilestoneResponseDTO> getMilestonesByStatus(MilestoneStatus status, String userId) {
        log.info("Retrieving milestones with status {} for user {}", status, userId);
        if (isCustomerUser(userId)) {
            return milestoneRepository.findByStatus(status)
                    .stream()
                    .filter(milestone -> hasProjectReadAccess(milestone.getProject(), userId))
                    .map(milestoneMapper::toResponseDTO)
                    .toList();
        }

        return milestoneRepository.findByStatus(status)
                .stream()
                .map(milestoneMapper::toResponseDTO)
                .toList();
    }

    @Override
    @Transactional(readOnly = true)
    public List<MilestoneResponseDTO> getCriticalMilestones(String userId) {
        log.info("Retrieving critical milestones for user {}", userId);
        if (isCustomerUser(userId)) {
            return milestoneRepository.findByIsCritical(true)
                    .stream()
                    .filter(milestone -> hasProjectReadAccess(milestone.getProject(), userId))
                    .map(milestoneMapper::toResponseDTO)
                    .toList();
        }

        return milestoneRepository.findByIsCritical(true)
                .stream()
                .map(milestoneMapper::toResponseDTO)
                .toList();
    }

    @Override
    @Transactional(readOnly = true)
    public List<MilestoneResponseDTO> getMilestonesByProjectIdAndStatus(Long projectId, MilestoneStatus status, String userId) {
        log.info("Retrieving milestones for project {} with status {} and user {}", projectId, status, userId);
        ensureMilestoneReadAccess(loadProject(projectId), userId);
        return milestoneRepository.findByProjectIdAndStatus(projectId, status)
                .stream()
                .map(milestoneMapper::toResponseDTO)
                .toList();
    }

    @Override
    @Transactional(readOnly = true)
    public List<MilestoneResponseDTO> getOverdueMilestones(String userId) {
        log.info("Retrieving overdue milestones for user {}", userId);
        LocalDate today = LocalDate.now();
        if (isCustomerUser(userId)) {
            return milestoneRepository.findByStatusAndDueDateBefore(MilestoneStatus.PENDING, today)
                    .stream()
                    .filter(milestone -> hasProjectReadAccess(milestone.getProject(), userId))
                    .map(milestoneMapper::toResponseDTO)
                    .toList();
        }

        return milestoneRepository.findByStatusAndDueDateBefore(MilestoneStatus.PENDING, today)
                .stream()
                .map(milestoneMapper::toResponseDTO)
                .toList();
    }

    @Override
    @Transactional(readOnly = true)
    public List<MilestoneResponseDTO> getUpcomingMilestones(LocalDate withinDays, String userId) {
        log.info("Retrieving upcoming milestones until {} for user {}", withinDays, userId);
        LocalDate today = LocalDate.now();
        if (isCustomerUser(userId)) {
            return milestoneRepository.findByDueDateBetween(today, withinDays)
                    .stream()
                    .filter(milestone -> hasProjectReadAccess(milestone.getProject(), userId))
                    .map(milestoneMapper::toResponseDTO)
                    .toList();
        }

        return milestoneRepository.findByDueDateBetween(today, withinDays)
                .stream()
                .map(milestoneMapper::toResponseDTO)
                .toList();
    }

    @Override
    @Transactional(readOnly = true)
    public List<MilestoneResponseDTO> getMilestonesDueBetween(LocalDate startDate, LocalDate endDate, String userId) {
        log.info("Retrieving milestones between {} and {} for user {}", startDate, endDate, userId);
        if (isCustomerUser(userId)) {
            return milestoneRepository.findByDueDateBetween(startDate, endDate)
                    .stream()
                    .filter(milestone -> hasProjectReadAccess(milestone.getProject(), userId))
                    .map(milestoneMapper::toResponseDTO)
                    .toList();
        }

        return milestoneRepository.findByDueDateBetween(startDate, endDate)
                .stream()
                .map(milestoneMapper::toResponseDTO)
                .toList();
    }

    @Override
    public MilestoneResponseDTO markAsAchieved(Long id, LocalDate actualCompletionDate, String userId) {
        log.info("Marking milestone {} as achieved on {} for user {}", id, actualCompletionDate, userId);

        Milestone milestone = milestoneRepository.findById(id)
                .orElseThrow(() -> new MilestoneNotFoundException("Milestone not found with id: " + id));

        ensureMilestoneWriteAccess(userId);
        milestone.setStatus(MilestoneStatus.ACHIEVED);
        milestone.setActualCompletionDate(actualCompletionDate);

        Milestone updatedMilestone = milestoneRepository.save(milestone);
        refreshProjectProgress(updatedMilestone.getProject());
        return milestoneMapper.toResponseDTO(updatedMilestone);
    }

    @Override
    public MilestoneResponseDTO updateStatus(Long id, MilestoneStatus status, String userId) {
        log.info("Updating status of milestone {} to {} for user {}", id, status, userId);

        Milestone milestone = milestoneRepository.findById(id)
                .orElseThrow(() -> new MilestoneNotFoundException("Milestone not found with id: " + id));

        ensureMilestoneWriteAccess(userId);
        milestone.setStatus(status);

        if (status == MilestoneStatus.ACHIEVED && milestone.getActualCompletionDate() == null) {
            milestone.setActualCompletionDate(LocalDate.now());
        }

        Milestone updatedMilestone = milestoneRepository.save(milestone);
        refreshProjectProgress(updatedMilestone.getProject());
        return milestoneMapper.toResponseDTO(updatedMilestone);
    }

    @Override
    public void updateOverdueMilestones(String userId) {
        log.info("Auto-updating overdue milestones for user {}", userId);
        ensureMilestoneWriteAccess(userId);

        LocalDate today = LocalDate.now();
        List<Milestone> overdueMilestones = milestoneRepository.findByStatusAndDueDateBefore(MilestoneStatus.PENDING, today);
        Set<Long> impactedProjectIds = new HashSet<>();

        for (Milestone milestone : overdueMilestones) {
            milestone.setStatus(MilestoneStatus.MISSED);
            if (milestone.getProject() != null && milestone.getProject().getId() != null) {
                impactedProjectIds.add(milestone.getProject().getId());
            }
        }

        if (!overdueMilestones.isEmpty()) {
            milestoneRepository.saveAll(overdueMilestones);
            log.info("{} milestones marked as missed", overdueMilestones.size());
            impactedProjectIds.forEach(projectId -> refreshProjectProgress(loadProject(projectId)));
        }
    }

    private Project loadProject(Long projectId) {
        return projectRepository.findById(projectId)
                .orElseThrow(() -> new MilestoneValidationException("Project not found with id: " + projectId));
    }

    private void ensureMilestoneReadAccess(Project project, String userId) {
        if (!hasProjectReadAccess(project, userId)) {
            throw new UnauthorizedException("You are not allowed to access this project milestones");
        }
    }

    private void ensureMilestoneWriteAccess(String userId) {
        if (isCustomerUser(userId)) {
            throw new UnauthorizedException("Customers are not allowed to create, update or delete project milestones");
        }
    }

    private void refreshProjectProgress(Project project) {
        if (project == null || project.getId() == null) {
            return;
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
        projectRepository.save(project);
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

    private void validateMilestoneForCreate(MilestoneRequestDTO request) {
        if (request.getTitle() == null || request.getTitle().trim().isEmpty()) {
            throw new MilestoneValidationException("Milestone title is required");
        }
        if (request.getDueDate() == null) {
            throw new MilestoneValidationException("Milestone due date is required");
        }
        if (request.getDueDate().isBefore(LocalDate.now())) {
            throw new MilestoneValidationException("Milestone due date cannot be in the past");
        }
    }

    private void validateMilestoneForUpdate(MilestoneRequestDTO request) {
        validateMilestoneForCreate(request);
    }

    private double roundOneDecimal(double value) {
        return Math.round(value * 10.0) / 10.0;
    }
}
