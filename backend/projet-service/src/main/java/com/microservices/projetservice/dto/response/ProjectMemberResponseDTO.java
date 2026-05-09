package com.microservices.projetservice.dto.response;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import java.time.LocalDateTime;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ProjectMemberResponseDTO {

    private Long id;
    private Long projectId;
    private String userId;
    private String role;
    private LocalDateTime joinedDate;
    private Boolean isActive;
}

