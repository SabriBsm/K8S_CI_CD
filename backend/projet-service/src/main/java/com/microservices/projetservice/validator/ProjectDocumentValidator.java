package com.microservices.projetservice.validator;

import com.microservices.projetservice.dto.request.ProjectDocumentRequestDTO;
import com.microservices.projetservice.entity.ProjectDocument;
import com.microservices.projetservice.exception.ProjectDocumentValidationException;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;

@Component
@Slf4j
public class ProjectDocumentValidator {

    public void validateForCreate(ProjectDocumentRequestDTO request) {
        // Vérifier que les champs obligatoires sont présents
        if (request.getName() == null || request.getName().trim().isEmpty()) {
            throw new ProjectDocumentValidationException("Le nom du document est obligatoire");
        }
        if (request.getFileUrl() == null || request.getFileUrl().trim().isEmpty()) {
            throw new ProjectDocumentValidationException("L'URL du fichier est obligatoire");
        }
        if (request.getType() == null) {
            throw new ProjectDocumentValidationException("Le type de document est obligatoire");
        }
        if (request.getVersion() == null || request.getVersion().trim().isEmpty()) {
            throw new ProjectDocumentValidationException("La version du document est obligatoire");
        }
        // projectId peut être null - affectation ultérieure possible
    }

    public void validateForUpdate(ProjectDocumentRequestDTO request, ProjectDocument existingDocument) {
        // Même validations que pour la création
        validateForCreate(request);
    }
}
