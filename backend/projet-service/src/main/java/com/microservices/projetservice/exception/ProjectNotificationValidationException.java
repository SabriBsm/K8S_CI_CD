package com.microservices.projetservice.exception;

public class ProjectNotificationValidationException extends RuntimeException {
    public ProjectNotificationValidationException(String message) {
        super(message);
    }
}
