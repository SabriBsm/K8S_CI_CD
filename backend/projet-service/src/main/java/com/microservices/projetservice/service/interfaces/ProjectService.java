package com.microservices.projetservice.service.interfaces;


import com.microservices.projetservice.dto.request.ProjectRequestDTO;
import com.microservices.projetservice.dto.response.ProjectDashboardStatsDTO;
import com.microservices.projetservice.dto.response.ProjectResponseDTO;
import com.microservices.projetservice.enums.ProjectStatus;
import java.util.List;

public interface ProjectService {
    List<ProjectResponseDTO> getAllProjects();
    ProjectResponseDTO getProjectById(Long id, String userId);
    ProjectResponseDTO createProject(ProjectRequestDTO request, String createdBy);
    ProjectResponseDTO updateProject(Long id, ProjectRequestDTO request, String userId);
    void deleteProject(Long id, String userId);
    List<ProjectResponseDTO> getProjectsByStatus(ProjectStatus status);
    List<ProjectResponseDTO> getProjectsByUser(String createdBy);
    List<ProjectResponseDTO> getDelayedProjects();
    String getProjectSummary(Long id, String userId);
    List<ProjectResponseDTO> getProjectsWhereUserIsManager(String userId);
    List<ProjectResponseDTO> searchProjectsByUser(String name, ProjectStatus status, String userId);
    List<ProjectResponseDTO> advancedSearchProjects(
            String name, ProjectStatus status, String description, String customer,
            Double minProgress, Double maxProgress,
            String startDateFrom, String startDateTo,
            String createdBy, boolean delayedOnly,
            String sortBy, String sortDirection, String userId);

    Double getAverageProgress();
    ProjectDashboardStatsDTO getDashboardStats(String userId, String period);
}
