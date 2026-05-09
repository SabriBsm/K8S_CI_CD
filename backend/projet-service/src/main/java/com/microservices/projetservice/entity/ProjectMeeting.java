package com.microservices.projetservice.entity;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import java.time.LocalDate;
import java.time.LocalTime;
import java.time.LocalDateTime;

@Entity
@Table(name = "project_meetings")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ProjectMeeting {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "project_id")
    private Project project;

    @Column(nullable = false, length = 200)
    private String title;

    @Column(length = 2000)
    private String description;

    @Column(name = "meeting_date", nullable = false)
    private LocalDate meetingDate;

    @Column(name = "start_time")
    private LocalTime startTime;

    @Column(name = "end_time")
    private LocalTime endTime;

    @Column(length = 500)
    private String location;

    @Column(name = "meeting_link", length = 2000)
    private String meetingLink;

    @Column(length = 2000)
    private String status;

    @Column(name = "created_by", nullable = false)
    private String createdBy;

    @PrePersist
    @PreUpdate
    void normalizeStatus() {
        if (status == null || status.isBlank()) {
            status = "SCHEDULED";
        }
    }
}
