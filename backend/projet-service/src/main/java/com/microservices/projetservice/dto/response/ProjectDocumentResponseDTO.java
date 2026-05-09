package com.microservices.projetservice.dto.response;

import com.microservices.projetservice.enums.ProjectDocumentType;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import java.time.LocalDateTime;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ProjectDocumentResponseDTO {

    private Long id;
    private ProjectResponseDTO project;

    private String name;
    private String description;
    private String fileUrl;
    private ProjectDocumentType type;
    private String version;
    private String uploadedBy;
    private LocalDateTime uploadedAt;
}
