package com.microservices.projetservice.mapper;


import com.microservices.projetservice.dto.request.ProjectRequestDTO;
import com.microservices.projetservice.dto.response.ProjectResponseDTO;
import com.microservices.projetservice.entity.Project;
import org.mapstruct.*;

@Mapper(componentModel = "spring", unmappedTargetPolicy = ReportingPolicy.IGNORE, uses = ProjectMemberMapper.class)
public interface ProjectMapper {

    Project toEntity(ProjectRequestDTO requestDTO);

    @Mapping(source = "members", target = "members")
    ProjectResponseDTO toResponseDTO(Project project);

    @BeanMapping(nullValuePropertyMappingStrategy = NullValuePropertyMappingStrategy.IGNORE)
    @Mapping(source = "progress", target = "progress")
    void updateEntity(ProjectRequestDTO requestDTO, @MappingTarget Project project);
}