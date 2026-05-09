package com.microservices.projetservice.dto.request;

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
public class ProjectDocumentRequestDTO {

    private Long projectId;
    private String name;
    private String description;
    private String fileUrl;
    private ProjectDocumentType type;
    private String version;
    private String uploadedBy;
    private LocalDateTime uploadedAt;
}
