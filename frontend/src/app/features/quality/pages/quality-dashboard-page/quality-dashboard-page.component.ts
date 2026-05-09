import { Component, OnInit } from '@angular/core';
import {
  AuditHeatmapItem,
  CorrectiveAction,
  NonConformity,
  QualityAudit,
  QualityDashboardMetrics
} from '../../models/quality.models';
import { QualityDataService } from '../../services/quality-data.service';
import { forkJoin } from 'rxjs';

interface DashboardStat {
  label: string;
  value: string | number;
  icon: string;
  iconBg: string;
  iconColor: string;
  helper: string;
}

interface HeatmapGroupOption {
  label: string;
  value: string;
}

@Component({
  selector: 'app-quality-dashboard-page',
  templateUrl: './quality-dashboard-page.component.html',
  styleUrl: './quality-dashboard-page.component.scss'
})
export class QualityDashboardPageComponent implements OnInit {
  loading = true;
  errorMessage = '';
  metrics?: QualityDashboardMetrics;
  stats: DashboardStat[] = [];
  audits: QualityAudit[] = [];
  nonConformities: NonConformity[] = [];
  correctiveActions: CorrectiveAction[] = [];
  heatmapLoading = true;
  heatmapItems: AuditHeatmapItem[] = [];
  heatmapGroupBy = 'project';
  readonly heatmapGroupOptions: HeatmapGroupOption[] = [
    { label: 'Group by Project', value: 'project' },
    { label: 'Group by Audit', value: 'audit' },
    { label: 'Group by Standard', value: 'standard' }
  ];

  constructor(private qualityDataService: QualityDataService) {}

  ngOnInit(): void {
    this.loadData();
  }

  loadData(): void {
    this.loading = true;
    this.errorMessage = '';

    forkJoin({
      metrics: this.qualityDataService.getDashboardMetrics(),
      audits: this.qualityDataService.getQualityAudits(),
      nonConformities: this.qualityDataService.getNonConformities(),
      correctiveActions: this.qualityDataService.getCorrectiveActions(),
      heatmapItems: this.qualityDataService.getAuditHeatmap(this.heatmapGroupBy)
    }).subscribe(({ metrics, audits, nonConformities, correctiveActions, heatmapItems }) => {
      console.debug('[QualityDashboard] API response', {
        metrics,
        auditCount: audits.length,
        nonConformityCount: nonConformities.length,
        correctiveActionCount: correctiveActions.length,
        heatmapCount: heatmapItems.length
      });

      this.metrics = metrics;
      this.stats = this.buildStats(metrics);
      this.audits = audits.slice(0, 5);
      this.nonConformities = nonConformities.slice(0, 5);
      this.correctiveActions = correctiveActions
        .filter(action => action.status?.toUpperCase() !== 'COMPLETED')
        .sort((left, right) => {
          const leftDue = left.dueDate ? new Date(left.dueDate).getTime() : Number.MAX_SAFE_INTEGER;
          const rightDue = right.dueDate ? new Date(right.dueDate).getTime() : Number.MAX_SAFE_INTEGER;
          if (leftDue !== rightDue) {
            return leftDue - rightDue;
          }

          const leftCreated = left.createdAt ? new Date(left.createdAt).getTime() : 0;
          const rightCreated = right.createdAt ? new Date(right.createdAt).getTime() : 0;
          return rightCreated - leftCreated;
        })
        .slice(0, 5);
      this.heatmapItems = heatmapItems;
      this.heatmapLoading = false;
      this.loading = false;
    }, (error) => {
      console.error('[QualityDashboard] Failed to load dashboard data', error);
      this.errorMessage = error?.error?.message || 'Dashboard data could not be loaded.';
      this.stats = [];
      this.audits = [];
      this.nonConformities = [];
      this.correctiveActions = [];
      this.heatmapItems = [];
      this.heatmapLoading = false;
      this.loading = false;
    });
  }

  loadHeatmap(): void {
    this.heatmapLoading = true;
    this.qualityDataService.getAuditHeatmap(this.heatmapGroupBy).subscribe({
      next: items => {
        this.heatmapItems = items;
        this.heatmapLoading = false;
      },
      error: error => {
        console.error('[QualityDashboard] Failed to load audit heatmap', error);
        this.heatmapItems = [];
        this.heatmapLoading = false;
      }
    });
  }

  getStatusClass(status: string): string {
    const map: Record<string, string> = {
      PLANNED: 'badge-pending',
      IN_PROGRESS: 'badge-in-progress',
      COMPLETED: 'badge-active',
      CLOSED: 'badge-closed',
      OPEN: 'badge-pending',
      RESOLVED: 'badge-active',
      DRAFT: 'badge-pending'
    };

    return map[status] ?? 'badge-on-hold';
  }

  getHotspotClass(level: string): string {
    const map: Record<string, string> = {
      LOW: 'hotspot-low',
      MEDIUM: 'hotspot-medium',
      HIGH: 'hotspot-high',
      CRITICAL: 'hotspot-critical'
    };

    return map[level] ?? 'hotspot-low';
  }

  private buildStats(metrics: QualityDashboardMetrics): DashboardStat[] {
    return [
      {
        label: 'Audit Coverage',
        value: metrics.totalAudits,
        icon: 'pi pi-verified',
        iconBg: '#dbeafe',
        iconColor: '#1d4ed8',
        helper: `${metrics.inProgressAudits} in progress`
      },
      {
        label: 'Average Score',
        value: `${metrics.averageAuditScore}%`,
        icon: 'pi pi-chart-bar',
        iconBg: '#ede9fe',
        iconColor: '#6d28d9',
        helper: `${metrics.averageComplianceRate}% compliance`
      },
      {
        label: 'Open Findings',
        value: metrics.openNonConformities,
        icon: 'pi pi-exclamation-circle',
        iconBg: '#fee2e2',
        iconColor: '#b91c1c',
        helper: `${metrics.closedNonConformities} already closed`
      },
      {
        label: 'Pending Actions',
        value: metrics.pendingCorrectiveActions,
        icon: 'pi pi-wrench',
        iconBg: '#fef3c7',
        iconColor: '#92400e',
        helper: `${metrics.overdueCorrectiveActions} overdue`
      }
    ];
  }
}
