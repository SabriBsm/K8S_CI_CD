package com.microservices.projetservice.mapper;

import com.microservices.projetservice.dto.request.ProjectMemberRequestDTO;
import com.microservices.projetservice.dto.response.ProjectMemberResponseDTO;
import com.microservices.projetservice.entity.ProjectMember;
import org.mapstruct.Mapper;
import org.mapstruct.Mapping;
import org.mapstruct.MappingTarget;

@Mapper(componentModel = "spring")
public interface ProjectMemberMapper {

    @Mapping(source = "project.id", target = "projectId")
    ProjectMemberResponseDTO toResponseDTO(ProjectMember entity);

    @Mapping(target = "project", ignore = true)
    @Mapping(target = "joinedDate", ignore = true)
    ProjectMember toEntity(ProjectMemberRequestDTO dto);

    @Mapping(target = "project", ignore = true)
    @Mapping(target = "joinedDate", ignore = true)
    void updateEntity(ProjectMemberRequestDTO dto, @MappingTarget ProjectMember entity);
}

