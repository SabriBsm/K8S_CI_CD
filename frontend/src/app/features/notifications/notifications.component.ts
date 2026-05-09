import { Component, OnDestroy, OnInit } from '@angular/core';
import { Subject, takeUntil } from 'rxjs';
import { AuthService } from '../../core/services/auth.service';
import { NotificationSyncService } from '../../core/services/notification-sync.service';
import { ProjectNotification, ProjectService } from '../../core/services/project.service';

type NotificationGroup = {
  projectId: number | null;
  projectName: string;
  unreadCount: number;
  notifications: ProjectNotification[];
};

@Component({
  selector: 'app-notifications',
  templateUrl: './notifications.component.html',
  styleUrl: './notifications.component.scss'
})
export class NotificationsComponent implements OnInit, OnDestroy {
  private readonly destroy$ = new Subject<void>();

  loading = false;
  groups: NotificationGroup[] = [];
  error: string | null = null;

  constructor(
    private auth: AuthService,
    private projectService: ProjectService,
    private notificationSyncService: NotificationSyncService
  ) {}

  ngOnInit(): void {
    this.load();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  load(): void {
    const user = this.auth.getCurrentUser();
    if (!user?.id) {
      this.groups = [];
      this.loading = false;
      return;
    }

    this.loading = true;
    this.error = null;

    this.projectService.getNotificationsByUser(user.id)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (notifications) => {
          this.groups = this.groupByProject(notifications ?? []);
          this.loading = false;
        },
        error: (err: any) => {
          this.loading = false;
          this.groups = [];
          this.error = err?.error?.message || 'Failed to load notifications';
        }
      });
  }

  markAsRead(n: ProjectNotification): void {
    if (!n?.id || n.isRead) return;
    this.projectService.markNotificationAsRead(n.id)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          this.load();
          this.notificationSyncService.requestNotificationRefresh();
        },
        error: (err: any) => {
          this.error = err?.error?.message || 'Failed to mark notification as read';
        }
      });
  }

  markAllAsRead(): void {
    const user = this.auth.getCurrentUser();
    if (!user?.id) return;
    this.projectService.markAllNotificationsAsReadByUser(user.id)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          this.load();
          this.notificationSyncService.requestNotificationRefresh();
        },
        error: (err: any) => {
          this.error = err?.error?.message || 'Failed to mark all notifications as read';
        }
      });
  }

  getSeverity(type: string): 'success' | 'info' | 'warning' | 'danger' | undefined {
    switch (type) {
      case 'PROJECT_COMPLETED': return 'success';
      case 'MILESTONE_DELAYED': return 'danger';
      case 'RISK_HIGH': return 'danger';
      case 'DOCUMENT_ADDED': return 'info';
      case 'MEETING_SCHEDULED': return 'info';
      case 'TEAM_CHANGE': return 'success';
      case 'MEMBER_ADDED': return 'success';
      default: return 'info';
    }
  }

  private groupByProject(notifications: ProjectNotification[]): NotificationGroup[] {
    // Unread first, then newest first.
    const sorted = [...notifications].sort((a, b) => {
      const ar = a.isRead ? 1 : 0;
      const br = b.isRead ? 1 : 0;
      if (ar !== br) return ar - br;
      const ad = Date.parse(a.createdAt || '') || 0;
      const bd = Date.parse(b.createdAt || '') || 0;
      return bd - ad;
    });

    const map = new Map<string, NotificationGroup>();
    for (const n of sorted) {
      const projectId = n.project?.id ?? null;
      const projectName = n.project?.name?.trim() || (projectId != null ? `Project #${projectId}` : 'No project');
      const key = String(projectId ?? 'none');
      const existing = map.get(key);
      if (!existing) {
        map.set(key, {
          projectId,
          projectName,
          unreadCount: n.isRead ? 0 : 1,
          notifications: [n]
        });
      } else {
        existing.notifications.push(n);
        if (!n.isRead) existing.unreadCount += 1;
      }
    }

    // Sort groups: most unread first, then project name.
    return Array.from(map.values()).sort((a, b) => {
      if (a.unreadCount !== b.unreadCount) return b.unreadCount - a.unreadCount;
      return a.projectName.localeCompare(b.projectName);
    });
  }
}

