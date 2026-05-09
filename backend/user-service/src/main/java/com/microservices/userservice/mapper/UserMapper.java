package com.microservices.userservice.mapper;

import com.microservices.userservice.dto.request.UserRequestDTO;
import com.microservices.userservice.dto.request.UpdateUserRequestDTO;
import com.microservices.userservice.dto.response.UserResponseDTO;
import com.microservices.userservice.entity.User;
import org.mapstruct.*;
import org.springframework.stereotype.Component;

@Mapper(componentModel = "spring", unmappedTargetPolicy = ReportingPolicy.IGNORE)
@Component
public interface UserMapper {

    UserResponseDTO toResponseDTO(User user);

    User toEntity(UserRequestDTO dto);

    @Mapping(target = "id", ignore = true)
    @Mapping(target = "createdAt", ignore = true)
    @Mapping(target = "updatedAt", ignore = true)
    @Mapping(target = "username", ignore = true)
    @Mapping(target = "email", ignore = true)
    @Mapping(target = "password", ignore = true)
    @Mapping(target = "resetToken", ignore = true)
    @Mapping(target = "resetTokenExpiry", ignore = true)
    @BeanMapping(nullValuePropertyMappingStrategy = NullValuePropertyMappingStrategy.IGNORE)
    void updateEntityFromDTO(UpdateUserRequestDTO dto, @MappingTarget User user);
}

