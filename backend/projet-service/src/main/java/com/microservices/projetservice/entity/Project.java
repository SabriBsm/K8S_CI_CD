package com.microservices.projetservice.entity;

import com.microservices.projetservice.enums.ProjectStatus;
import com.microservices.projetservice.enums.ProjectVisibility;
import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.springframework.data.annotation.LastModifiedDate;
import org.springframework.data.jpa.domain.support.AuditingEntityListener;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
//test merge
@Entity
@Table(name = "projects")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@EntityListeners(AuditingEntityListener.class)
public class Project {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, length = 100)
    private String name;

    @Column(length = 500)
    private String description;

    @Column(length = 1000)
    private String objectives;

    @Column(name = "start_date", nullable = false)
    private LocalDate startDate;

    @Column(name = "end_date", nullable = false)
    private LocalDate endDate;

    @Column(name = "actual_end_date")
    private LocalDate actualEndDate;

    @Column(nullable = false)
    private Double progress = 0.0;

    @Column(nullable = false)
    @Enumerated(EnumType.STRING)
    private ProjectStatus status = ProjectStatus.PLANNED;

    @Column(nullable = false)
    @Enumerated(EnumType.STRING)
    private ProjectVisibility visibility = ProjectVisibility.PRIVATE;

    @Column(name = "project_manager_id")
    private String projectManagerId;

    @Column(name = "customer_id")
    private String customerId; // Username du customer

    @Column(name = "created_by", nullable = false)
    private String createdBy;

    @Column(name = "updated_at")
    @LastModifiedDate
    private LocalDateTime updatedAt;

    @Column(name = "ai_recommendation", columnDefinition = "TEXT")
    private String aiRecommendation;

    @Column(name = "budget_id")
    private Long budgetId;

    @OneToMany(mappedBy = "project", cascade = CascadeType.ALL, fetch = FetchType.LAZY)
    private List<ProjectMember> members = new ArrayList<>();

    @OneToMany(mappedBy = "project", cascade = CascadeType.ALL, fetch = FetchType.LAZY)
    private List<ProjectDocument> projectDocuments = new ArrayList<>();

    @OneToMany(mappedBy = "project", cascade = CascadeType.ALL, fetch = FetchType.LAZY)
    private List<ProjectMeeting> projectMeetings = new ArrayList<>();

    @OneToMany(mappedBy = "project", cascade = CascadeType.ALL, fetch = FetchType.LAZY)
    private List<ProjectNotification> projectNotifications = new ArrayList<>();

    @OneToMany(mappedBy = "project", cascade = CascadeType.ALL, fetch = FetchType.LAZY)
    private List<Milestone> milestones = new ArrayList<>();

    @PrePersist
    public void setDefaultValues() {
        if (this.progress == null) this.progress = 0.0;
        if (this.status == null) this.status = ProjectStatus.PLANNED;
        if (this.visibility == null) this.visibility = ProjectVisibility.PRIVATE;
    }

    @PreUpdate
    public void ensureDefaultValues() {
        if (this.progress == null) {
            this.progress = 0.0;
        }

        if (this.status == null) {
            this.status = ProjectStatus.PLANNED;
        }

        if (this.visibility == null) {
            this.visibility = ProjectVisibility.PRIVATE;
        }
    }
}