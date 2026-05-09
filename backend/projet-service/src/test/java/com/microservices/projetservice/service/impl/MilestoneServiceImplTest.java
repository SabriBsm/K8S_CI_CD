package com.microservices.projetservice.service.impl;

import com.microservices.projetservice.dto.request.MilestoneRequestDTO;
import com.microservices.projetservice.dto.response.MilestoneResponseDTO;
import com.microservices.projetservice.dto.response.ProjectResponseDTO;
import com.microservices.projetservice.entity.Milestone;
import com.microservices.projetservice.entity.Project;
import com.microservices.projetservice.entity.ProjectMember;
import com.microservices.projetservice.enums.MilestoneStatus;
import com.microservices.projetservice.enums.ProjectVisibility;
import com.microservices.projetservice.exception.UnauthorizedException;
import com.microservices.projetservice.feign.UserDTO;
import com.microservices.projetservice.feign.UserServiceClient;
import com.microservices.projetservice.mapper.MilestoneMapper;
import com.microservices.projetservice.repository.MilestoneRepository;
import com.microservices.projetservice.repository.ProjectMemberRepository;
import com.microservices.projetservice.repository.ProjectRepository;
import com.microservices.projetservice.validator.MilestoneValidator;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.assertDoesNotThrow;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class MilestoneServiceImplTest {

    @Mock
    private MilestoneRepository milestoneRepository;
    @Mock
    private ProjectRepository projectRepository;
    @Mock
    private ProjectMemberRepository projectMemberRepository;
    @Mock
    private MilestoneMapper milestoneMapper;
    @Mock
    private UserServiceClient userServiceClient;
    @Mock
    private MilestoneValidator milestoneValidator;

    @InjectMocks
    private MilestoneServiceImpl milestoneService;

    @Test
    void getAllMilestones_returnsOnlyAccessiblePublicProjectMilestonesForCustomer() {
        UserDTO customer = UserDTO.builder().id("201").username("customerUser").role("CUSTOMER").build();
        when(userServiceClient.getUserByUsername("customerUser")).thenReturn(customer);

        Project publicProject = Project.builder().id(1L).name("Public Project").visibility(ProjectVisibility.PUBLIC).build();
        Project privateProject = Project.builder().id(2L).name("Private Project").visibility(ProjectVisibility.PRIVATE).build();
        when(projectRepository.findAll()).thenReturn(List.of(publicProject, privateProject));
        when(projectMemberRepository.findByProjectIdAndUserIdAndIsActiveTrue(1L, "customerUser")).thenReturn(Optional.empty());
        when(projectMemberRepository.findByProjectIdAndUserIdAndIsActiveTrue(1L, "201")).thenReturn(Optional.of(ProjectMember.builder().id(1L).build()));

        Milestone publicMilestone = Milestone.builder()
                .id(10L)
                .project(publicProject)
                .title("Public milestone")
                .description("Visible to customer")
                .dueDate(LocalDate.now().plusDays(5))
                .status(MilestoneStatus.PENDING)
                .isCritical(false)
                .build();
        when(milestoneRepository.findByProjectIdIn(List.of(1L))).thenReturn(List.of(publicMilestone));
        when(milestoneMapper.toResponseDTO(any(Milestone.class))).thenAnswer(invocation -> {
            Milestone milestone = invocation.getArgument(0);
            return MilestoneResponseDTO.builder()
                    .id(milestone.getId())
                    .project(milestone.getProject() == null ? null : ProjectResponseDTO.builder().id(milestone.getProject().getId()).build())
                    .title(milestone.getTitle())
                    .description(milestone.getDescription())
                    .dueDate(milestone.getDueDate())
                    .status(milestone.getStatus())
                    .isCritical(milestone.getIsCritical())
                    .actualCompletionDate(milestone.getActualCompletionDate())
                    .build();
        });

        List<MilestoneResponseDTO> result = milestoneService.getAllMilestones("customerUser");

        assertEquals(1, result.size());
        assertEquals(10L, result.get(0).getId());
        assertEquals(1L, result.get(0).getProject().getId());
    }

    @Test
    void createMilestone_deniesCustomerEvenOnPublicProject() {
        UserDTO customer = UserDTO.builder().id("201").username("customerUser").role("CUSTOMER").build();
        when(userServiceClient.getUserByUsername("customerUser")).thenReturn(customer);

        Project publicProject = Project.builder().id(1L).name("Public Project").visibility(ProjectVisibility.PUBLIC).build();
        when(projectRepository.findById(1L)).thenReturn(Optional.of(publicProject));

        MilestoneRequestDTO request = MilestoneRequestDTO.builder()
                .projectId(1L)
                .title("Forbidden milestone")
                .description("Not allowed")
                .dueDate(LocalDate.now().plusDays(7))
                .build();

        assertThrows(UnauthorizedException.class,
                () -> milestoneService.createMilestone(request, "customerUser"));
    }

    @Test
    void getMilestoneById_deniesCustomerOnPrivateProject() {
        UserDTO customer = UserDTO.builder().id("201").username("customerUser").role("CUSTOMER").build();
        when(userServiceClient.getUserByUsername("customerUser")).thenReturn(customer);

        Project privateProject = Project.builder().id(2L).name("Private Project").visibility(ProjectVisibility.PRIVATE).build();
        Milestone privateMilestone = Milestone.builder()
                .id(20L)
                .project(privateProject)
                .title("Private milestone")
                .description("Hidden from customer")
                .dueDate(LocalDate.now().plusDays(8))
                .status(MilestoneStatus.PENDING)
                .isCritical(false)
                .build();
        when(milestoneRepository.findById(20L)).thenReturn(Optional.of(privateMilestone));

        assertThrows(UnauthorizedException.class,
                () -> milestoneService.getMilestoneById(20L, "customerUser"));
    }
}
