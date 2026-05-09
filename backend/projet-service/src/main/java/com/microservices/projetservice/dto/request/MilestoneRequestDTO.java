package com.microservices.projetservice.dto.request;

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
public class MilestoneRequestDTO {

    private Long id;
    private String title;
    private String description;
    private LocalDate dueDate;
    private MilestoneStatus status;
    private Boolean isCritical;
    private Long projectId;
    private LocalDate actualCompletionDate;
}
