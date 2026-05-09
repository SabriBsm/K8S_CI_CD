package com.microservices.projetservice.validator;

import com.microservices.projetservice.dto.request.ProjectDocumentRequestDTO;
import com.microservices.projetservice.enums.ProjectDocumentType;
import com.microservices.projetservice.exception.ProjectDocumentValidationException;
import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.assertDoesNotThrow;
import static org.junit.jupiter.api.Assertions.assertThrows;

class ProjectDocumentValidatorTest {

    private final ProjectDocumentValidator validator = new ProjectDocumentValidator();

    @Test
    void validateForCreate_allowsMissingUploadedBy() {
        ProjectDocumentRequestDTO request = ProjectDocumentRequestDTO.builder()
                .projectId(1L)
                .name("Specs")
                .fileUrl("https://example.com/specs.pdf")
                .type(ProjectDocumentType.SPECIFICATIONS)
                .version("1.0")
                .build();

        assertDoesNotThrow(() -> validator.validateForCreate(request));
    }

    @Test
    void validateForCreate_rejectsMissingRequiredFields() {
        ProjectDocumentRequestDTO request = ProjectDocumentRequestDTO.builder().build();

        assertThrows(ProjectDocumentValidationException.class,
                () -> validator.validateForCreate(request));
    }
}
