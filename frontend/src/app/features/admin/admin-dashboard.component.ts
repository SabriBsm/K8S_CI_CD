import { Component, OnInit } from '@angular/core';
import { catchError, forkJoin, of } from 'rxjs';
import { ChartData, ChartOptions } from 'chart.js';
import { UserService } from '../../core/services/user.service';
import { User } from '../../core/models/user.model';
import { UsageDashboard, UsageRankEntry } from '../../core/services/user.service';

interface AdminStatCard {
  label: string;
  value: number | string;
  icon: string;
  color: string;
  note: string;
}

interface QuickAction {
  label: string;
  icon: string;
  route: string;
  description: string;
  color: string;
}

@Component({
  selector: 'app-admin-dashboard',
  templateUrl: './admin-dashboard.component.html',
  styleUrl: './admin-dashboard.component.scss'
})
export class AdminDashboardComponent implements OnInit {
  loading = true;
  users: User[] = [];
  usageDashboard: UsageDashboard | null = null;
  topUser: UsageRankEntry | null = null;
  usageChartData: ChartData<'bar'> = { labels: [], datasets: [] };
  usageChartOptions: ChartOptions<'bar'> = {
    responsive: true,
    maintainAspectRatio: false,
    indexAxis: 'y',
    plugins: {
      legend: { display: false },
      tooltip: {
        callbacks: {
          label: (context) => `${context.parsed.x ?? 0} minutes`
        }
      }
    },
    scales: {
      x: {
        beginAtZero: true,
        ticks: {
          precision: 0
        }
      },
      y: {
        ticks: {
          autoSkip: false
        }
      }
    }
  };
  quickActions: QuickAction[] = [
    { label: 'Open Users', icon: 'pi pi-users', route: '/admin/users', description: 'Go to the full user list', color: '#4f46e5' },
    { label: 'Refresh stats', icon: 'pi pi-refresh', route: '/admin/dashboard', description: 'Reload user statistics', color: '#0f766e' },
    { label: 'Add user', icon: 'pi pi-user-plus', route: '/admin/users', description: 'Create a new user account', color: '#16a34a' }
  ];

  stats: AdminStatCard[] = [
    { label: 'Total Users', value: 0, icon: 'pi pi-users', color: '#4f46e5', note: 'All accounts in the system' },
    { label: 'Administrators', value: 0, icon: 'pi pi-shield', color: '#7c3aed', note: 'Full access users' },
    { label: 'Project Managers', value: 0, icon: 'pi pi-briefcase', color: '#0f766e', note: 'Users managing projects' },
    { label: 'Project Members', value: 0, icon: 'pi pi-id-card', color: '#2563eb', note: 'Users participating in projects' },
    { label: 'Customers', value: 0, icon: 'pi pi-user', color: '#9333ea', note: 'Customer accounts' },
    { label: 'Active Users', value: 0, icon: 'pi pi-check-circle', color: '#16a34a', note: 'Accounts currently active' },
    { label: 'Pending Users', value: 0, icon: 'pi pi-clock', color: '#f59e0b', note: 'Waiting for first login' },
    { label: 'Suspended Users', value: 0, icon: 'pi pi-ban', color: '#ef4444', note: 'Temporarily blocked accounts' }
  ];

  recentUsers: User[] = [];

  constructor(private userService: UserService) {}

  ngOnInit(): void {
    this.loadDashboard();
  }

  loadDashboard(): void {
    this.loading = true;
    forkJoin({
      users: this.userService.getAllUsersList().pipe(catchError(() => of([] as User[]))),
      usage: this.userService.getUsageDashboard().pipe(catchError(() => of(null)))
    }).subscribe({
      next: ({ users, usage }) => {
        this.users = users || [];
        this.usageDashboard = usage;
        this.topUser = usage?.topUser ?? null;
        this.refreshUsageChart();
        this.recentUsers = [...this.users]
          .sort((a, b) => (new Date(b.createdAt).getTime() || 0) - (new Date(a.createdAt).getTime() || 0))
          .slice(0, 5);
        this.computeStats();
        this.loading = false;
      },
      error: () => {
        this.users = [];
        this.usageDashboard = null;
        this.topUser = null;
        this.refreshUsageChart();
        this.recentUsers = [];
        this.computeStats();
        this.loading = false;
      }
    });
  }

  computeStats(): void {
    const total = this.users.length;
    const admins = this.users.filter(user => user.role === 'ADMIN').length;
    const managers = this.users.filter(user => user.role === 'PROJECT_MANAGER').length;
    const members = this.users.filter(user => user.role === 'PROJECT_MEMBER').length;
    const customers = this.users.filter(user => user.role === 'CUSTOMER').length;
    const active = this.users.filter(user => user.status === 'ACTIVE').length;
    const pending = this.users.filter(user => user.status === 'PENDING').length;
    const suspended = this.users.filter(user => user.status === 'SUSPENDED').length;

    this.stats = [
      { label: 'Total Users', value: total, icon: 'pi pi-users', color: '#4f46e5', note: 'All accounts in the system' },
      { label: 'Administrators', value: admins, icon: 'pi pi-shield', color: '#7c3aed', note: 'Full access users' },
      { label: 'Project Managers', value: managers, icon: 'pi pi-briefcase', color: '#0f766e', note: 'Users managing projects' },
      { label: 'Project Members', value: members, icon: 'pi pi-id-card', color: '#2563eb', note: 'Users participating in projects' },
      { label: 'Customers', value: customers, icon: 'pi pi-user', color: '#9333ea', note: 'Customer accounts' },
      { label: 'Active Users', value: active, icon: 'pi pi-check-circle', color: '#16a34a', note: 'Accounts currently active' },
      { label: 'Pending Users', value: pending, icon: 'pi pi-clock', color: '#f59e0b', note: 'Waiting for first login' },
      { label: 'Suspended Users', value: suspended, icon: 'pi pi-ban', color: '#ef4444', note: 'Temporarily blocked accounts' }
    ];
  }

  refreshDashboard(): void {
    this.loadDashboard();
  }

  getStatusSeverity(status?: string): 'success' | 'info' | 'warning' | 'danger' | undefined {
    switch (status) {
      case 'ACTIVE': return 'success';
      case 'PENDING': return 'warning';
      case 'SUSPENDED': return 'danger';
      case 'INACTIVE': return 'info';
      default: return 'info';
    }
  }

  getRoleLabel(role?: string): string {
    switch (role) {
      case 'ADMIN': return 'Administrator';
      case 'PROJECT_MANAGER': return 'Project Manager';
      case 'PROJECT_MEMBER': return 'Project Member';
      case 'CUSTOMER': return 'Customer';
      default: return role || '-';
    }
  }

  private refreshUsageChart(): void {
    const ranking = this.usageDashboard?.globalRanking;
    const entries = ranking?.users ?? [];

    this.usageChartData = {
      labels: entries.map(entry => entry.displayName || entry.username || entry.email || 'Unknown user'),
      datasets: [
        {
          label: 'All-time usage (minutes)',
          data: entries.map(entry => Number(entry.totalMinutes.toFixed(2))),
          backgroundColor: '#4f46e5',
          borderColor: '#4f46e5',
          borderWidth: 1,
          borderRadius: 8,
          barThickness: 18
        }
      ]
    };
  }
}

