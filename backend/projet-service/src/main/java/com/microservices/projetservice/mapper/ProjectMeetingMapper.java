package com.microservices.projetservice.mapper;

import com.microservices.projetservice.dto.request.ProjectMeetingRequestDTO;
import com.microservices.projetservice.dto.response.ProjectMeetingResponseDTO;
import com.microservices.projetservice.entity.ProjectMeeting;
import org.mapstruct.*;

@Mapper(componentModel = "spring", unmappedTargetPolicy = ReportingPolicy.IGNORE)
public interface ProjectMeetingMapper {

    @Mapping(source = "projectId", target = "project.id")
    ProjectMeeting toEntity(ProjectMeetingRequestDTO requestDTO);

    @Mapping(source = "project.id", target = "projectId")
    ProjectMeetingResponseDTO toResponseDTO(ProjectMeeting projectMeeting);

    @Mapping(source = "projectId", target = "project.id")
    @BeanMapping(nullValuePropertyMappingStrategy = NullValuePropertyMappingStrategy.IGNORE)
    void updateEntity(ProjectMeetingRequestDTO requestDTO, @MappingTarget ProjectMeeting projectMeeting);
}
