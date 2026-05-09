package com.microservices.projetservice.service.impl;

import com.microservices.projetservice.dto.request.ProjectDocumentRequestDTO;
import com.microservices.projetservice.dto.response.ProjectDocumentResponseDTO;
import com.microservices.projetservice.dto.response.ProjectResponseDTO;
import com.microservices.projetservice.entity.Project;
import com.microservices.projetservice.entity.ProjectDocument;
import com.microservices.projetservice.entity.ProjectMember;
import com.microservices.projetservice.enums.ProjectDocumentType;
import com.microservices.projetservice.enums.ProjectVisibility;
import com.microservices.projetservice.exception.UnauthorizedException;
import com.microservices.projetservice.feign.UserDTO;
import com.microservices.projetservice.feign.UserServiceClient;
import com.microservices.projetservice.mapper.ProjectDocumentMapper;
import com.microservices.projetservice.repository.ProjectDocumentRepository;
import com.microservices.projetservice.repository.ProjectMemberRepository;
import com.microservices.projetservice.repository.ProjectRepository;
import com.microservices.projetservice.validator.ProjectDocumentValidator;
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
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class ProjectDocumentServiceImplTest {

    @Mock
    private ProjectDocumentRepository projectDocumentRepository;
    @Mock
    private ProjectRepository projectRepository;
    @Mock
    private ProjectMemberRepository projectMemberRepository;
    @Mock
    private ProjectDocumentMapper projectDocumentMapper;
    @Mock
    private ProjectDocumentValidator projectDocumentValidator;
    @Mock
    private UserServiceClient userServiceClient;

    @InjectMocks
    private ProjectDocumentServiceImpl projectDocumentService;

    @Test
    void getAllProjectDocuments_returnsOnlyAccessiblePublicProjectDocumentsForCustomer() {
        UserDTO customer = UserDTO.builder().id("201").username("customerUser").role("CUSTOMER").build();
        when(userServiceClient.getUserByUsername("customerUser")).thenReturn(customer);

        Project publicProject = Project.builder().id(1L).name("Public Project").visibility(ProjectVisibility.PUBLIC).build();
        Project privateProject = Project.builder().id(2L).name("Private Project").visibility(ProjectVisibility.PRIVATE).build();
        when(projectRepository.findAll()).thenReturn(List.of(publicProject, privateProject));
        when(projectMemberRepository.findByProjectIdAndUserIdAndIsActiveTrue(1L, "customerUser")).thenReturn(Optional.empty());
        when(projectMemberRepository.findByProjectIdAndUserIdAndIsActiveTrue(1L, "201")).thenReturn(Optional.of(ProjectMember.builder().id(1L).build()));

        ProjectDocument publicDocument = ProjectDocument.builder()
                .id(10L)
                .project(publicProject)
                .name("Public Doc")
                .type(ProjectDocumentType.DOCUMENTATION)
                .version("1.0")
                .uploadedBy("201")
                .uploadedAt(LocalDateTime.now())
                .fileUrl("https://example.com/public.pdf")
                .build();
        when(projectDocumentRepository.findByProjectIdIn(List.of(1L))).thenReturn(List.of(publicDocument));
        when(projectDocumentMapper.toResponseDTO(any(ProjectDocument.class))).thenAnswer(invocation -> {
            ProjectDocument document = invocation.getArgument(0);
            return ProjectDocumentResponseDTO.builder()
                    .id(document.getId())
                    .project(document.getProject() == null ? null : ProjectResponseDTO.builder().id(document.getProject().getId()).build())
                    .name(document.getName())
                    .type(document.getType())
                    .version(document.getVersion())
                    .uploadedBy(document.getUploadedBy())
                    .uploadedAt(document.getUploadedAt())
                    .build();
        });

        List<ProjectDocumentResponseDTO> result = projectDocumentService.getAllProjectDocuments("customerUser");

        assertEquals(1, result.size());
        assertEquals(10L, result.get(0).getId());
        assertEquals(1L, result.get(0).getProject().getId());
    }

    @Test
    void createProjectDocument_deniesCustomerEvenOnPublicProject() {
        UserDTO customer = UserDTO.builder().id("201").username("customerUser").role("CUSTOMER").build();
        when(userServiceClient.getUserByUsername("customerUser")).thenReturn(customer);

        Project publicProject = Project.builder().id(1L).name("Public Project").visibility(ProjectVisibility.PUBLIC).build();
        when(projectRepository.findById(1L)).thenReturn(Optional.of(publicProject));
        when(projectMemberRepository.findByProjectIdAndUserIdAndIsActiveTrue(1L, "customerUser")).thenReturn(Optional.empty());
        when(projectMemberRepository.findByProjectIdAndUserIdAndIsActiveTrue(1L, "201")).thenReturn(Optional.of(ProjectMember.builder().id(1L).build()));

        ProjectDocumentRequestDTO request = ProjectDocumentRequestDTO.builder()
                .projectId(1L)
                .name("Forbidden doc")
                .fileUrl("https://example.com/forbidden.pdf")
                .type(ProjectDocumentType.DOCUMENTATION)
                .version("1.0")
                .uploadedBy("customerUser")
                .build();

        assertThrows(UnauthorizedException.class,
                () -> projectDocumentService.createProjectDocument(request, "customerUser"));
    }

    @Test
    void getProjectDocumentById_deniesCustomerOnPrivateProject() {
        UserDTO customer = UserDTO.builder().id("201").username("customerUser").role("CUSTOMER").build();
        when(userServiceClient.getUserByUsername("customerUser")).thenReturn(customer);

        Project privateProject = Project.builder().id(2L).name("Private Project").visibility(ProjectVisibility.PRIVATE).build();
        ProjectDocument privateDocument = ProjectDocument.builder()
                .id(20L)
                .project(privateProject)
                .name("Private Doc")
                .type(ProjectDocumentType.DOCUMENTATION)
                .version("1.0")
                .uploadedBy("202")
                .uploadedAt(LocalDateTime.now())
                .fileUrl("https://example.com/private.pdf")
                .build();
        when(projectDocumentRepository.findById(20L)).thenReturn(Optional.of(privateDocument));

        assertThrows(UnauthorizedException.class,
                () -> projectDocumentService.getProjectDocumentById(20L, "customerUser"));
    }
}

