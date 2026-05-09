package com.microservices.projetservice.service.impl;

import com.microservices.projetservice.dto.request.ProjectDocumentRequestDTO;
import com.microservices.projetservice.dto.response.ProjectDocumentResponseDTO;
import com.microservices.projetservice.entity.Project;
import com.microservices.projetservice.entity.ProjectDocument;
import com.microservices.projetservice.enums.ProjectDocumentType;
import com.microservices.projetservice.enums.ProjectVisibility;
import com.microservices.projetservice.exception.ProjectDocumentNotFoundException;
import com.microservices.projetservice.exception.ProjectDocumentValidationException;
import com.microservices.projetservice.exception.UnauthorizedException;
import com.microservices.projetservice.feign.UserDTO;
import com.microservices.projetservice.feign.UserServiceClient;
import com.microservices.projetservice.mapper.ProjectDocumentMapper;
import com.microservices.projetservice.repository.ProjectDocumentRepository;
import com.microservices.projetservice.repository.ProjectMemberRepository;
import com.microservices.projetservice.repository.ProjectRepository;
import com.microservices.projetservice.service.interfaces.ProjectDocumentService;
import com.microservices.projetservice.validator.ProjectDocumentValidator;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;

@Service
@RequiredArgsConstructor
@Slf4j
@Transactional
public class ProjectDocumentServiceImpl implements ProjectDocumentService {

    private final ProjectDocumentRepository projectDocumentRepository;
    private final ProjectRepository projectRepository;
    private final ProjectMemberRepository projectMemberRepository;
    private final ProjectDocumentMapper projectDocumentMapper;
    private final ProjectDocumentValidator projectDocumentValidator;
    private final UserServiceClient userServiceClient;

    @Override
    @Transactional(readOnly = true)
    public List<ProjectDocumentResponseDTO> getAllProjectDocuments(String userId) {
        log.info("Récupération de tous les documents de projet pour l'utilisateur: {}", userId);
        if (isCustomerUser(userId)) {
            return projectDocumentRepository.findByProjectIdIn(findAccessibleProjectIds(userId))
                    .stream()
                    .map(projectDocumentMapper::toResponseDTO)
                    .toList();
        }

        return projectDocumentRepository.findAll()
                .stream()
                .map(projectDocumentMapper::toResponseDTO)
                .toList();
    }

    @Override
    @Transactional(readOnly = true)
    public ProjectDocumentResponseDTO getProjectDocumentById(Long id, String userId) {
        log.info("Récupération du document de projet avec id: {} pour l'utilisateur: {}", id, userId);
        ProjectDocument projectDocument = projectDocumentRepository.findById(id)
                .orElseThrow(() -> new ProjectDocumentNotFoundException("Document de projet non trouvé avec id: " + id));
        ensureDocumentReadAccess(projectDocument.getProject(), userId);
        return projectDocumentMapper.toResponseDTO(projectDocument);
    }

    @Override
    public ProjectDocumentResponseDTO createProjectDocument(ProjectDocumentRequestDTO request, String userId) {
        log.info("Création d'un nouveau document de projet pour l'utilisateur: {}", userId);

        ensureUploadedBy(request, userId, null);
        projectDocumentValidator.validateForCreate(request);

        Project project = loadProject(request.getProjectId());
        ensureDocumentWriteAccess(project, userId);

        ProjectDocument projectDocument = projectDocumentMapper.toEntity(request);
        projectDocument.setProject(project);
        if (projectDocument.getUploadedAt() == null) {
            projectDocument.setUploadedAt(LocalDateTime.now());
        }

        ProjectDocument savedProjectDocument = projectDocumentRepository.save(projectDocument);
        return projectDocumentMapper.toResponseDTO(savedProjectDocument);
    }

    @Override
    public ProjectDocumentResponseDTO updateProjectDocument(Long id, ProjectDocumentRequestDTO request, String userId) {
        log.info("Mise à jour du document de projet avec id: {} pour l'utilisateur: {}", id, userId);

        ProjectDocument existingProjectDocument = projectDocumentRepository.findById(id)
                .orElseThrow(() -> new ProjectDocumentNotFoundException("Document de projet non trouvé avec id: " + id));

        ensureUploadedBy(request, userId, existingProjectDocument.getUploadedBy());
        ensureDocumentWriteAccess(existingProjectDocument.getProject(), userId);
        projectDocumentValidator.validateForUpdate(request, existingProjectDocument);

        if (request.getProjectId() != null && (existingProjectDocument.getProject() == null || !request.getProjectId().equals(existingProjectDocument.getProject().getId()))) {
            Project project = loadProject(request.getProjectId());
            ensureDocumentWriteAccess(project, userId);
            existingProjectDocument.setProject(project);
        }

        projectDocumentMapper.updateEntity(request, existingProjectDocument);
        ProjectDocument updatedProjectDocument = projectDocumentRepository.save(existingProjectDocument);
        return projectDocumentMapper.toResponseDTO(updatedProjectDocument);
    }

