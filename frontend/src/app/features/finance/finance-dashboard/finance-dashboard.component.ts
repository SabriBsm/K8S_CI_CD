import { ChangeDetectorRef, Component, OnDestroy, OnInit } from '@angular/core';
import { Subject, forkJoin, of } from 'rxjs';
import { catchError, finalize, takeUntil } from 'rxjs/operators';
import { UserRole } from '../../../core/models/auth.model';
import {
  FinanceDashboardProject,
  FinanceDashboardResponse,
  FinanceGlobalStats
} from '../../../core/models/finance.model';
import { AuthService } from '../../../core/services/auth.service';
import { FinanceService } from '../../../core/services/finance.service';

@Component({
  selector: 'app-finance-dashboard',
  templateUrl: './finance-dashboard.component.html',
  styleUrl: './finance-dashboard.component.scss'
})
export class FinanceDashboardComponent implements OnInit, OnDestroy {
  dashboard: FinanceDashboardResponse = {
    globalStats: {
      totalBudget: 0,
      totalExpenses: 0,
      remainingBudget: 0,
      spentPercentage: 0,
      monthlyExpenses: []
    },
    projects: []
  };

  loading = false;
  errorMessage = '';

  lineChartData: unknown;
  lineChartOptions: unknown;
  pieChartData: unknown;
  pieChartOptions: unknown;

  private readonly destroy$ = new Subject<void>();
  private userRole: UserRole | null = null;

  constructor(
    private readonly authService: AuthService,
    private readonly financeService: FinanceService,
    private readonly cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    this.userRole = this.authService.getRole();
    this.loadDashboard();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  get globalStats(): FinanceGlobalStats {
    return this.dashboard.globalStats;
  }

  get projects(): FinanceDashboardProject[] {
    return this.dashboard.projects;
  }

  get workspaceLabel(): string {
    return this.isManager ? 'Manager workspace' : this.isClient ? 'Customer workspace' : 'User workspace';
  }

  get isManager(): boolean {
    return this.normalizedRole === 'ADMIN' || this.normalizedRole === 'MANAGER' || this.normalizedRole === 'PROJECT_MANAGER';
  }

  get isClient(): boolean {
    return this.normalizedRole === 'CUSTOMER';
  }

  private get normalizedRole(): string {
    return String(this.userRole ?? '').replace(/^ROLE_/, '').toUpperCase();
  }

  refresh(): void {
    this.loadDashboard();
  }

  riskBadgeClass(level: string | null | undefined): string {
    switch (String(level ?? '').toUpperCase()) {
      case 'HIGH':
        return 'risk-badge risk-high';
      case 'MEDIUM':
        return 'risk-badge risk-medium';
      default:
        return 'risk-badge risk-low';
    }
  }

  riskDot(level: string | null | undefined): string {
    switch (String(level ?? '').toUpperCase()) {
      case 'HIGH':
        return '🔴';
      case 'MEDIUM':
        return '🟠';
      default:
        return '🟢';
    }
  }

  progressSeverity(value: number): string {
    if (value >= 100) {
      return 'danger';
    }
    if (value >= 80) {
      return 'warning';
    }
    return 'success';
  }

  trackByProject(_index: number, item: FinanceDashboardProject): number {
    return item.projectId;
  }

  private loadDashboard(): void {
    this.loading = true;
    this.errorMessage = '';

    forkJoin({
      dashboard: this.financeService.getDashboard(),
      globalStats: this.financeService.getGlobalStats().pipe(
        catchError(() => of(null))
      )
    })
      .pipe(
        takeUntil(this.destroy$),
        finalize(() => {
          this.loading = false;
          this.cdr.detectChanges();
        })
      )
      .subscribe({
        next: ({ dashboard, globalStats }) => {
          this.dashboard = globalStats ? { ...dashboard, globalStats } : dashboard;
          this.buildGlobalCharts();
        },
        error: (error) => {
          this.errorMessage = this.extractErrorMessage(error, 'Unable to load the finance dashboard.');
        }
      });
  }

  private buildGlobalCharts(): void {
    const labels = this.globalStats.monthlyExpenses.map((point) => point.month);
    const values = this.globalStats.monthlyExpenses.map((point) => point.amount);

    this.lineChartData = {
      labels,
      datasets: [
        {
          label: 'Monthly Expenses',
          data: values,
          borderColor: '#d45500',
          backgroundColor: 'rgba(212, 85, 0, 0.18)',
          fill: true,
          tension: 0.35
        }
      ]
    };

    this.lineChartOptions = this.buildLineOptions('#d45500');

    this.pieChartData = {
      labels: this.projects.map((project) => project.projectName),
      datasets: [
        {
          data: this.projects.map((project) => project.budget),
          backgroundColor: ['#0f766e', '#d45500', '#1d4ed8', '#b91c1c', '#7c3aed', '#0369a1'],
          hoverBackgroundColor: ['#115e59', '#b45309', '#1e40af', '#991b1b', '#6d28d9', '#075985']
        }
      ]
    };

    this.pieChartOptions = {
      maintainAspectRatio: false,
      plugins: {
        legend: {
          position: 'top',
          labels: {
            color: '#1f2937'
          }
        }
      },
      layout: {
        padding: 8
      }
    };
  }

  private buildLineOptions(color: string): unknown {
    return {
      maintainAspectRatio: false,
      plugins: {
        legend: {
          labels: {
            color: '#1f2937'
          }
        }
      },
      scales: {
        x: {
          ticks: { color: '#6b7280' },
          grid: { color: 'rgba(148, 163, 184, 0.18)' }
        },
        y: {
          ticks: { color: '#6b7280' },
          grid: { color: 'rgba(148, 163, 184, 0.18)' }
        }
      },
      elements: {
        line: {
          borderWidth: 3
        },
        point: {
          radius: 4,
          backgroundColor: color
        }
      }
    };
  }

  private extractErrorMessage(error: unknown, fallback: string): string {
    if (typeof error === 'object' && error !== null) {
      const payload = error as {
        error?: { message?: string; error?: string };
        message?: string;
      };

      return payload.error?.message || payload.error?.error || payload.message || fallback;
    }

    return fallback;
  }
}
