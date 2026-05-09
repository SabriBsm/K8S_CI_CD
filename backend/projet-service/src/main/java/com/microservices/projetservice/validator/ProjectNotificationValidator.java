package com.microservices.projetservice.validator;

import com.microservices.projetservice.dto.request.ProjectNotificationRequestDTO;
import com.microservices.projetservice.entity.ProjectNotification;
import com.microservices.projetservice.exception.ProjectNotificationValidationException;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;

@Component
@Slf4j
public class ProjectNotificationValidator {

    public void validateForCreate(ProjectNotificationRequestDTO request) {
        // Vérifier que les champs obligatoires sont présents
        if (request.getMessage() == null || request.getMessage().trim().isEmpty()) {
            throw new ProjectNotificationValidationException("Le message de la notification est obligatoire");
        }
        if (request.getType() == null) {
            throw new ProjectNotificationValidationException("Le type de notification est obligatoire");
        }
        // projectId et userId peuvent être null - affectation ultérieure possible
    }

    public void validateForUpdate(ProjectNotificationRequestDTO request, ProjectNotification existingNotification) {
        // Même validations que pour la création
        validateForCreate(request);
    }
}
