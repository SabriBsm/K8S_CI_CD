package com.microservices.projetservice.service.impl;

import com.microservices.projetservice.dto.request.ProjectMeetingRequestDTO;
import com.microservices.projetservice.dto.response.ProjectMeetingResponseDTO;
import com.microservices.projetservice.entity.Project;
import com.microservices.projetservice.entity.ProjectMeeting;
import com.microservices.projetservice.entity.ProjectMember;
import com.microservices.projetservice.enums.ProjectVisibility;
import com.microservices.projetservice.exception.UnauthorizedException;
import com.microservices.projetservice.feign.UserDTO;
import com.microservices.projetservice.feign.UserServiceClient;
import com.microservices.projetservice.mapper.ProjectMeetingMapper;
import com.microservices.projetservice.repository.ProjectMeetingRepository;
import com.microservices.projetservice.repository.ProjectMemberRepository;
import com.microservices.projetservice.repository.ProjectRepository;
import com.microservices.projetservice.service.interfaces.ProjectNotificationService;
import com.microservices.projetservice.validator.ProjectMeetingValidator;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.assertDoesNotThrow;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class ProjectMeetingServiceImplTest {

    @Mock
    private ProjectMeetingRepository projectMeetingRepository;
    @Mock
    private ProjectRepository projectRepository;
    @Mock
    private ProjectMemberRepository projectMemberRepository;
    @Mock
    private ProjectMeetingMapper projectMeetingMapper;
    @Mock
    private ProjectMeetingValidator projectMeetingValidator;
    @Mock
    private ProjectNotificationService projectNotificationService;
    @Mock
    private UserServiceClient userServiceClient;

    @InjectMocks
    private ProjectMeetingServiceImpl projectMeetingService;

    @Test
    void createProjectMeeting_allowsCustomerOnPublicProjectWhenMember() {
        UserDTO customer = UserDTO.builder()
                .id("201")
                .username("customerUser")
                .role("CUSTOMER")
                .build();
        when(userServiceClient.getUserByUsername("customerUser")).thenReturn(customer);

        Project project = Project.builder()
                .id(1L)
                .name("Public Project")
                .visibility(ProjectVisibility.PUBLIC)
                .projectManagerId("10")
                .startDate(LocalDate.now())
                .endDate(LocalDate.now().plusDays(10))
                .build();
        when(projectRepository.findById(1L)).thenReturn(Optional.of(project));
        when(projectMemberRepository.findByProjectIdAndUserIdAndIsActiveTrue(1L, "customerUser")).thenReturn(Optional.empty());
        when(projectMemberRepository.findByProjectIdAndUserIdAndIsActiveTrue(1L, "201")).thenReturn(Optional.of(ProjectMember.builder().id(7L).userId("201").build()));
        when(projectMeetingMapper.toEntity(any(ProjectMeetingRequestDTO.class))).thenAnswer(invocation -> {
            ProjectMeetingRequestDTO request = invocation.getArgument(0);
            return ProjectMeeting.builder()
                    .title(request.getTitle())
                    .description(request.getDescription())
                    .meetingDate(request.getMeetingDate())
                    .startTime(request.getStartTime())
                    .endTime(request.getEndTime())
                    .location(request.getLocation())
                    .meetingLink(request.getMeetingLink())
                    .status(request.getStatus())
                    .build();
        });
        when(projectMeetingRepository.save(any(ProjectMeeting.class))).thenAnswer(invocation -> {
            ProjectMeeting meeting = invocation.getArgument(0);
            meeting.setId(55L);
            return meeting;
        });
        when(projectMeetingMapper.toResponseDTO(any(ProjectMeeting.class))).thenAnswer(invocation -> {
            ProjectMeeting meeting = invocation.getArgument(0);
            return ProjectMeetingResponseDTO.builder()
                    .id(meeting.getId())
                    .projectId(meeting.getProject() != null ? meeting.getProject().getId() : null)
                    .title(meeting.getTitle())
                    .description(meeting.getDescription())
                    .meetingDate(meeting.getMeetingDate())
                    .startTime(meeting.getStartTime())
                    .endTime(meeting.getEndTime())
                    .location(meeting.getLocation())
                    .meetingLink(meeting.getMeetingLink())
                    .createdBy(meeting.getCreatedBy())
                    .status(meeting.getStatus())
                    .build();
        });

        ProjectMeetingRequestDTO request = ProjectMeetingRequestDTO.builder()
                .projectId(1L)
                .title("Customer kickoff")
                .description("Kickoff call")
                .meetingDate(LocalDate.now().plusDays(1))
                .startTime(LocalTime.of(10, 0))
                .endTime(LocalTime.of(11, 0))
                .location("ONLINE")
                .meetingLink("https://meet.example.com/abc")
                .createdBy("customerUser")
                .status("SCHEDULED")
                .build();

        ProjectMeetingResponseDTO response = assertDoesNotThrow(() -> projectMeetingService.createProjectMeeting(request, "customerUser"));

        assertEquals(55L, response.getId());
        assertEquals(1L, response.getProjectId());
        assertEquals("201", response.getCreatedBy());
    }

    @Test
    void createProjectMeeting_deniesCustomerOnPrivateProject() {
        UserDTO customer = UserDTO.builder()
                .id("201")
                .username("customerUser")
                .role("CUSTOMER")
                .build();
        when(userServiceClient.getUserByUsername("customerUser")).thenReturn(customer);

        Project privateProject = Project.builder()
                .id(2L)
                .name("Private Project")
                .visibility(ProjectVisibility.PRIVATE)
                .projectManagerId("10")
                .startDate(LocalDate.now())
                .endDate(LocalDate.now().plusDays(10))
                .build();
        when(projectRepository.findById(2L)).thenReturn(Optional.of(privateProject));

        ProjectMeetingRequestDTO request = ProjectMeetingRequestDTO.builder()
                .projectId(2L)
                .title("Forbidden meeting")
                .meetingDate(LocalDate.now().plusDays(1))
                .startTime(LocalTime.of(10, 0))
                .endTime(LocalTime.of(11, 0))
                .location("ONLINE")
                .createdBy("customerUser")
                .status("SCHEDULED")
                .build();

        assertThrows(UnauthorizedException.class, () -> projectMeetingService.createProjectMeeting(request, "customerUser"));
    }
}

