package com.microservices.userservice.entity;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.EqualsAndHashCode;
import lombok.NoArgsConstructor;
import lombok.ToString;

import java.time.LocalDateTime;

@Entity
@Table(name = "user_usage_sessions", indexes = {
        @Index(name = "idx_user_usage_sessions_user_started", columnList = "user_id,session_started_at"),
        @Index(name = "idx_user_usage_sessions_ended_at", columnList = "session_ended_at")
})
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class UserUsageSession {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "user_id", nullable = false)
    @ToString.Exclude
    @EqualsAndHashCode.Exclude
    private User user;

    @Column(name = "session_started_at", nullable = false)
    private LocalDateTime sessionStartedAt;

    @Column(name = "session_ended_at", nullable = false)
    private LocalDateTime sessionEndedAt;

    @Column(name = "session_duration_seconds", nullable = false)
    private Long sessionDurationSeconds;

    @Column(name = "recorded_at", nullable = false, updatable = false)
    private LocalDateTime recordedAt;

    @PrePersist
    protected void onCreate() {
        if (recordedAt == null) {
            recordedAt = sessionEndedAt != null ? sessionEndedAt : LocalDateTime.now();
        }
    }
}

