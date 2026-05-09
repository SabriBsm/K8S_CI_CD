package com.microservices.projetservice.validator;

import com.microservices.projetservice.dto.request.ProjectMeetingRequestDTO;
import com.microservices.projetservice.entity.ProjectMeeting;
import com.microservices.projetservice.exception.ProjectMeetingValidationException;
import org.junit.jupiter.api.Test;

import java.time.LocalDate;

import static org.junit.jupiter.api.Assertions.assertDoesNotThrow;
import static org.junit.jupiter.api.Assertions.assertThrows;

class ProjectMeetingValidatorTest {

    private final ProjectMeetingValidator validator = new ProjectMeetingValidator();

    @Test
    void validateForCreateRejectsPastMeetingDate() {
        ProjectMeetingRequestDTO request = ProjectMeetingRequestDTO.builder()
                .projectId(1L)
                .title("Daily meeting")
                .meetingDate(LocalDate.now().minusDays(1))
                .createdBy("user@example.com")
                .build();

        assertThrows(ProjectMeetingValidationException.class, () -> validator.validateForCreate(request));
    }

    @Test
    void validateForCreateAcceptsTodayOrFutureMeetingDate() {
        ProjectMeetingRequestDTO request = ProjectMeetingRequestDTO.builder()
                .projectId(1L)
                .title("Daily meeting")
                .meetingDate(LocalDate.now())
                .createdBy("user@example.com")
                .build();

        assertDoesNotThrow(() -> validator.validateForCreate(request));
    }

    @Test
    void validateForUpdateAllowsKeepingExistingPastMeetingDate() {
        ProjectMeetingRequestDTO request = ProjectMeetingRequestDTO.builder()
                .projectId(1L)
                .title("Daily meeting")
                .meetingDate(LocalDate.now().minusDays(2))
                .createdBy("user@example.com")
                .build();

        ProjectMeeting existingMeeting = ProjectMeeting.builder()
                .meetingDate(LocalDate.now().minusDays(2))
                .build();

        assertDoesNotThrow(() -> validator.validateForUpdate(request, existingMeeting));
    }

    @Test
    void validateForUpdateRejectsChangingFutureMeetingToPastDate() {
        ProjectMeetingRequestDTO request = ProjectMeetingRequestDTO.builder()
                .projectId(1L)
                .title("Daily meeting")
                .meetingDate(LocalDate.now().minusDays(1))
                .createdBy("user@example.com")
                .build();

        ProjectMeeting existingMeeting = ProjectMeeting.builder()
                .meetingDate(LocalDate.now().plusDays(1))
                .build();

        assertThrows(ProjectMeetingValidationException.class, () -> validator.validateForUpdate(request, existingMeeting));
    }
}

