package com.microservices.projetservice.validator;


import com.microservices.projetservice.dto.request.ProjectRequestDTO;
import com.microservices.projetservice.entity.Project;
import com.microservices.projetservice.exception.ProjectValidationException;
import com.microservices.projetservice.repository.ProjectRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;
import java.time.LocalDate;

@Component
@RequiredArgsConstructor
@Slf4j
public class ProjectValidator {

    private final ProjectRepository projectRepository;

    public void validateForCreate(ProjectRequestDTO request) {
        // Vérifier unicité du nom
        if (projectRepository.existsByName(request.getName())) {
            throw new ProjectValidationException("Un projet avec ce nom existe déjà");
        }

        // Vérifier cohérence des dates
        validateDates(request, null);
    }

    public void validateForUpdate(ProjectRequestDTO request, Project existingProject) {
        // Vérifier unicité du nom (si modifié)
        if (!existingProject.getName().equals(request.getName())
                && projectRepository.existsByName(request.getName())) {
            throw new ProjectValidationException("Un projet avec ce nom existe déjà");
        }

        // Vérifier cohérence des dates
        validateDates(request, existingProject);
    }

    private void validateDates(ProjectRequestDTO request, Project existingProject) {
        LocalDate today = LocalDate.now();
        boolean isUpdate = existingProject != null;
        boolean startDateChanged = !isUpdate || !request.getStartDate().equals(existingProject.getStartDate());
        boolean endDateChanged = !isUpdate || !request.getEndDate().equals(existingProject.getEndDate());
        boolean datesChanged = startDateChanged || endDateChanged;

        // Les contraintes de 5 ans ne doivent bloquer une mise à jour que si les dates sont réellement modifiées.
        if (datesChanged) {
            if (request.getStartDate().isBefore(today.minusYears(5))) {
                throw new ProjectValidationException("La date de début ne peut pas être antérieure à 5 ans");
            }

            if (request.getEndDate().isAfter(request.getStartDate().plusYears(5))) {
                throw new ProjectValidationException("La durée du projet ne peut pas dépasser 5 ans");
            }
        }
    }

    public void validateProgress(Double progress) {
        if (progress < 0 || progress > 100) {
            throw new ProjectValidationException("La progression doit être comprise entre 0 et 100");
        }
    }
}
