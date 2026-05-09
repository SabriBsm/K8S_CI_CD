package com.microservices.projetservice.dto;

import java.time.LocalDateTime;

public record ProjectDTO(
        Long id,
        String name,
        String description,
        String status,
        LocalDateTime createdDate,
        String ownerId
) {
}
