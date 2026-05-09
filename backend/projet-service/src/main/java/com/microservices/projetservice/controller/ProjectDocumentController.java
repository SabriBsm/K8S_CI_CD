package com.microservices.projetservice.controller;

import com.microservices.projetservice.dto.request.ProjectDocumentRequestDTO;
import com.microservices.projetservice.dto.response.ProjectDocumentResponseDTO;
import com.microservices.projetservice.enums.ProjectDocumentType;
import com.microservices.projetservice.service.interfaces.ProjectDocumentService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.responses.ApiResponses;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import java.util.List;

@RestController
@RequestMapping("/api/project-documents")
@RequiredArgsConstructor
public class ProjectDocumentController {

    private final ProjectDocumentService projectDocumentService;

    @GetMapping
    @Operation(summary = "Récupérer tous les documents de projet")
    public ResponseEntity<List<ProjectDocumentResponseDTO>> getAllProjectDocuments(
            @RequestHeader(value = "X-User-Id") String userId) {
        return ResponseEntity.ok(projectDocumentService.getAllProjectDocuments(userId));
    }

    @GetMapping("/{id}")
    @Operation(summary = "Récupérer un document de projet par son ID")
    public ResponseEntity<ProjectDocumentResponseDTO> getProjectDocumentById(
            @PathVariable Long id,
            @RequestHeader(value = "X-User-Id") String userId) {
        return ResponseEntity.ok(projectDocumentService.getProjectDocumentById(id, userId));
    }

    @PostMapping
    @Operation(summary = "Créer un nouveau document de projet")
    @ApiResponses(value = {
            @ApiResponse(responseCode = "201", description = "Document créé avec succès"),
            @ApiResponse(responseCode = "400", description = "Données invalides")
    })
    public ResponseEntity<ProjectDocumentResponseDTO> createProjectDocument(
            @Valid @RequestBody ProjectDocumentRequestDTO request,
            @RequestHeader(value = "X-User-Id") String userId) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(projectDocumentService.createProjectDocument(request, userId));
    }

    @PutMapping("/{id}")
    public ResponseEntity<ProjectDocumentResponseDTO> updateProjectDocument(
            @PathVariable Long id,
            @Valid @RequestBody ProjectDocumentRequestDTO request,
            @RequestHeader(value = "X-User-Id") String userId) {
        return ResponseEntity.ok(projectDocumentService.updateProjectDocument(id, request, userId));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteProjectDocument(@PathVariable Long id,
                                                      @RequestHeader(value = "X-User-Id") String userId) {
        projectDocumentService.deleteProjectDocument(id, userId);
        return ResponseEntity.noContent().build();
    }

    @GetMapping("/project/{projectId}")
    public ResponseEntity<List<ProjectDocumentResponseDTO>> getProjectDocumentsByProjectId(@PathVariable Long projectId,
                                                                                           @RequestHeader(value = "X-User-Id") String userId) {
        return ResponseEntity.ok(projectDocumentService.getProjectDocumentsByProjectId(projectId, userId));
    }

    @GetMapping("/type/{type}")
    public ResponseEntity<List<ProjectDocumentResponseDTO>> getProjectDocumentsByType(@PathVariable ProjectDocumentType type,
                                                                                       @RequestHeader(value = "X-User-Id") String userId) {
        return ResponseEntity.ok(projectDocumentService.getProjectDocumentsByType(type, userId));
    }

    @GetMapping("/uploaded-by/{uploadedBy}")
    public ResponseEntity<List<ProjectDocumentResponseDTO>> getProjectDocumentsByUploadedBy(@PathVariable String uploadedBy,
                                                                                             @RequestHeader(value = "X-User-Id") String userId) {
        return ResponseEntity.ok(projectDocumentService.getProjectDocumentsByUploadedBy(uploadedBy, userId));
    }
}
