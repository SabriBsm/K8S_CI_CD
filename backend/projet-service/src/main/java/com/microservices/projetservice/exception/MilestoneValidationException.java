package com.microservices.projetservice.exception;

public class MilestoneValidationException extends RuntimeException {
    public MilestoneValidationException(String message) {
        super(message);
    }
}
