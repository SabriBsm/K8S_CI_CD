package com.microservices.userservice.dto.response.analytics;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class UsagePeriodRankingDTO {
    private String scope;
    private Long totalUsers;
    private Long totalSeconds;
    private Double totalMinutes;
    private Double totalHours;
    private List<UsageRankEntryDTO> users;
}