    @Override
    public void deleteProjectDocument(Long id, String userId) {
        log.info("Suppression du document de projet avec id: {} pour l'utilisateur: {}", id, userId);

        ProjectDocument projectDocument = projectDocumentRepository.findById(id)
                .orElseThrow(() -> new ProjectDocumentNotFoundException("Document de projet non trouvé avec id: " + id));

        ensureDocumentWriteAccess(projectDocument.getProject(), userId);
        projectDocumentRepository.deleteById(id);
    }

    @Override
    @Transactional(readOnly = true)
    public List<ProjectDocumentResponseDTO> getProjectDocumentsByProjectId(Long projectId, String userId) {
        log.info("Récupération des documents pour le projet: {} et l'utilisateur: {}", projectId, userId);
        ensureDocumentReadAccess(loadProject(projectId), userId);
        return projectDocumentRepository.findByProjectId(projectId)
                .stream()
                .map(projectDocumentMapper::toResponseDTO)
                .toList();
    }

    @Override
    @Transactional(readOnly = true)
    public List<ProjectDocumentResponseDTO> getProjectDocumentsByType(ProjectDocumentType type, String userId) {
        log.info("Récupération des documents de type: {} pour l'utilisateur: {}", type, userId);
        if (isCustomerUser(userId)) {
            return projectDocumentRepository.findByType(type)
                    .stream()
                    .filter(document -> hasProjectReadAccess(document.getProject(), userId))
                    .map(projectDocumentMapper::toResponseDTO)
                    .toList();
        }

        return projectDocumentRepository.findByType(type)
                .stream()
                .map(projectDocumentMapper::toResponseDTO)
                .toList();
    }

    @Override
    @Transactional(readOnly = true)
    public List<ProjectDocumentResponseDTO> getProjectDocumentsByUploadedBy(String uploadedBy, String userId) {
        log.info("Récupération des documents uploadés par: {} pour l'utilisateur: {}", uploadedBy, userId);
        if (isCustomerUser(userId)) {
            return projectDocumentRepository.findByUploadedBy(uploadedBy)
                    .stream()
                    .filter(document -> hasProjectReadAccess(document.getProject(), userId))
                    .map(projectDocumentMapper::toResponseDTO)
                    .toList();
        }

        return projectDocumentRepository.findByUploadedBy(uploadedBy)
                .stream()
                .map(projectDocumentMapper::toResponseDTO)
                .toList();
    }

    private Project loadProject(Long projectId) {
        return projectRepository.findById(projectId)
                .orElseThrow(() -> new ProjectDocumentValidationException("Projet non trouvé avec id: " + projectId));
    }

    private void ensureDocumentReadAccess(Project project, String userId) {
        if (!hasProjectReadAccess(project, userId)) {
            throw new UnauthorizedException("You are not allowed to access this project documents");
        }
    }

    private void ensureDocumentWriteAccess(Project project, String userId) {
        if (isCustomerUser(userId) && !hasProjectReadAccess(project, userId)) {
            throw new UnauthorizedException("Only members of a public project can access its documents");
        }
        if (isCustomerUser(userId)) {
            throw new UnauthorizedException("Customers are not allowed to create, update or delete project documents");
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

    private void ensureUploadedBy(ProjectDocumentRequestDTO request, String userId, String fallbackUploadedBy) {
        if (request == null) {
            return;
        }

        if (userId != null && !userId.trim().isEmpty()) {
            request.setUploadedBy(userId.trim());
            return;
        }

        if (request.getUploadedBy() != null && !request.getUploadedBy().trim().isEmpty()) {
            request.setUploadedBy(request.getUploadedBy().trim());
            return;
        }

        if (fallbackUploadedBy != null && !fallbackUploadedBy.trim().isEmpty()) {
            request.setUploadedBy(fallbackUploadedBy.trim());
        }
    }
}
