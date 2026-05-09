package com.microservices.projetservice.exception;

public class ProjectMeetingValidationException extends RuntimeException {
    public ProjectMeetingValidationException(String message) {
        super(message);
    }
}
