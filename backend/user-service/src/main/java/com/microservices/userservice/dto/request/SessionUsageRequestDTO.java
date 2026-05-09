package com.microservices.userservice.dto.request;

import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.PositiveOrZero;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class SessionUsageRequestDTO {

    @NotNull(message = "sessionDurationSeconds is required")
    @PositiveOrZero(message = "sessionDurationSeconds must be positive or zero")
    private Long sessionDurationSeconds;
}
