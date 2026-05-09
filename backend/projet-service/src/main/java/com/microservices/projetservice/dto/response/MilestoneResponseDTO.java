package com.microservices.projetservice.dto.response;

import com.microservices.projetservice.enums.MilestoneStatus;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import java.time.LocalDate;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class MilestoneResponseDTO {

    private Long id;
    private String title;
    private String description;
    private LocalDate dueDate;
    private MilestoneStatus status;
    private Boolean isCritical;
    private ProjectResponseDTO project;
    private LocalDate actualCompletionDate;
}
