package com.microservices.projetservice.validator;

import com.microservices.projetservice.dto.request.MilestoneRequestDTO;
import com.microservices.projetservice.entity.Milestone;
import com.microservices.projetservice.exception.MilestoneValidationException;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;

@Component
@Slf4j
public class MilestoneValidator {

    public void validateForCreate(MilestoneRequestDTO request) {
        // Vérifier que les champs obligatoires sont présents
        if (request.getTitle() == null || request.getTitle().trim().isEmpty()) {
            throw new MilestoneValidationException("Le titre du milestone est obligatoire");
        }
        if (request.getDueDate() == null) {
            throw new MilestoneValidationException("La date d'échéance est obligatoire");
        }
        // projectId peut être null - affectation ultérieure possible
    }

    public void validateForUpdate(MilestoneRequestDTO request, Milestone existingMilestone) {
        // Même validations que pour la création
        validateForCreate(request);
    }
}
