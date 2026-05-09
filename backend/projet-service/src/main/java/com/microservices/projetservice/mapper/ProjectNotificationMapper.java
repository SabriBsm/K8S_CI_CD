package com.microservices.projetservice.mapper;

import com.microservices.projetservice.dto.request.ProjectNotificationRequestDTO;
import com.microservices.projetservice.dto.response.ProjectNotificationResponseDTO;
import com.microservices.projetservice.entity.ProjectNotification;
import org.mapstruct.*;

@Mapper(componentModel = "spring", unmappedTargetPolicy = ReportingPolicy.IGNORE)
public interface ProjectNotificationMapper {

    //ProjectNotification toEntity(ProjectNotificationRequestDTO requestDTO);

    // ✅ DTO → Entity : projectId → project.id
    @Mapping(source = "projectId", target = "project.id")
    ProjectNotification toEntity(ProjectNotificationRequestDTO requestDTO);

    @Mapping(source = "project", target = "project")
    ProjectNotificationResponseDTO toResponseDTO(ProjectNotification projectNotification);
    @BeanMapping(nullValuePropertyMappingStrategy = NullValuePropertyMappingStrategy.IGNORE)
    void updateEntity(ProjectNotificationRequestDTO requestDTO, @MappingTarget ProjectNotification projectNotification);
}
