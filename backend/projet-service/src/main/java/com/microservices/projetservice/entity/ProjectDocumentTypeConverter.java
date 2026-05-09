package com.microservices.projetservice.entity;

import com.microservices.projetservice.enums.ProjectDocumentType;
import jakarta.persistence.AttributeConverter;
import jakarta.persistence.Converter;

@Converter(autoApply = false)
public class ProjectDocumentTypeConverter implements AttributeConverter<ProjectDocumentType, String> {

    @Override
    public String convertToDatabaseColumn(ProjectDocumentType attribute) {
        return attribute != null ? attribute.name() : null;
    }

    @Override
    public ProjectDocumentType convertToEntityAttribute(String dbData) {
        if (dbData == null || dbData.isBlank()) {
            return null;
        }

        try {
            return ProjectDocumentType.valueOf(dbData.trim().toUpperCase());
        } catch (IllegalArgumentException ex) {
            return ProjectDocumentType.OTHER;
        }
    }
}

