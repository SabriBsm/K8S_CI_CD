package com.microservices.projetservice.mapper;

import com.microservices.projetservice.dto.request.MilestoneRequestDTO;
import com.microservices.projetservice.dto.response.MilestoneResponseDTO;
import com.microservices.projetservice.dto.response.ProjectMeetingResponseDTO;
import com.microservices.projetservice.entity.Milestone;
import com.microservices.projetservice.entity.ProjectMeeting;
import org.mapstruct.*;

@Mapper(componentModel = "spring", unmappedTargetPolicy = ReportingPolicy.IGNORE)
public interface MilestoneMapper {

    Milestone toEntity(MilestoneRequestDTO requestDTO);


    @Mapping(source = "project", target = "project")
    MilestoneResponseDTO toResponseDTO(Milestone milestone);


    @BeanMapping(nullValuePropertyMappingStrategy = NullValuePropertyMappingStrategy.IGNORE)
    void updateEntity(MilestoneRequestDTO requestDTO, @MappingTarget Milestone milestone);
}
