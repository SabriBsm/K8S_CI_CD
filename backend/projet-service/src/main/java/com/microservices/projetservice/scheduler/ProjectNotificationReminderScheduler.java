package com.microservices.projetservice.scheduler;

import com.microservices.projetservice.entity.ProjectNotification;
import com.microservices.projetservice.feign.UserDTO;
import com.microservices.projetservice.feign.UserServiceClient;
import com.microservices.projetservice.repository.ProjectNotificationRepository;
import com.microservices.projetservice.service.ProjectNotificationEmailService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;

@Component
@RequiredArgsConstructor
@Slf4j
public class ProjectNotificationReminderScheduler {

    private final ProjectNotificationRepository projectNotificationRepository;
    private final ProjectNotificationEmailService projectNotificationEmailService;
    private final UserServiceClient userServiceClient;

    @Scheduled(cron = "${app.notifications.reminder-cron:0 0 9 * * *}")
    @Transactional
    public void sendUnreadNotificationReminders() {
        int reminderDays = 3;
        LocalDateTime cutoff = LocalDateTime.now().minusDays(reminderDays);

        List<ProjectNotification> pendingNotifications = projectNotificationRepository
                .findEligibleForReminder(cutoff);

        if (pendingNotifications.isEmpty()) {
            log.debug("No unread notifications eligible for reminder");
            return;
        }

        log.info("Sending reminder emails for {} unread notifications", pendingNotifications.size());

        for (ProjectNotification notification : pendingNotifications) {
            try {
                if (notification.getProject() == null || notification.getUserId() == null) {
                    log.warn("Skipping notification {} because project or userId is missing", notification.getId());
                    continue;
                }

                UserDTO user = userServiceClient.getUserById(String.valueOf(notification.getUserId()));
                if (user == null || user.getEmail() == null || user.getEmail().isBlank()) {
                    log.warn("Skipping reminder for notification {} because user email is missing", notification.getId());
                    continue;
                }

                String recipientName = user.getFirstName();
                if (recipientName == null || recipientName.isBlank()) {
                    recipientName = user.getUsername();
                }

                projectNotificationEmailService.sendUnreadNotificationReminderEmail(
                        user.getEmail(),
                        recipientName,
                        notification.getProject().getName(),
                        notification.getMessage()
                );

                notification.setReminderSent(true);
                notification.setReminderSentAt(LocalDateTime.now());
            } catch (Exception ex) {
                log.warn("Failed to send reminder email for notification {}", notification.getId(), ex);
            }
        }

        projectNotificationRepository.saveAll(pendingNotifications);
    }
}

