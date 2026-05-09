package com.microservices.projetservice.scheduler;

import com.microservices.projetservice.repository.ProjectNotificationRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

@Component
@RequiredArgsConstructor
@Slf4j
public class ProjectNotificationCleanupScheduler {

    private final ProjectNotificationRepository projectNotificationRepository;
  @Scheduled(cron = "${app.notifications.cleanup-cron:0 0 8 * * *}", zone = "${app.notifications.cleanup-timezone:Africa/Tunis}")

  //@Scheduled(cron = "0 50 12 * * *", zone = "${app.notifications.cleanup-timezone:Africa/Tunis}")
    @Transactional
    public void cleanupReadNotifications() {
        int deletedNotifications = projectNotificationRepository.deleteAllReadNotifications();
        log.info("Daily notification cleanup completed: {} read notifications deleted", deletedNotifications);
    }
}

