package com.microservices.projetservice.exception;

public class ProjectDocumentNotFoundException extends RuntimeException {
    public ProjectDocumentNotFoundException(String message) {
        super(message);
    }
}
