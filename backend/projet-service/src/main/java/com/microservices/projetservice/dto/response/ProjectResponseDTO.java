package com.microservices.projetservice.dto.response;


import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import com.microservices.projetservice.enums.ProjectVisibility;
import com.microservices.projetservice.enums.ProjectStatus;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ProjectResponseDTO {
    private Long id;
    private String name;
    private String description;
    private String objectives;
    private LocalDate startDate;
    private LocalDate endDate;
    private LocalDate actualEndDate;
    private Double progress;
    private ProjectStatus status;
    private ProjectVisibility visibility;
    private String createdBy;
    private String projectManagerId;
    private String customerId; // Username du customer
    private LocalDateTime updatedAt;
    private String aiRecommendation;
    private Long budgetId;
    private List<ProjectMemberResponseDTO> members;
}