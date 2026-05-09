package com.microservices.projetservice.exception;

public class ProjectNotificationNotFoundException extends RuntimeException {
    public ProjectNotificationNotFoundException(String message) {
        super(message);
    }
}
