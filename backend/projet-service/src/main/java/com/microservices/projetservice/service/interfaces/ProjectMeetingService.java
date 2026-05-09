package com.microservices.projetservice.service.interfaces;

import com.microservices.projetservice.dto.request.ProjectMeetingRequestDTO;
import com.microservices.projetservice.dto.response.ProjectMeetingResponseDTO;
import java.util.List;

public interface ProjectMeetingService {
    List<ProjectMeetingResponseDTO> getAllProjectMeetings();
    ProjectMeetingResponseDTO getProjectMeetingById(Long id, String userId);
    ProjectMeetingResponseDTO createProjectMeeting(ProjectMeetingRequestDTO request, String userId);
    ProjectMeetingResponseDTO updateProjectMeeting(Long id, ProjectMeetingRequestDTO request, String userId);
    void deleteProjectMeeting(Long id, String userId);
    List<ProjectMeetingResponseDTO> getProjectMeetingsByProjectId(Long projectId, String userId);
    List<ProjectMeetingResponseDTO> getUpcomingProjectMeetingsByProjectId(Long projectId, String userId);
    List<ProjectMeetingResponseDTO> getPastProjectMeetingsByProjectId(Long projectId, String userId);
    List<ProjectMeetingResponseDTO> getProjectMeetingsByCreatedBy(String createdBy, String userId);
}
