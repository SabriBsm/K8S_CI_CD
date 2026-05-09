package com.microservices.projetservice.exception;


public class ProjectValidationException extends RuntimeException {
    public ProjectValidationException(String message) {
        super(message);
    }
}