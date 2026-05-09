package com.microservices.projetservice.service.impl;

import com.microservices.projetservice.dto.request.ProjectMemberRequestDTO;
import com.microservices.projetservice.dto.response.ProjectMemberResponseDTO;
import com.microservices.projetservice.entity.Project;
import com.microservices.projetservice.entity.ProjectMember;
import com.microservices.projetservice.feign.UserDTO;
import com.microservices.projetservice.feign.UserServiceClient;
import com.microservices.projetservice.mapper.ProjectMemberMapper;
import com.microservices.projetservice.repository.ProjectMemberRepository;
import com.microservices.projetservice.repository.ProjectRepository;
import com.microservices.projetservice.service.interfaces.ProjectNotificationService;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.assertDoesNotThrow;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.doNothing;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class ProjectMemberServiceImplTest {

    @Mock
    private ProjectMemberRepository projectMemberRepository;
    @Mock
    private ProjectRepository projectRepository;
    @Mock
    private ProjectMemberMapper projectMemberMapper;
    @Mock
    private UserServiceClient userServiceClient;
    @Mock
    private ProjectNotificationService projectNotificationService;

    @InjectMocks
    private ProjectMemberServiceImpl projectMemberService;

    @Test
    void addMember_allowsAdminEvenWhenNotProjectManager() {
        UserDTO adminUser = UserDTO.builder()
                .id("42")
                .username("adminUser")
                .role("ADMIN")
                .build();
        UserDTO targetUser = UserDTO.builder()
                .id("200")
                .username("memberUser")
                .role("PROJECT_MEMBER")
                .build();
        when(userServiceClient.getUserByUsername("adminUser")).thenReturn(adminUser);
        when(userServiceClient.getUserById("200")).thenReturn(targetUser);

        Project project = Project.builder()
                .id(1L)
                .name("Project Alpha")
                .projectManagerId("10")
                .startDate(LocalDate.now())
                .endDate(LocalDate.now().plusDays(10))
                .build();
        when(projectRepository.findById(1L)).thenReturn(Optional.of(project));
        when(projectMemberRepository.findByProjectIdAndUserId(1L, "200")).thenReturn(Optional.empty());
        when(projectMemberRepository.save(any(ProjectMember.class))).thenAnswer(invocation -> invocation.getArgument(0));
        when(projectMemberMapper.toResponseDTO(any(ProjectMember.class))).thenAnswer(invocation -> {
            ProjectMember member = invocation.getArgument(0);
            return ProjectMemberResponseDTO.builder()
                    .id(member.getId())
                    .projectId(member.getProject() != null ? member.getProject().getId() : null)
                    .userId(member.getUserId())
                    .role(member.getRole())
                    .joinedDate(LocalDateTime.now())
                    .isActive(member.getIsActive())
                    .build();
        });

        ProjectMemberRequestDTO request = ProjectMemberRequestDTO.builder()
                .projectId(1L)
                .userEmail("200")
                .build();

        ProjectMemberResponseDTO response = assertDoesNotThrow(() -> projectMemberService.addMember(request, "adminUser"));

        assertEquals(1L, response.getProjectId());
        assertEquals("200", response.getUserId());
        assertEquals("PROJECT_MEMBER", response.getRole());
        assertEquals(Boolean.TRUE, response.getIsActive());
        verify(projectMemberRepository).save(any(ProjectMember.class));
        verify(projectNotificationService).createMemberAddedNotification(1L, 200L, "You have been added to project 'Project Alpha' as PROJECT_MEMBER.");
    }

    @Test
    void removeMember_allowsAdminEvenWhenNotProjectManager() {
        UserDTO adminUser = UserDTO.builder()
                .id("42")
                .username("adminUser")
                .role("ADMIN")
                .build();
        when(userServiceClient.getUserByUsername("adminUser")).thenReturn(adminUser);

        Project project = Project.builder()
                .id(1L)
                .name("Project Alpha")
                .projectManagerId("10")
                .customerId(null)
                .startDate(LocalDate.now())
                .endDate(LocalDate.now().plusDays(10))
                .build();
        ProjectMember member = ProjectMember.builder()
                .id(7L)
                .project(project)
                .userId("200")
                .role("PROJECT_MEMBER")
                .isActive(true)
                .build();
        when(projectRepository.findById(1L)).thenReturn(Optional.of(project));
        when(projectMemberRepository.findByProjectIdAndUserId(1L, "200")).thenReturn(Optional.of(member));
        when(projectMemberRepository.save(any(ProjectMember.class))).thenAnswer(invocation -> invocation.getArgument(0));

        assertDoesNotThrow(() -> projectMemberService.removeMember(1L, "200", "adminUser"));

        assertFalse(member.getIsActive());
        verify(projectMemberRepository).save(member);
        verify(projectRepository, never()).save(project);
    }
}

