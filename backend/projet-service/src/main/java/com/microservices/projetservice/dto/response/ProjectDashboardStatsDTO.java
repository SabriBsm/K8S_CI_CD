package com.microservices.projetservice.dto.response;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;
import java.util.Map;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ProjectDashboardStatsDTO {
    private String scope;
    private String userId;
    private Long totalProjects;
    private Long activeProjects;
    private Long completedProjects;
    private Long delayedProjects;
    private Double averageProgress;
    private Double completionRate;
    private Map<String, Long> projectsByStatus;

    private Long totalMembers;
    private Long activeMembers;
    private Map<String, Long> membersByRole;

    private Long totalMilestones;
    private Long plannedMilestones;
    private Long inProgressMilestones;
    private Long achievedMilestones;
    private Long missedMilestones;
    private Long cancelledMilestones;
    private Long criticalMilestones;
    private Long overdueMilestones;
    private Map<String, Long> milestonesByStatus;

    private Long totalMeetings;
    private Long upcomingMeetings;
    private Long pastMeetings;
    private Map<String, Long> meetingsByStatus;

    private Long totalDocuments;
    private Map<String, Long> documentsByType;

    private Long totalNotifications;
    private Long unreadNotifications;
    private Map<String, Long> notificationsByType;

    private LocalDateTime generatedAt;
}

