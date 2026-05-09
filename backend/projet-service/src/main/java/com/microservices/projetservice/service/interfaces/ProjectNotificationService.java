package com.microservices.projetservice.service.interfaces;

import com.microservices.projetservice.dto.request.ProjectNotificationRequestDTO;
import com.microservices.projetservice.dto.response.ProjectNotificationResponseDTO;
import com.microservices.projetservice.enums.NotificationType;
import java.util.List;

public interface ProjectNotificationService {
    List<ProjectNotificationResponseDTO> getAllProjectNotifications(String userId);
    ProjectNotificationResponseDTO getProjectNotificationById(Long id, String userId);
    ProjectNotificationResponseDTO createProjectNotification(ProjectNotificationRequestDTO request, String userId);
    ProjectNotificationResponseDTO updateProjectNotification(Long id, ProjectNotificationRequestDTO request, String userId);
    void deleteProjectNotification(Long id, String userId);
    List<ProjectNotificationResponseDTO> getProjectNotificationsByProjectId(Long projectId, String userId);
    List<ProjectNotificationResponseDTO> getProjectNotificationsByUserId(Long userId, String callerUserId);
    List<ProjectNotificationResponseDTO> getProjectNotificationsByType(NotificationType type, String userId);
    List<ProjectNotificationResponseDTO> getProjectNotificationsByIsRead(Boolean isRead, String userId);
    List<ProjectNotificationResponseDTO> getUnreadNotificationsByProjectId(Long projectId, String userId);
    List<ProjectNotificationResponseDTO> getUnreadNotificationsByUserId(Long userId, String callerUserId);
    ProjectNotificationResponseDTO createMemberAddedNotification(Long projectId, Long userId, String message);
    void notifyProjectMembers(Long projectId, String initiatorUserId, String message, NotificationType type);
    String sendNotificationByEmail(Long notificationId, String userId);
    ProjectNotificationResponseDTO markAsRead(Long id, String userId);
    void markAllAsReadByUserId(Long userId, String callerUserId);
    void markAllAsReadByProjectId(Long projectId, String userId);
}
