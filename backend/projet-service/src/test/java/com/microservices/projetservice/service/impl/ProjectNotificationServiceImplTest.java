package com.microservices.projetservice.service.impl;

import com.microservices.projetservice.dto.request.ProjectNotificationRequestDTO;
import com.microservices.projetservice.dto.response.ProjectNotificationResponseDTO;
import com.microservices.projetservice.dto.response.ProjectResponseDTO;
import com.microservices.projetservice.entity.Project;
import com.microservices.projetservice.entity.ProjectMember;
import com.microservices.projetservice.entity.ProjectNotification;
import com.microservices.projetservice.enums.NotificationType;
import com.microservices.projetservice.enums.ProjectVisibility;
import com.microservices.projetservice.exception.UnauthorizedException;
import com.microservices.projetservice.feign.UserDTO;
import com.microservices.projetservice.feign.UserServiceClient;
import com.microservices.projetservice.mapper.ProjectNotificationMapper;
import com.microservices.projetservice.repository.ProjectMemberRepository;
import com.microservices.projetservice.repository.ProjectNotificationRepository;
import com.microservices.projetservice.repository.ProjectRepository;
import com.microservices.projetservice.validator.ProjectNotificationValidator;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.assertDoesNotThrow;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class ProjectNotificationServiceImplTest {

    @Mock
    private ProjectNotificationRepository projectNotificationRepository;
    @Mock
    private ProjectRepository projectRepository;
    @Mock
    private ProjectMemberRepository projectMemberRepository;
    @Mock
    private ProjectNotificationMapper projectNotificationMapper;
    @Mock
    private ProjectNotificationValidator projectNotificationValidator;
    @Mock
    private UserServiceClient userServiceClient;

    @InjectMocks
    private ProjectNotificationServiceImpl projectNotificationService;

    @Test
    void getAllProjectNotifications_returnsOnlyAccessiblePublicProjectNotificationsForCustomer() {
        UserDTO customer = UserDTO.builder().id("201").username("customerUser").role("CUSTOMER").build();
        when(userServiceClient.getUserByUsername("customerUser")).thenReturn(customer);

        Project publicProject = Project.builder().id(1L).name("Public Project").visibility(ProjectVisibility.PUBLIC).build();
        Project privateProject = Project.builder().id(2L).name("Private Project").visibility(ProjectVisibility.PRIVATE).build();
        when(projectRepository.findAll()).thenReturn(List.of(publicProject, privateProject));
        when(projectMemberRepository.findByProjectIdAndUserIdAndIsActiveTrue(1L, "customerUser")).thenReturn(Optional.empty());
        when(projectMemberRepository.findByProjectIdAndUserIdAndIsActiveTrue(1L, "201")).thenReturn(Optional.of(ProjectMember.builder().id(1L).build()));

        ProjectNotification publicNotification = ProjectNotification.builder()
                .id(11L)
                .project(publicProject)
                .userId(201L)
                .message("Public notification")
                .type(NotificationType.PROGRESS_UPDATE)
                .isRead(false)
                .createdAt(LocalDateTime.now())
                .build();
        when(projectNotificationRepository.findByProjectIdIn(List.of(1L))).thenReturn(List.of(publicNotification));
        when(projectNotificationMapper.toResponseDTO(any(ProjectNotification.class))).thenAnswer(invocation -> {
            ProjectNotification notification = invocation.getArgument(0);
            return ProjectNotificationResponseDTO.builder()
                    .id(notification.getId())
                    .project(notification.getProject() == null ? null : ProjectResponseDTO.builder().id(notification.getProject().getId()).build())
                    .userId(notification.getUserId())
                    .message(notification.getMessage())
                    .type(notification.getType())
                    .isRead(notification.getIsRead())
                    .createdAt(notification.getCreatedAt())
                    .build();
        });

        List<ProjectNotificationResponseDTO> result = projectNotificationService.getAllProjectNotifications("customerUser");

        assertEquals(1, result.size());
        assertEquals(11L, result.get(0).getId());
        assertEquals(1L, result.get(0).getProject().getId());
    }

    @Test
    void createProjectNotification_deniesCustomerEvenOnPublicProject() {
        UserDTO customer = UserDTO.builder().id("201").username("customerUser").role("CUSTOMER").build();
        when(userServiceClient.getUserByUsername("customerUser")).thenReturn(customer);


        ProjectNotificationRequestDTO request = ProjectNotificationRequestDTO.builder()
                .projectId(1L)
                .userId(201L)
                .message("Forbidden notification").type(NotificationType.PROGRESS_UPDATE)
                .build();

        assertThrows(UnauthorizedException.class,
                () -> projectNotificationService.createProjectNotification(request, "customerUser"));
    }

    @Test
    void getProjectNotificationsByUserId_deniesCustomerAccessToAnotherUsersNotifications() {
        UserDTO customer = UserDTO.builder().id("201").username("customerUser").role("CUSTOMER").build();
        when(userServiceClient.getUserByUsername("customerUser")).thenReturn(customer);

        assertThrows(UnauthorizedException.class,
                () -> projectNotificationService.getProjectNotificationsByUserId(202L, "customerUser"));
    }
}
