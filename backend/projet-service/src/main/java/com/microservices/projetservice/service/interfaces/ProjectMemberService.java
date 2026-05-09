package com.microservices.projetservice.service.interfaces;

import com.microservices.projetservice.dto.request.ProjectMemberRequestDTO;
import com.microservices.projetservice.dto.response.ProjectMemberResponseDTO;
import java.util.List;

public interface ProjectMemberService {

    /**
     * Add a user to a project (only project manager can do this)
     */
    ProjectMemberResponseDTO addMember(ProjectMemberRequestDTO request, String projectManagerId);

    /**
     * Remove a user from a project (only project manager can do this)
     */
    void removeMember(Long projectId, String userId, String projectManagerId);

    /**
     * Get all members of a project
     */
    List<ProjectMemberResponseDTO> getProjectMembers(Long projectId);

    /**
     * Get all projects of a user
     */
    List<ProjectMemberResponseDTO> getUserProjects(String userId);

    /**
     * Check if a user is a member of a project
     */
    boolean isMember(Long projectId, String userId);

    /**
     * Assign a project manager to a project
     */
    void assignProjectManager(Long projectId, String userId);

    /**
     * Update a member's role
     */
    ProjectMemberResponseDTO updateMemberRole(Long projectId, String userId, String newRole);

    /**
     * Get projects managed by a user
     */
    List<ProjectMemberResponseDTO> getManagedProjects(String userId);
}



