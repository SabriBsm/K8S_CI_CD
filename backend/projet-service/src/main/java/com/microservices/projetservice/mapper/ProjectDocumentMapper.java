package com.microservices.projetservice.mapper;

import com.microservices.projetservice.dto.request.ProjectDocumentRequestDTO;
import com.microservices.projetservice.dto.response.ProjectDocumentResponseDTO;
import com.microservices.projetservice.entity.ProjectDocument;
import org.mapstruct.*;

@Mapper(componentModel = "spring", unmappedTargetPolicy = ReportingPolicy.IGNORE)
public interface ProjectDocumentMapper {

    ProjectDocument toEntity(ProjectDocumentRequestDTO requestDTO);
    @Mapping(source = "project", target = "project")
    ProjectDocumentResponseDTO toResponseDTO(ProjectDocument projectDocument);

    @BeanMapping(nullValuePropertyMappingStrategy = NullValuePropertyMappingStrategy.IGNORE)
    void updateEntity(ProjectDocumentRequestDTO requestDTO, @MappingTarget ProjectDocument projectDocument);
}
