import { Component, OnDestroy, OnInit } from '@angular/core';
import { Subject, takeUntil } from 'rxjs';
import { AuthService } from '../../core/services/auth.service';
import { AuthUser } from '../../core/models/auth.model';
import { ProjectDashboardStats, ProjectService } from '../../core/services/project.service';

interface StatCard {
  label: string;
  value: string | number;
  icon: string;
  iconBg: string;
  iconColor: string;
  hint?: string;
}

interface DashboardMetric {
  label: string;
  value: number | string;
  icon: string;
  color: string;
}

interface KeyValueItem {
  label: string;
  value: number;
}

interface AnalysisWindowOption {
  label: string;
  value: string;
}

@Component({
  selector: 'app-dashboard',
  templateUrl: './dashboard.component.html',
  styleUrl: './dashboard.component.scss'
})
export class DashboardComponent implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();

  currentUser: AuthUser | null = null;
  loading = true;
  dashboardStats: ProjectDashboardStats | null = null;
  selectedAnalysisWindow = '30D';
  analysisWindowOptions: AnalysisWindowOption[] = [
    { label: '7 days', value: '7D' },
    { label: '30 days', value: '30D' },
    { label: '90 days', value: '90D' },
    { label: '1 year', value: '1Y' },
    { label: 'All time', value: 'ALL' }
  ];

  statCards: StatCard[] = [];
  headlineMetrics: DashboardMetric[] = [];
  portfolioHealthScore = 0;
  projectStatusBreakdown: KeyValueItem[] = [];
  milestoneBreakdown: KeyValueItem[] = [];
  meetingBreakdown: KeyValueItem[] = [];
  documentBreakdown: KeyValueItem[] = [];
  notificationBreakdown: KeyValueItem[] = [];
  memberBreakdown: KeyValueItem[] = [];

  lineChartData: any;
  lineChartOptions: any;
  projectStatusChartData: any;
  projectStatusChartOptions: any;
  milestoneChartData: any;
  milestoneChartOptions: any;
  meetingChartData: any;
  meetingChartOptions: any;
  documentChartData: any;
  documentChartOptions: any;
  notificationChartData: any;
  notificationChartOptions: any;
  operationalChartData: any;
  operationalChartOptions: any;
  customerProjectCount = 0;
  customerCompletedProjects = 0;
  customerPlannedProjects = 0;

  constructor(
    private authService: AuthService,
    private projectService: ProjectService
  ) {}

  ngOnInit(): void {
    this.authService.currentUser$
      .pipe(takeUntil(this.destroy$))
      .subscribe(user => {
        this.currentUser = user;
        if (user) {
          this.loadDashboard();
        } else {
          this.loading = false;
          this.syncEmptyState();
          this.buildCharts();
        }
      });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  refresh(): void {
    this.loadDashboard();
  }

  onAnalysisWindowChange(window: string): void {
    this.selectedAnalysisWindow = window || '30D';
    this.loadDashboard();
  }

  getGreeting(): string {
    const h = new Date().getHours();
    if (h < 12) return 'Good morning';
    if (h < 18) return 'Good afternoon';
    return 'Good evening';
  }

  isCustomerUser(): boolean {
    const role = this.currentUser?.role;
    return role === 'CUSTOMER' || role === 'CLIENT' || role === 'ROLE_CLIENT';
  }

  get customerCompletedVsPlannedRatio(): string {
    return `${this.customerCompletedProjects} / ${this.customerPlannedProjects}`;
  }


  get portfolioHealthLabel(): string {
    if (this.portfolioHealthScore >= 80) return 'Excellent';
    if (this.portfolioHealthScore >= 65) return 'Good';
    if (this.portfolioHealthScore >= 45) return 'Attention needed';
    return 'Critical';
  }

  private loadDashboard(): void {
    this.loading = true;
    this.projectService.getDashboardStats(this.currentUser?.id?.toString(), this.selectedAnalysisWindow)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: stats => {
          this.dashboardStats = stats;
          this.syncViewsFromStats(stats);
          if (this.isCustomerUser()) {
            this.loadCustomerProjectMetrics();
          } else {
            this.buildCharts();
            this.loading = false;
          }
        },
        error: error => {
          console.error('Error loading project dashboard stats', error);
          this.dashboardStats = null;
          this.syncEmptyState();
          this.buildCharts();
          this.loading = false;
        }
      });
  }

  private loadCustomerProjectMetrics(): void {
    const userId = this.currentUser?.id;
    if (!userId) {
      this.customerProjectCount = 0;
      this.customerCompletedProjects = 0;
      this.customerPlannedProjects = 0;
      this.loading = false;
      return;
    }

    this.projectService.getProjectsByUser(String(userId))
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: projects => {
          const customerProjects = (projects || []).filter(project =>
            String(project.customerId ?? '') === String(userId) &&
            project.visibility === 'PUBLIC'
          );

          this.customerProjectCount = customerProjects.length;
          this.customerCompletedProjects = customerProjects.filter(project => project.status === 'COMPLETED').length;
          this.customerPlannedProjects = customerProjects.filter(project => project.status === 'PLANNED').length;
          this.loading = false;
        },
        error: () => {
          this.customerProjectCount = 0;
          this.customerCompletedProjects = 0;
          this.customerPlannedProjects = 0;
          this.loading = false;
        }
      });
  }

  private syncViewsFromStats(stats: ProjectDashboardStats): void {
    this.portfolioHealthScore = this.computePortfolioHealthScore(stats);
    this.statCards = [
      { label: 'Total Projects', value: stats.totalProjects, icon: 'pi pi-briefcase', iconBg: '#ede9fe', iconColor: '#6d28d9', hint: `${stats.activeProjects} active` },
      { label: 'Completion Rate', value: `${this.formatPercent(stats.completionRate)}%`, icon: 'pi pi-chart-line', iconBg: '#dbeafe', iconColor: '#1d4ed8', hint: `${stats.completedProjects} completed` },
      { label: 'Delayed Projects', value: stats.delayedProjects, icon: 'pi pi-exclamation-triangle', iconBg: '#fee2e2', iconColor: '#dc2626', hint: `${this.formatPercent(stats.averageProgress)}% avg progress` },
      { label: 'Unread Notifications', value: stats.unreadNotifications, icon: 'pi pi-bell', iconBg: '#fef3c7', iconColor: '#92400e', hint: `${stats.totalNotifications} total notifications` }
    ];

    this.headlineMetrics = [
      { label: 'Average progress', value: `${this.formatPercent(stats.averageProgress)}%`, icon: 'pi pi-chart-bar', color: '#2563eb' },
      { label: 'Active members', value: stats.activeMembers, icon: 'pi pi-users', color: '#16a34a' },
      { label: 'Critical milestones', value: stats.criticalMilestones, icon: 'pi pi-flag', color: '#dc2626' },
      { label: 'Upcoming meetings', value: stats.upcomingMeetings, icon: 'pi pi-calendar', color: '#0ea5e9' }
    ];

    this.projectStatusBreakdown = this.toKeyValueList(stats.projectsByStatus, ['PLANNED', 'IN_PROGRESS', 'COMPLETED', 'ON_HOLD', 'CANCELLED']);
    this.milestoneBreakdown = this.toKeyValueList(stats.milestonesByStatus, ['PENDING', 'IN_PROGRESS', 'ACHIEVED', 'MISSED', 'CANCELLED']);
    this.meetingBreakdown = this.toKeyValueList(stats.meetingsByStatus, ['SCHEDULED', 'COMPLETED', 'CANCELLED']);
    this.documentBreakdown = this.toKeyValueList(stats.documentsByType, ['SPECIFICATIONS', 'ARCHITECTURE', 'DESIGN', 'TEST_PLAN', 'DOCUMENTATION', 'RELEASE_NOTES', 'OTHER']);
    this.notificationBreakdown = this.toKeyValueList(stats.notificationsByType, ['DEADLINE_APPROACHING', 'MILESTONE_ACHIEVED', 'RISK_DETECTED', 'PROGRESS_UPDATE', 'TEAM_CHANGE', 'MEMBER_ADDED', 'BUDGET_ALERT', 'QUALITY_ISSUE', 'MEETING_SCHEDULED', 'STATUS_CHANGED']);
    this.memberBreakdown = this.toKeyValueList(stats.membersByRole, ['PROJECT_MANAGER', 'CUSTOMER', 'PROJECT_MEMBER', 'ADMIN']);
  }

  private syncEmptyState(): void {
    this.statCards = [
      { label: 'Total Projects', value: 0, icon: 'pi pi-briefcase', iconBg: '#ede9fe', iconColor: '#6d28d9' },
      { label: 'Completion Rate', value: '0%', icon: 'pi pi-chart-line', iconBg: '#dbeafe', iconColor: '#1d4ed8' },
      { label: 'Delayed Projects', value: 0, icon: 'pi pi-exclamation-triangle', iconBg: '#fee2e2', iconColor: '#dc2626' },
      { label: 'Unread Notifications', value: 0, icon: 'pi pi-bell', iconBg: '#fef3c7', iconColor: '#92400e' }
    ];

    this.headlineMetrics = [
      { label: 'Average progress', value: '0%', icon: 'pi pi-chart-bar', color: '#2563eb' },
      { label: 'Active members', value: 0, icon: 'pi pi-users', color: '#16a34a' },
      { label: 'Critical milestones', value: 0, icon: 'pi pi-flag', color: '#dc2626' },
      { label: 'Upcoming meetings', value: 0, icon: 'pi pi-calendar', color: '#0ea5e9' }
    ];

    this.projectStatusBreakdown = [];
    this.milestoneBreakdown = [];
    this.meetingBreakdown = [];
    this.documentBreakdown = [];
    this.notificationBreakdown = [];
    this.memberBreakdown = [];
  }

  private buildCharts(): void {
    const stats = this.dashboardStats;
    if (!stats) {
      return;
    }

    const textColor = '#475569';
    const gridColor = '#e2e8f0';

    const projectStatusEntries = this.projectStatusBreakdown;
    const milestoneEntries = this.milestoneBreakdown;
    const meetingEntries = this.meetingBreakdown;
    const documentEntries = this.documentBreakdown;
    const notificationEntries = this.notificationBreakdown;

    this.lineChartData = {
      labels: projectStatusEntries.map(item => item.label),
      datasets: [{
        label: 'Projects by status',
        data: projectStatusEntries.map(item => item.value),
        borderColor: '#6366f1',
        backgroundColor: 'rgba(99,102,241,0.15)',
        fill: true,
        tension: 0.35,
        pointBackgroundColor: '#6366f1',
        pointRadius: 4
      }]
    };

    this.lineChartOptions = {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { labels: { color: textColor, font: { size: 12, family: 'Inter' } } }
      },
      scales: {
        x: { ticks: { color: textColor }, grid: { color: gridColor } },
        y: { ticks: { color: textColor }, grid: { color: gridColor } }
      }
    };

    this.projectStatusChartData = this.buildDoughnutData(projectStatusEntries, ['#94a3b8', '#2563eb', '#16a34a', '#f59e0b', '#dc2626']);
    this.milestoneChartData = this.buildBarData(milestoneEntries, '#7c3aed');
    this.meetingChartData = this.buildDoughnutData(meetingEntries, ['#0ea5e9', '#16a34a', '#dc2626']);
    this.documentChartData = this.buildBarData(documentEntries, '#0f766e');
    this.notificationChartData = this.buildDoughnutData(notificationEntries, ['#2563eb', '#16a34a', '#dc2626', '#f59e0b', '#7c3aed', '#0ea5e9', '#ca8a04', '#ef4444', '#14b8a6', '#9333ea']);
    this.operationalChartData = {
      labels: ['Projects', 'Members', 'Milestones', 'Meetings', 'Documents', 'Notifications'],
      datasets: [{
        label: 'Portfolio volume',
        data: [
          stats.totalProjects,
          stats.totalMembers,
          stats.totalMilestones,
          stats.totalMeetings,
          stats.totalDocuments,
          stats.totalNotifications
        ],
        backgroundColor: ['#6366f1', '#16a34a', '#7c3aed', '#0ea5e9', '#0f766e', '#f59e0b'],
        borderRadius: 8
      }]
    };

    const sharedLegend = {
      position: 'bottom' as const,
      labels: {
        color: textColor,
        font: { size: 12, family: 'Inter' },
        padding: 14
      }
    };

    const sharedBarOptions = {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false }
      },
      scales: {
        x: { ticks: { color: textColor }, grid: { color: gridColor } },
        y: { ticks: { color: textColor }, grid: { color: gridColor } }
      }
    };

    this.projectStatusChartOptions = { responsive: true, maintainAspectRatio: false, plugins: { legend: sharedLegend }, cutout: '68%' };
    this.milestoneChartOptions = sharedBarOptions;
    this.meetingChartOptions = { responsive: true, maintainAspectRatio: false, plugins: { legend: sharedLegend }, cutout: '68%' };
    this.documentChartOptions = sharedBarOptions;
    this.notificationChartOptions = { responsive: true, maintainAspectRatio: false, plugins: { legend: sharedLegend }, cutout: '68%' };
    this.operationalChartOptions = {
      ...sharedBarOptions,
      indexAxis: 'y' as const,
      plugins: { legend: { display: false } }
    };
  }

  private toKeyValueList(source: Record<string, number> | undefined, preferredOrder: string[]): KeyValueItem[] {
    const map = source ?? {};
    return preferredOrder.map(key => ({
      label: this.formatLabel(key),
      value: Number(map[key] ?? 0)
    }));
  }

  private formatLabel(value: string): string {
    return value
      .replace(/_/g, ' ')
      .toLowerCase()
      .replace(/(^|\s)\S/g, char => char.toUpperCase());
  }

  private buildDoughnutData(entries: KeyValueItem[], colors: string[]): any {
    return {
      labels: entries.map(item => item.label),
      datasets: [{
        data: entries.map(item => item.value),
        backgroundColor: entries.map((_, index) => colors[index % colors.length]),
        hoverOffset: 4
      }]
    };
  }

  private buildBarData(entries: KeyValueItem[], color: string): any {
    return {
      labels: entries.map(item => item.label),
      datasets: [{
        data: entries.map(item => item.value),
        backgroundColor: color,
        borderRadius: 8
      }]
    };
  }

  private formatPercent(value: number): string {
    return `${Math.round((value ?? 0) * 10) / 10}`;
  }

  private computePortfolioHealthScore(stats: ProjectDashboardStats): number {
    const completion = Number(stats.completionRate ?? 0);
    const progress = Number(stats.averageProgress ?? 0);
    const delayPenalty = Number(stats.delayedProjects ?? 0) * 10;
    const overduePenalty = Number(stats.overdueMilestones ?? 0) * 2;
    const unreadPenalty = Number(stats.unreadNotifications ?? 0) * 0.5;

    const rawScore = (completion * 0.45) + (progress * 0.35) - delayPenalty - overduePenalty - unreadPenalty + 25;
    return Math.max(0, Math.min(100, Math.round(rawScore)));
  }
}
