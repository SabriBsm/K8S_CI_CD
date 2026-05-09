package com.microservices.projetservice.exception;

public class ProjectDocumentValidationException extends RuntimeException {
    public ProjectDocumentValidationException(String message) {
        super(message);
    }
}
