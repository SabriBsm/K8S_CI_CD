package com.microservices.projetservice.enums;


public enum ProjectStatus {
    PLANNED("Planifié"),
    IN_PROGRESS("En cours"),
    ON_HOLD("En pause"),
    COMPLETED("Terminé"),
    CANCELLED("Annulé");

    private final String label;

    ProjectStatus(String label) {
        this.label = label;
    }

    public String getLabel() {
        return label;
    }

    public boolean isActive() {
        return this == IN_PROGRESS || this == PLANNED;
    }

    public boolean isFinished() {
        return this == COMPLETED || this == CANCELLED;
    }
}