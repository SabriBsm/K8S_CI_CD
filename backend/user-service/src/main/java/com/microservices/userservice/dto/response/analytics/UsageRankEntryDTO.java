package com.microservices.userservice.dto.response.analytics;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class UsageRankEntryDTO {
    private Long userId;
    private String username;
    private String firstName;
    private String lastName;
    private String email;
    private String role;
    private String displayName;
    private Long totalSeconds;
    private Double totalMinutes;
    private Double totalHours;
}

