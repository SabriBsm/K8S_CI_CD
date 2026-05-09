package com.microservices.projetservice.service.impl;

import com.microservices.projetservice.dto.request.ProjectRequestDTO;
import com.microservices.projetservice.dto.response.ProjectResponseDTO;
import com.microservices.projetservice.entity.Project;
import com.microservices.projetservice.entity.ProjectDocument;
import com.microservices.projetservice.entity.ProjectMember;
import com.microservices.projetservice.entity.ProjectMeeting;
import com.microservices.projetservice.entity.Milestone;
import com.microservices.projetservice.entity.ProjectNotification;
import com.microservices.projetservice.enums.ProjectStatus;
import com.microservices.projetservice.enums.ProjectDocumentType;
import com.microservices.projetservice.enums.MilestoneStatus;
import com.microservices.projetservice.enums.NotificationType;
import com.microservices.projetservice.enums.ProjectVisibility;
import com.microservices.projetservice.feign.UserDTO;
import com.microservices.projetservice.feign.UserServiceClient;
import com.microservices.projetservice.mapper.ProjectMapper;
import com.microservices.projetservice.repository.MilestoneRepository;
import com.microservices.projetservice.repository.ProjectDocumentRepository;
import com.microservices.projetservice.repository.ProjectMemberRepository;
import com.microservices.projetservice.repository.ProjectMeetingRepository;
import com.microservices.projetservice.repository.ProjectNotificationRepository;
import com.microservices.projetservice.repository.ProjectRepository;
import com.microservices.projetservice.service.interfaces.ProjectNotificationService;
import com.microservices.projetservice.validator.ProjectValidator;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertDoesNotThrow;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.doNothing;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class ProjectServiceImplTest {

    @Mock
    private ProjectRepository projectRepository;
    @Mock
    private ProjectMemberRepository projectMemberRepository;
    @Mock
    private MilestoneRepository milestoneRepository;
    @Mock
    private ProjectMeetingRepository projectMeetingRepository;
    @Mock
    private ProjectDocumentRepository projectDocumentRepository;
    @Mock
    private ProjectNotificationRepository projectNotificationRepository;
    @Mock
    private ProjectMapper projectMapper;
    @Mock
    private ProjectValidator projectValidator;
    @Mock
    private UserServiceClient userServiceClient;
    @Mock
    private ProjectNotificationService projectNotificationService;

    @InjectMocks
    private ProjectServiceImpl projectService;

    @Test
    void getProjectsByUser_returnsAllProjects_whenUserIsAdmin() {
        UserDTO adminUser = UserDTO.builder()
                .id("42")
                .username("adminUser")
                .role("ADMIN")
                .build();
        when(userServiceClient.getUserByUsername("adminUser")).thenReturn(adminUser);

        Project first = Project.builder().id(1L).name("Project A").createdBy("10").projectManagerId("10").startDate(LocalDate.now()).endDate(LocalDate.now().plusDays(1)).build();
        Project second = Project.builder().id(2L).name("Project B").createdBy("11").projectManagerId("11").startDate(LocalDate.now()).endDate(LocalDate.now().plusDays(2)).build();
        when(projectRepository.findAll()).thenReturn(List.of(first, second));
        when(projectMapper.toResponseDTO(any(Project.class))).thenAnswer(invocation -> {
            Project project = invocation.getArgument(0);
            ProjectResponseDTO dto = new ProjectResponseDTO();
            dto.setId(project.getId());
            dto.setName(project.getName());
            return dto;
        });

        List<ProjectResponseDTO> result = projectService.getProjectsByUser("adminUser");

        assertEquals(2, result.size());
        assertEquals("Project A", result.get(0).getName());
        assertEquals("Project B", result.get(1).getName());
        verify(projectRepository).findAll();
        verify(projectRepository, never()).findAllProjectsByUserId(anyString(), anyString());
    }

    @Test
    void updateProject_allowsAdminEvenWhenNotProjectManager() {
        UserDTO adminUser = UserDTO.builder()
                .id("42")
                .username("adminUser")
                .role("ADMIN")
                .build();
        when(userServiceClient.getUserByUsername("adminUser")).thenReturn(adminUser);

        Project existingProject = Project.builder()
                .id(99L)
                .name("Legacy project")
                .createdBy("10")
                .projectManagerId("10")
                .startDate(LocalDate.now())
                .endDate(LocalDate.now().plusDays(5))
                .progress(25.0)
                .status(ProjectStatus.IN_PROGRESS)
                .build();
        when(projectRepository.findById(99L)).thenReturn(Optional.of(existingProject));
        when(projectMemberRepository.findByProjectId(99L)).thenReturn(List.of());
        doNothing().when(projectValidator).validateForUpdate(any(ProjectRequestDTO.class), any(Project.class));
        doNothing().when(projectMapper).updateEntity(any(ProjectRequestDTO.class), any(Project.class));
        when(projectRepository.save(any(Project.class))).thenAnswer(invocation -> invocation.getArgument(0));
        when(projectMapper.toResponseDTO(any(Project.class))).thenAnswer(invocation -> {
            Project project = invocation.getArgument(0);
            ProjectResponseDTO dto = new ProjectResponseDTO();
            dto.setId(project.getId());
            dto.setName(project.getName());
            return dto;
        });

        ProjectRequestDTO request = ProjectRequestDTO.builder()
                .name("Updated project")
                .startDate(LocalDate.now())
                .endDate(LocalDate.now().plusDays(10))
                .progress(50.0)
                .build();

        ProjectResponseDTO response = assertDoesNotThrow(() -> projectService.updateProject(99L, request, "adminUser"));

        assertEquals(99L, response.getId());
        verify(projectRepository).save(existingProject);
        verify(projectValidator).validateForUpdate(request, existingProject);
    }

    @Test
    void deleteProject_allowsAdminEvenWhenNotProjectManager() {
        UserDTO adminUser = UserDTO.builder()
                .id("42")
                .username("adminUser")
                .role("ADMIN")
                .build();
        when(userServiceClient.getUserByUsername("adminUser")).thenReturn(adminUser);

        Project existingProject = Project.builder()
                .id(99L)
                .name("Legacy project")
                .createdBy("10")
                .projectManagerId("10")
                .startDate(LocalDate.now())
                .endDate(LocalDate.now().plusDays(5))
                .progress(25.0)
                .status(ProjectStatus.IN_PROGRESS)
                .build();
        when(projectRepository.findById(99L)).thenReturn(Optional.of(existingProject));

        assertDoesNotThrow(() -> projectService.deleteProject(99L, "adminUser"));

        verify(projectRepository).deleteById(99L);
    }

    @Test
    void getProjectsByUser_returnsOnlyPublicMembershipProjects_whenUserIsCustomer() {
        UserDTO customerUser = UserDTO.builder()
                .id("201")
                .username("customerUser")
                .role("CUSTOMER")
                .build();
        when(userServiceClient.getUserByUsername("customerUser")).thenReturn(customerUser);

        Project publicProject = Project.builder()
                .id(1L)
                .name("Public Project")
                .projectManagerId("10")
                .visibility(ProjectVisibility.PUBLIC)
                .startDate(LocalDate.now())
                .endDate(LocalDate.now().plusDays(5))
                .build();
        Project privateProject = Project.builder()
                .id(2L)
                .name("Private Project")
                .projectManagerId("11")
                .visibility(ProjectVisibility.PRIVATE)
                .startDate(LocalDate.now())
                .endDate(LocalDate.now().plusDays(5))
                .build();

        when(projectRepository.findAllProjectsByUserId("customerUser", "201")).thenReturn(List.of(publicProject, privateProject));
        when(projectMemberRepository.findByProjectIdAndUserIdAndIsActiveTrue(1L, "customerUser")).thenReturn(Optional.empty());
        when(projectMemberRepository.findByProjectIdAndUserIdAndIsActiveTrue(1L, "201")).thenReturn(Optional.of(ProjectMember.builder().id(1L).build()));
        when(projectMapper.toResponseDTO(any(Project.class))).thenAnswer(invocation -> {
            Project project = invocation.getArgument(0);
            ProjectResponseDTO dto = new ProjectResponseDTO();
            dto.setId(project.getId());
            dto.setName(project.getName());
            return dto;
        });

        List<ProjectResponseDTO> result = projectService.getProjectsByUser("customerUser");

        assertEquals(1, result.size());
        assertEquals("Public Project", result.get(0).getName());
        verify(projectRepository).findAllProjectsByUserId("customerUser", "201");
    }

    @Test
    void getProjectById_deniesCustomerAccessToPrivateProject() {
        UserDTO customerUser = UserDTO.builder()
                .id("201")
                .username("customerUser")
                .role("CUSTOMER")
                .build();
        when(userServiceClient.getUserByUsername("customerUser")).thenReturn(customerUser);

        Project privateProject = Project.builder()
                .id(55L)
                .name("Private Project")
                .projectManagerId("10")
                .visibility(ProjectVisibility.PRIVATE)
                .startDate(LocalDate.now())
                .endDate(LocalDate.now().plusDays(5))
                .build();
        when(projectRepository.findById(55L)).thenReturn(Optional.of(privateProject));

        assertThrows(com.microservices.projetservice.exception.UnauthorizedException.class,
                () -> projectService.getProjectById(55L, "customerUser"));
    }

    @Test
    void getProjectSummary_returnsFallbackSummaryWhenAiIsUnavailable() {
        UserDTO adminUser = UserDTO.builder()
                .id("42")
                .username("adminUser")
                .role("ADMIN")
                .build();
        when(userServiceClient.getUserByUsername("adminUser")).thenReturn(adminUser);

        Project project = Project.builder()
                .id(77L)
                .name("AI Summary Project")
                .description("Project description")
                .objectives("Project objectives")
                .createdBy("42")
                .projectManagerId("42")
                .visibility(ProjectVisibility.PRIVATE)
                .status(ProjectStatus.IN_PROGRESS)
                .progress(64.0)
                .startDate(LocalDate.now().minusDays(5))
                .endDate(LocalDate.now().plusDays(10))
                .build();
        when(projectRepository.findById(77L)).thenReturn(Optional.of(project));
        when(projectMemberRepository.findByProjectId(77L)).thenReturn(List.of(
                ProjectMember.builder().id(1L).userId("100").role("PROJECT_MANAGER").isActive(true).build(),
                ProjectMember.builder().id(2L).userId("101").role("PROJECT_MEMBER").isActive(true).build()
        ));
        when(milestoneRepository.findByProjectId(77L)).thenReturn(List.of(
                Milestone.builder().id(1L).title("Design approved").dueDate(LocalDate.now().minusDays(2)).status(MilestoneStatus.IN_PROGRESS).isCritical(true).build(),
                Milestone.builder().id(2L).title("Deployment").dueDate(LocalDate.now().plusDays(4)).status(MilestoneStatus.PENDING).isCritical(false).build()
        ));
        when(projectMeetingRepository.findByProjectIdOrderByMeetingDateAscStartTimeAsc(77L)).thenReturn(List.of(
                ProjectMeeting.builder().id(1L).title("Kickoff").meetingDate(LocalDate.now().plusDays(1)).startTime(LocalTime.of(10, 0)).status("SCHEDULED").build()
        ));
        when(projectDocumentRepository.findByProjectId(77L)).thenReturn(List.of(
                ProjectDocument.builder().id(1L).name("Specs").type(ProjectDocumentType.SPECIFICATIONS).version("1.0").uploadedBy("42").fileUrl("https://example.com/specs.pdf").uploadedAt(LocalDateTime.now().minusDays(1)).build()
        ));
        when(projectNotificationRepository.findByProjectId(77L)).thenReturn(List.of(
                ProjectNotification.builder().id(1L).message("Milestone delayed").type(NotificationType.DEADLINE_APPROACHING).isRead(false).createdAt(LocalDateTime.now().minusHours(3)).build()
                ,ProjectNotification.builder().id(2L).message("Budget alert").type(NotificationType.BUDGET_ALERT).isRead(false).createdAt(LocalDateTime.now().minusHours(1)).build()
        ));

        String summary = projectService.getProjectSummary(77L, "adminUser");

        assertTrue(summary.contains("AI Summary Project"));
        assertTrue(summary.contains("2 active members"));
        assertTrue(summary.contains("1 documents") || summary.contains("1 document"));
        assertTrue(summary.contains("1 upcoming meetings") || summary.contains("1 upcoming meeting"));
        assertTrue(summary.contains("2 unread notifications"));
    }
}

