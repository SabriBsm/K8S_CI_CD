package com.microservices.projetservice.exception;

public class ProjectMeetingNotFoundException extends RuntimeException {
    public ProjectMeetingNotFoundException(String message) {
        super(message);
    }
}
