package com.microservices.userservice.entity;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import com.microservices.userservice.enums.UserStatus;
import java.time.LocalDateTime;

@Entity
@Table(name = "users")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class User {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, unique = true, length = 50)
    private String username;

    @Column(nullable = false, length = 255)
    private String password;

    @Column(nullable = false, unique = true, length = 100)
    private String email;

    @Column(length = 50)
    private String firstName;

    @Column(length = 50)
    private String lastName;

    @Column(length = 500)
    private String avatarUrl;

    @Column(length = 20)
    private String phoneNumber;

    @Column(length = 50)
    private String timezone;

    @Column(length = 20)
    private String language;

    @Column(nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @Column(nullable = false)
    private LocalDateTime updatedAt;

    @Column
    private LocalDateTime lastLoginAt;

    @Column
    private Long totalAppUsageSeconds;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private UserStatus status;

    @Column(nullable = false)
    private Boolean emailVerified;

    @Column(nullable = false)
    private Boolean mfaEnabled;

    @Column(nullable = false)
    private Integer failedLoginAttempts;

    @Column(length = 50, nullable = false)
    private String role;

    @Column(length = 255)
    private String resetToken;

    @Column
    private LocalDateTime resetTokenExpiry;


    @PrePersist
    protected void onCreate() {
        createdAt = LocalDateTime.now();
        updatedAt = LocalDateTime.now();
        applyDefaultValues();
    }

    @PreUpdate
    protected void onUpdate() {
        updatedAt = LocalDateTime.now();
        applyDefaultValues();
    }

    private void applyDefaultValues() {
        if (emailVerified == null) {
            emailVerified = false;
        }
        if (mfaEnabled == null) {
            mfaEnabled = false;
        }
        if (failedLoginAttempts == null) {
            failedLoginAttempts = 0;
        }
        if (status == null) {
            status = UserStatus.PENDING;
        }
        if (role == null || role.isBlank()) {
            role = "PROJECT_MEMBER";
        }
        if (totalAppUsageSeconds == null) {
            totalAppUsageSeconds = 0L;
        }
    }
}

