package com.microservices.projetservice.validator;

import com.microservices.projetservice.dto.request.ProjectMeetingRequestDTO;
import com.microservices.projetservice.entity.ProjectMeeting;
import com.microservices.projetservice.exception.ProjectMeetingValidationException;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;
import java.time.LocalDate;
import java.util.Set;

@Component
@Slf4j
public class ProjectMeetingValidator {

    private static final Set<String> VALID_STATUSES = Set.of("SCHEDULED", "COMPLETED", "CANCELLED");

    private void validateCommon(ProjectMeetingRequestDTO request) {
        if (request.getProjectId() == null) {
            throw new ProjectMeetingValidationException("Le projet est obligatoire");
        }
        if (request.getTitle() == null || request.getTitle().trim().isEmpty()) {
            throw new ProjectMeetingValidationException("Le titre de la réunion est obligatoire");
        }
        if (request.getCreatedBy() == null || request.getCreatedBy().trim().isEmpty()) {
            throw new ProjectMeetingValidationException("Le créateur de la réunion est obligatoire");
        }
        if (request.getStatus() != null && !request.getStatus().isBlank() && !VALID_STATUSES.contains(request.getStatus().trim().toUpperCase())) {
            throw new ProjectMeetingValidationException("Le statut de la réunion est invalide");
        }
        if (request.getStartTime() != null && request.getEndTime() != null && !request.getEndTime().isAfter(request.getStartTime())) {
            throw new ProjectMeetingValidationException("L'heure de fin doit être après l'heure de début");
        }
        if (request.getMeetingLink() != null && !request.getMeetingLink().isBlank()) {
            String link = request.getMeetingLink().trim().toLowerCase();
            if (!link.startsWith("http://") && !link.startsWith("https://")) {
                throw new ProjectMeetingValidationException("Le lien de réunion doit être une URL valide");
            }
        }
    }

    private void validateMeetingDateForCreate(LocalDate meetingDate) {
        if (meetingDate == null) {
            throw new ProjectMeetingValidationException("La date de la réunion est obligatoire");
        }

        LocalDate today = LocalDate.now();
        if (meetingDate.isBefore(today)) {
            throw new ProjectMeetingValidationException("La date de la réunion doit être aujourd'hui ou dans le futur");
        }
    }

    private void validateMeetingDateForUpdate(LocalDate meetingDate, ProjectMeeting existingMeeting) {
        if (meetingDate == null) {
            throw new ProjectMeetingValidationException("La date de la réunion est obligatoire");
        }

        LocalDate today = LocalDate.now();
        LocalDate existingDate = existingMeeting != null ? existingMeeting.getMeetingDate() : null;
        if (meetingDate.isBefore(today) && (existingDate == null || !meetingDate.equals(existingDate))) {
            throw new ProjectMeetingValidationException("La date de la réunion doit être aujourd'hui ou dans le futur");
        }
    }

    public void validateForCreate(ProjectMeetingRequestDTO request) {
        validateCommon(request);
        validateMeetingDateForCreate(request.getMeetingDate());
    }

    public void validateForUpdate(ProjectMeetingRequestDTO request, ProjectMeeting existingMeeting) {
        validateCommon(request);
        validateMeetingDateForUpdate(request.getMeetingDate(), existingMeeting);
    }
}
