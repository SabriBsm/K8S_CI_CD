package com.microservices.projetservice.service.interfaces;

import com.microservices.projetservice.dto.request.ProjectDocumentRequestDTO;
import com.microservices.projetservice.dto.response.ProjectDocumentResponseDTO;
import com.microservices.projetservice.enums.ProjectDocumentType;
import java.util.List;

public interface ProjectDocumentService {
    List<ProjectDocumentResponseDTO> getAllProjectDocuments(String userId);
    ProjectDocumentResponseDTO getProjectDocumentById(Long id, String userId);
    ProjectDocumentResponseDTO createProjectDocument(ProjectDocumentRequestDTO request, String userId);
    ProjectDocumentResponseDTO updateProjectDocument(Long id, ProjectDocumentRequestDTO request, String userId);
    void deleteProjectDocument(Long id, String userId);
    List<ProjectDocumentResponseDTO> getProjectDocumentsByProjectId(Long projectId, String userId);
    List<ProjectDocumentResponseDTO> getProjectDocumentsByType(ProjectDocumentType type, String userId);
    List<ProjectDocumentResponseDTO> getProjectDocumentsByUploadedBy(String uploadedBy, String userId);
}
