package com.microservices.projetservice.enums;


public enum ProjectVisibility {
    PUBLIC("Public"),
    PRIVATE("Privé"),
    CLIENT_ONLY("Client uniquement");

    private final String label;

    ProjectVisibility(String label) {
        this.label = label;
    }

    public String getLabel() {
        return label;
    }
}