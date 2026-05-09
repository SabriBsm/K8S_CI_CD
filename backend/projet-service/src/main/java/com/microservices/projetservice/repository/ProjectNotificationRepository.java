package com.microservices.projetservice.repository;

import com.microservices.projetservice.entity.ProjectNotification;
import com.microservices.projetservice.enums.NotificationType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;
import java.time.LocalDateTime;
import java.util.Collection;
import java.util.List;

@Repository
public interface ProjectNotificationRepository extends JpaRepository<ProjectNotification, Long> {

    List<ProjectNotification> findByProjectId(Long projectId);

    List<ProjectNotification> findByProjectIdIn(Collection<Long> projectIds);

    List<ProjectNotification> findByUserId(Long userId);

    List<ProjectNotification> findByType(NotificationType type);

    List<ProjectNotification> findByIsRead(Boolean isRead);

    List<ProjectNotification> findByProjectIdAndIsRead(Long projectId, Boolean isRead);

    List<ProjectNotification> findByUserIdAndIsRead(Long userId, Boolean isRead);

    @Query("""
            select n from ProjectNotification n
            where n.isRead = false
              and (n.reminderSent = false or n.reminderSent is null)
              and n.createdAt < :createdAt
            """)
    List<ProjectNotification> findEligibleForReminder(@Param("createdAt") LocalDateTime createdAt);

    @Modifying(flushAutomatically = true, clearAutomatically = true)
    @Query("""
            delete from ProjectNotification n
            where n.isRead = true
            """)
    int deleteAllReadNotifications();
}
