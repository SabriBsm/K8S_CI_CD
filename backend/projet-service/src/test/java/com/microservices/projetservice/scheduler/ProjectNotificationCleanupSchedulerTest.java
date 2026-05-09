package com.microservices.projetservice.scheduler;

import com.microservices.projetservice.repository.ProjectNotificationRepository;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class ProjectNotificationCleanupSchedulerTest {

    @Mock
    private ProjectNotificationRepository projectNotificationRepository;

    @InjectMocks
    private ProjectNotificationCleanupScheduler scheduler;

    @Test
    void cleanupReadNotificationsShouldDeleteReadNotificationsInBulk() {
        when(projectNotificationRepository.deleteAllReadNotifications()).thenReturn(5);

        scheduler.cleanupReadNotifications();

        verify(projectNotificationRepository).deleteAllReadNotifications();
    }
}

