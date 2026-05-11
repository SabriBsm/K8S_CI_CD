import { Component, EventEmitter, OnDestroy, OnInit, Output } from '@angular/core';
import { Router } from '@angular/router';
import { MenuItem } from 'primeng/api';
import { AuthService } from '../../core/services/auth.service';
import { AuthUser } from '../../core/models/auth.model';
import { forkJoin, interval, Observable, of, Subject } from 'rxjs';
import { catchError, takeUntil } from 'rxjs/operators';
import { NotificationSyncService } from '../../core/services/notification-sync.service';
import { ProjectNotification, ProjectService } from '../../core/services/project.service';
import { AppNotification } from '../../core/models/finance.model';
import { FinanceService } from '../../core/services/finance.service';

type TopbarNotification = ProjectNotification & {
  source: 'project' | 'finance';
};

@Component({
  selector: 'app-topbar',
  templateUrl: './topbar.component.html',
  styleUrl: './topbar.component.scss'
})
export class TopbarComponent implements OnInit, OnDestroy {
  @Output() toggleSidebar = new EventEmitter<void>();

  currentUser: AuthUser | null = null;
  userMenuItems: MenuItem[] = [];
  unreadNotifications: TopbarNotification[] = [];
  notificationCount = 0;
  loadingNotifications = false;

  private destroy$ = new Subject<void>();

  constructor(
    private authService: AuthService,
    private router: Router,
    private projectService: ProjectService,
    private financeService: FinanceService,
    private notificationSyncService: NotificationSyncService
  ) {}

  ngOnInit(): void {
    this.authService.currentUser$
      .pipe(takeUntil(this.destroy$))
      .subscribe(user => {
      this.currentUser = user;
      this.buildUserMenu();
      if (user?.id && user.role === 'CUSTOMER') {
        this.loadUnreadNotifications(user.id);
      } else {
        this.clearNotifications();
      }
    });

    this.notificationSyncService.notificationsChanged$
      .pipe(takeUntil(this.destroy$))
      .subscribe(() => {
        if (this.currentUser?.id) {
          this.refreshUnreadNotifications();
        }
      });

    interval(20000)
      .pipe(takeUntil(this.destroy$))
      .subscribe(() => this.refreshUnreadNotifications());
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private buildUserMenu(): void {
    this.userMenuItems = [
      {
        label: this.currentUser
          ? `${this.currentUser.firstName} ${this.currentUser.lastName}`
          : 'Profile',
        icon: 'pi pi-user',
        command: () => this.router.navigate(['/settings'])
      },
      { separator: true },
      {
        label: 'Settings',
        icon: 'pi pi-cog',
        command: () => this.router.navigate(['/settings'])
      },
      { separator: true },
      {
        label: 'Logout',
        icon: 'pi pi-sign-out',
        command: () => this.authService.logout()
      }
    ];
  }

  getUserInitials(): string {
    if (!this.currentUser) return 'U';
    const firstName = this.currentUser.firstName || '';
    const lastName = this.currentUser.lastName || '';
    if (!firstName && !lastName) return 'U';
    return `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase();
  }

  loadUnreadNotifications(userId: number): void {
    this.loadingNotifications = true;
    forkJoin({
      project: this.projectService.getUnreadNotificationsByUser(userId).pipe(
        catchError((err) => {
          if (!this.isOptionalEndpointUnavailable(err)) {
            console.error('Error loading project unread notifications', err);
          }
          return of([] as ProjectNotification[]);
        })
      ),
      finance: this.financeService.getNotifications().pipe(
        catchError((err) => {
          if (!this.isOptionalEndpointUnavailable(err)) {
            console.error('Error loading finance unread notifications', err);
          }
          return of([] as AppNotification[]);
        })
      )
    })
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: ({ project, finance }) => {
          const projectNotifications = (project || []).map((notification) => ({
            ...notification,
            source: 'project' as const
          }));
          const financeNotifications = (finance || [])
            .filter((notification) => !notification.read)
            .map((notification) => this.mapFinanceNotification(notification));

          this.unreadNotifications = [...projectNotifications, ...financeNotifications]
            .sort((left, right) => new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime());
          this.notificationCount = this.unreadNotifications.length;
          this.loadingNotifications = false;
        },
        error: (err) => {
          console.error('Error loading unread notifications', err);
          this.clearNotifications();
          this.loadingNotifications = false;
        }
      });
  }

  refreshUnreadNotifications(): void {
    if (this.currentUser?.id) {
      this.loadUnreadNotifications(this.currentUser.id);
    }
  }

  markNotificationAsRead(notification: TopbarNotification): void {
    if (!notification?.id) return;

    const request$: Observable<unknown> = notification.source === 'finance'
      ? this.financeService.markNotificationAsRead(notification.id)
      : this.projectService.markNotificationAsRead(notification.id);

    request$
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => this.refreshUnreadNotifications(),
        error: (err: unknown) => console.error('Error marking notification as read', err)
      });
  }

  markAllNotificationsAsRead(): void {
    if (!this.currentUser?.id || this.notificationCount === 0) return;

    forkJoin({
      project: this.projectService.markAllNotificationsAsReadByUser(this.currentUser.id).pipe(catchError(() => of(void 0))),
      finance: this.financeService.markAllNotificationsAsRead().pipe(catchError(() => of(void 0)))
    })
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => this.refreshUnreadNotifications(),
        error: (err) => console.error('Error marking all notifications as read', err)
      });
  }

  getNotificationLabel(notification: TopbarNotification): string {
    const projectName = notification.project?.name?.trim();
    const message = notification.message?.trim();

    if (projectName && message) {
      return `${projectName} · ${message}`;
    }
    return projectName || message || 'New project notification';
  }

  getNotificationBadgeValue(): string {
    if (this.notificationCount <= 0) {
      return '';
    }
    return this.notificationCount > 99 ? '99+' : String(this.notificationCount);
  }

  getPageTitle(): string {
    const url = this.router.url;
    const map: Record<string, string> = {
      '/dashboard': 'Dashboard',
      '/projects': 'Projects',
      '/tasks': 'Tasks',
      '/kanban': 'Kanban Board',
      '/finance': 'Financial Management',
      '/risks': 'Risk Management',
      '/quality': 'Quality Management',
      '/tickets': 'Tickets',
      '/analytics': 'Analytics',
      '/users': 'User Management',
      '/settings': 'Settings'
    };
    const key = Object.keys(map).find(k => url.startsWith(k));
    return key ? map[key] : 'PlanSync Pro';
  }

  private clearNotifications(): void {
    this.unreadNotifications = [];
    this.notificationCount = 0;
  }

  private mapFinanceNotification(notification: AppNotification): TopbarNotification {
    return {
      id: notification.id,
      source: 'finance',
      userId: this.currentUser?.id ?? 'finance',
      message: notification.message || `Rapport financier généré pour le projet ${notification.projectName || ''}`.trim(),
      type: notification.type,
      isRead: notification.read,
      createdAt: notification.createdAt,
      project: notification.projectId
        ? {
            id: notification.projectId,
            name: notification.projectName || 'Finance',
            description: '',
            objectives: '',
            startDate: '',
            endDate: '',
            progress: 0,
            status: 'PLANNED',
            visibility: 'PRIVATE',
            createdBy: '',
            updatedAt: ''
          }
        : undefined
    };
  }

  private isOptionalEndpointUnavailable(error: any): boolean {
    const status = Number(error?.status);
    return status === 404 || status === 503;
  }
}
