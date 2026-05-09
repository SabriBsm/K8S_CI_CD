package com.microservices.projetservice.exception;

public class MilestoneNotFoundException extends RuntimeException {
    public MilestoneNotFoundException(String message) {
        super(message);
    }
}
