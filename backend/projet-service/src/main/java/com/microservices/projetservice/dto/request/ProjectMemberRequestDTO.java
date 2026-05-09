package com.microservices.projetservice.dto.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ProjectMemberRequestDTO {

    @NotNull(message = "Project ID is required")
    private Long projectId;

    @NotBlank(message = "User identifier is required")
    private String userEmail;


    private Boolean isActive = true;
}

