import { Component, Inject, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { RiskService } from '../../core/services';
import { DashboardStats, MitigationPlan, Risk } from '../../core/models/risk.model';
import { catchError } from 'rxjs/operators';
import { forkJoin, of } from 'rxjs';

interface StatisticsRecommendation {
  level: 'critical' | 'high' | 'info';
  title: string;
  detail: string;
}

interface TrendIndicator {
  text: string;
  state: 'up' | 'down' | 'flat' | 'na';
}

interface KpiSnapshot {
  averageCost: number;
  overdueCount: number;
  mitigationBacklogRate: number;
  urgencyIndex: number;
  costAtRisk: number;
  portfolioHealthScore: number;
  mitigationCoverageRate: number;
  upcomingDueCount: number;
}

@Component({
  selector: 'app-risk-statistics',
  templateUrl: './risk-statistics.component.html',
  styleUrl: './risk-statistics.component.scss'
})
export class RiskStatisticsComponent implements OnInit {
  loading = false;
  stats: DashboardStats | null = null;
  risks: Risk[] = [];
  mitigations: MitigationPlan[] = [];
  scopedMitigations: MitigationPlan[] = [];

  analysisWindows: Array<{ label: string; value: '7D' | '30D' | '90D' | 'ALL' }> = [
    { label: '7 days', value: '7D' },
    { label: '30 days', value: '30D' },
    { label: '90 days', value: '90D' },
    { label: 'All', value: 'ALL' }
  ];
  selectedAnalysisWindow: '7D' | '30D' | '90D' | 'ALL' = '30D';

  averageRiskScore = 0;
  criticalExposureCount = 0;
  mitigationCoverageRate = 0;
  mitigationBacklogRate = 0;
  urgencyIndex = 0;
  costAtRisk = 0;
  portfolioHealthScore = 0;
  upcomingDueCount = 0;
  recommendations: StatisticsRecommendation[] = [];
  trendWindowLabel = 'vs previous period';
  backlogTrend: TrendIndicator = { text: 'N/A', state: 'na' };
  urgencyTrend: TrendIndicator = { text: 'N/A', state: 'na' };
  healthTrend: TrendIndicator = { text: 'N/A', state: 'na' };
  costAtRiskTrend: TrendIndicator = { text: 'N/A', state: 'na' };
  coverageTrend: TrendIndicator = { text: 'N/A', state: 'na' };

  riskStatusChartData: any;
  riskStatusChartOptions: any;
  impactChartData: any;
  impactChartOptions: any;
  probabilityChartData: any;
  probabilityChartOptions: any;
  mitigationEffectivenessChartData: any;
  mitigationEffectivenessChartOptions: any;
  riskScoreBandChartData: any;
  riskScoreBandChartOptions: any;
  mitigationPipelineChartData: any;
  mitigationPipelineChartOptions: any;

  constructor(
    @Inject(RiskService) private riskService: RiskService,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.loadStats();
  }

  get totalRisks(): number {
    return Number(this.stats?.totalRisks ?? 0);
  }

  get totalMitigations(): number {
    return Number(this.stats?.totalMitigations ?? 0);
  }

  get overdueMitigations(): number {
    return Number(this.stats?.overdueMitigations ?? 0);
  }

  get averageCost(): number {
    return Number(this.stats?.averageMitigationCost ?? 0);
  }

  get effectiveMitigations(): number {
    return Number(this.stats?.effectiveMitigations ?? 0);
  }

  get ineffectiveMitigations(): number {
    return Number(this.stats?.ineffectiveMitigations ?? 0);
  }

  get averageMitigationEffectiveness(): number {
    return Number(this.stats?.averageMitigationEffectiveness ?? 0);
  }

  get mitigationEffectivenessRate(): number {
    return Number(this.stats?.mitigationEffectivenessRate ?? 0);
  }

  backToRisks(): void {
    this.router.navigate(['/risks']);
  }

  refresh(): void {
    this.loadStats();
  }

  onWindowChange(window: '7D' | '30D' | '90D' | 'ALL'): void {
    this.selectedAnalysisWindow = window;
    this.recalculateAdvancedAnalytics();
  }

  getTrendTooltip(metric: 'coverage' | 'backlog' | 'urgency' | 'costAtRisk' | 'health'): string {
    const base = this.selectedAnalysisWindow === 'ALL'
      ? 'Trend is unavailable for ALL because there is no previous comparable window.'
      : `Comparison is ${this.trendWindowLabel} for the selected ${this.selectedAnalysisWindow} analysis window.`;

    if (metric === 'coverage') {
      return `${base} Coverage = % of risks with at least one mitigation.`;
    }
    if (metric === 'backlog') {
      return `${base} Backlog = % of mitigations still open (not completed/cancelled).`;
    }
    if (metric === 'urgency') {
      return `${base} Urgency Index blends overdue pressure and critical exposure.`;
    }
    if (metric === 'costAtRisk') {
      return `${base} Cost at Risk = average mitigation cost x overdue mitigations.`;
    }
    return `${base} Portfolio Health combines urgency, backlog, and mitigation coverage.`;
  }

  private loadStats(): void {
    this.loading = true;
    this.riskService.getDashboardStats().subscribe({
      next: (stats) => {
        this.stats = {
          ...stats,
          totalRisks: Number(stats.totalRisks ?? 0),
          totalMitigations: Number(stats.totalMitigations ?? 0),
          overdueMitigations: Number(stats.overdueMitigations ?? 0),
          averageMitigationCost: Number(stats.averageMitigationCost ?? 0),
          effectiveMitigations: Number(stats.effectiveMitigations ?? 0),
          ineffectiveMitigations: Number(stats.ineffectiveMitigations ?? 0),
          averageMitigationEffectiveness: Number(stats.averageMitigationEffectiveness ?? 0),
          mitigationEffectivenessRate: Number(stats.mitigationEffectivenessRate ?? 0),
          risksByStatus: stats.risksByStatus ?? {},
          risksByImpact: stats.risksByImpact ?? {},
          risksByProbability: stats.risksByProbability ?? {},
          mitigationsByStatus: stats.mitigationsByStatus ?? {}
        };
        this.loadAdvancedData();
      },
      error: () => {
        this.stats = null;
        this.loadAdvancedData();
      }
    });
  }

  private loadAdvancedData(): void {
    forkJoin({
      risks: this.riskService.getRisks().pipe(catchError(() => of([] as Risk[]))),
      mitigations: this.riskService.getAllMitigations().pipe(catchError(() => of([] as MitigationPlan[])))
    }).subscribe(({ risks, mitigations }) => {
      this.risks = risks ?? [];
      this.mitigations = mitigations ?? [];
      this.recalculateAdvancedAnalytics();
    });
  }

  private recalculateAdvancedAnalytics(): void {
    this.scopedMitigations = this.getScopedMitigations(this.mitigations);
    const currentSnapshot = this.computeKpiSnapshot(this.scopedMitigations);

    if (this.stats) {
      this.stats = {
        ...this.stats,
        averageMitigationCost: currentSnapshot.averageCost,
        overdueMitigations: currentSnapshot.overdueCount
      };
    }

    this.applyKpiSnapshot(currentSnapshot);
    this.computeTrendIndicators(currentSnapshot);
    this.computeRecommendations();
    this.buildCharts();
    this.loading = false;
  }

  private computeLocalMitigationMetrics(plans: MitigationPlan[]): { averageCost: number; overdueCount: number } {
    const numericCosts = plans
      .map(plan => Number(plan.cost))
      .filter(cost => Number.isFinite(cost) && cost >= 0);

    const averageCost = numericCosts.length
      ? numericCosts.reduce((sum, cost) => sum + cost, 0) / numericCosts.length
      : 0;

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const overdueCount = plans.filter(plan => {
      if (!plan.dueDate || this.isMitigationClosed(plan.status)) return false;
      const dueDate = new Date(plan.dueDate);
      if (Number.isNaN(dueDate.getTime())) return false;
      dueDate.setHours(0, 0, 0, 0);
      return dueDate < today;
    }).length;

    return { averageCost, overdueCount };
  }

  private isMitigationClosed(status?: string): boolean {
    const value = String(status ?? '').toUpperCase();
    return value.includes('COMPLETE')
      || value.includes('DONE')
      || value.includes('CLOSED')
      || value.includes('MITIGAT');
  }

  private buildCharts(): void {
    const status = this.toEntries(this.stats?.risksByStatus);
    const impact = this.toEntries(this.stats?.risksByImpact);
    const probability = this.toEntries(this.stats?.risksByProbability);

    this.riskStatusChartData = {
      labels: status.map(item => item.label),
      datasets: [{
        data: status.map(item => item.value),
        backgroundColor: ['#2563eb', '#06b6d4', '#16a34a', '#f59e0b', '#dc2626', '#7c3aed']
      }]
    };

    this.impactChartData = {
      labels: impact.map(item => item.label),
      datasets: [{
        label: 'Risks by impact',
        data: impact.map(item => item.value),
        backgroundColor: '#0ea5e9',
        borderRadius: 8
      }]
    };

    this.probabilityChartData = {
      labels: probability.map(item => item.label),
      datasets: [{
        label: 'Risks by probability',
        data: probability.map(item => item.value),
        borderColor: '#2563eb',
        backgroundColor: 'rgba(37, 99, 235, 0.18)',
        fill: true,
        tension: 0.35,
        pointRadius: 4,
        pointBackgroundColor: '#2563eb'
      }]
    };

    const scopedEffectiveness = this.computeMitigationEffectivenessFromPlans(this.scopedMitigations);
    this.mitigationEffectivenessChartData = {
      labels: ['Effective', 'Ineffective'],
      datasets: [{
        data: [
          scopedEffectiveness.effective || this.effectiveMitigations,
          scopedEffectiveness.ineffective || this.ineffectiveMitigations
        ],
        backgroundColor: ['#16a34a', '#dc2626']
      }]
    };

    const riskScoreBands = this.computeRiskScoreBands();
    this.riskScoreBandChartData = {
      labels: ['Low (1-2)', 'Medium (3-4)', 'High (6)', 'Critical (9)'],
      datasets: [{
        label: 'Risk score bands',
        data: [riskScoreBands.low, riskScoreBands.medium, riskScoreBands.high, riskScoreBands.critical],
        backgroundColor: ['#22c55e', '#f59e0b', '#f97316', '#dc2626'],
        borderRadius: 8
      }]
    };

    const pipeline = this.computeMitigationPipeline(this.scopedMitigations);
    this.mitigationPipelineChartData = {
      labels: ['Planned', 'In Progress', 'Completed', 'Cancelled'],
      datasets: [{
        label: 'Mitigation pipeline',
        data: [pipeline.planned, pipeline.inProgress, pipeline.completed, pipeline.cancelled],
        backgroundColor: ['#3b82f6', '#06b6d4', '#16a34a', '#ef4444']
      }]
    };

    this.riskStatusChartOptions = {
      maintainAspectRatio: false,
      plugins: {
        legend: {
          position: 'bottom',
          labels: {
            color: '#334155',
            font: { size: 12 }
          }
        }
      }
    };

    this.impactChartOptions = {
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false }
      },
      scales: {
        x: {
          ticks: { color: '#334155' },
          grid: { color: '#e2e8f0' }
        },
        y: {
          beginAtZero: true,
          ticks: {
            color: '#334155',
            stepSize: 1,
            precision: 0
          },
          grid: { color: '#e2e8f0' }
        }
      }
    };

    this.probabilityChartOptions = {
      maintainAspectRatio: false,
      plugins: {
        legend: {
          labels: {
            color: '#334155',
            font: { size: 12 }
          }
        }
      },
      scales: {
        x: {
          ticks: { color: '#334155' },
          grid: { color: '#e2e8f0' }
        },
        y: {
          beginAtZero: true,
          ticks: {
            color: '#334155',
            stepSize: 1,
            precision: 0
          },
          grid: { color: '#e2e8f0' }
        }
      }
    };

    this.mitigationEffectivenessChartOptions = {
      maintainAspectRatio: false,
      plugins: {
        legend: {
          position: 'bottom',
          labels: {
            color: '#334155',
            font: { size: 12 }
          }
        }
      }
    };

    this.riskScoreBandChartOptions = {
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false }
      },
      scales: {
        x: {
          ticks: { color: '#334155' },
          grid: { color: '#e2e8f0' }
        },
        y: {
          beginAtZero: true,
          ticks: {
            color: '#334155',
            stepSize: 1,
            precision: 0
          },
          grid: { color: '#e2e8f0' }
        }
      }
    };

    this.mitigationPipelineChartOptions = {
      maintainAspectRatio: false,
      plugins: {
        legend: {
          position: 'bottom',
          labels: {
            color: '#334155',
            font: { size: 12 }
          }
        }
      }
    };
  }

  private applyKpiSnapshot(snapshot: KpiSnapshot): void {
    const riskScores = this.risks.map(risk => this.computeRiskScore(risk));
    this.averageRiskScore = riskScores.length
      ? Number((riskScores.reduce((sum, score) => sum + score, 0) / riskScores.length).toFixed(2))
      : 0;

    this.criticalExposureCount = this.risks.filter(risk => {
      const score = this.computeRiskScore(risk);
      const status = String(risk.status ?? '').toUpperCase();
      return score >= 6 && !status.includes('CLOSED') && !status.includes('MITIGAT');
    }).length;

    this.mitigationCoverageRate = snapshot.mitigationCoverageRate;
    this.mitigationBacklogRate = snapshot.mitigationBacklogRate;
    this.urgencyIndex = snapshot.urgencyIndex;
    this.costAtRisk = snapshot.costAtRisk;
    this.portfolioHealthScore = snapshot.portfolioHealthScore;
    this.upcomingDueCount = snapshot.upcomingDueCount;
  }

  private computeKpiSnapshot(scopedMitigations: MitigationPlan[]): KpiSnapshot {
    const metrics = this.computeLocalMitigationMetrics(scopedMitigations);
    const openMitigations = scopedMitigations.filter(plan => !this.isMitigationClosed(plan.status)).length;

    const mitigatedRiskIds = new Set(
      scopedMitigations
        .map(plan => Number(plan.riskId))
        .filter(id => Number.isFinite(id) && id > 0)
    );

    const mitigationCoverageRate = this.risks.length
      ? Number(((mitigatedRiskIds.size / this.risks.length) * 100).toFixed(2))
      : 0;

    const mitigationBacklogRate = scopedMitigations.length
      ? Number(((openMitigations / scopedMitigations.length) * 100).toFixed(2))
      : 0;

    const criticalExposureCount = this.risks.filter(risk => {
      const score = this.computeRiskScore(risk);
      const status = String(risk.status ?? '').toUpperCase();
      return score >= 6 && !status.includes('CLOSED') && !status.includes('MITIGAT');
    }).length;

    const overdueRatio = scopedMitigations.length ? (metrics.overdueCount / scopedMitigations.length) : 0;
    const criticalRatio = this.risks.length ? (criticalExposureCount / this.risks.length) : 0;
    const urgencyIndex = Number(Math.min(100, ((overdueRatio * 55) + (criticalRatio * 45)) * 100).toFixed(2));

    const costAtRisk = Number((metrics.averageCost * metrics.overdueCount).toFixed(2));

    const upcomingDueCount = scopedMitigations.filter(plan => {
      if (!plan.dueDate || this.isMitigationClosed(plan.status)) return false;
      const daysLeft = this.daysUntil(plan.dueDate);
      return daysLeft !== null && daysLeft >= 0;
    }).length;

    const healthRaw = 100
      - (urgencyIndex * 0.45)
      - (mitigationBacklogRate * 0.25)
      - ((100 - mitigationCoverageRate) * 0.3);
    const portfolioHealthScore = Number(Math.max(0, Math.min(100, healthRaw)).toFixed(2));

    return {
      averageCost: metrics.averageCost,
      overdueCount: metrics.overdueCount,
      mitigationBacklogRate,
      urgencyIndex,
      costAtRisk,
      portfolioHealthScore,
      mitigationCoverageRate,
      upcomingDueCount
    };
  }

  private computeRiskScore(risk: Risk): number {
    return this.probabilityWeight(risk.probability) * this.impactWeight(risk.impact);
  }

  private probabilityWeight(value?: string): number {
    const normalized = String(value ?? '').toUpperCase();
    if (normalized.includes('HIGH')) return 3;
    if (normalized.includes('MEDIUM')) return 2;
    return 1;
  }

  private impactWeight(value?: string): number {
    const normalized = String(value ?? '').toUpperCase();
    if (normalized.includes('MODERATE') || normalized.includes('HIGH') || normalized.includes('MAJOR')) return 3;
    if (normalized.includes('MINOR') || normalized.includes('MEDIUM')) return 2;
    return 1;
  }

  private computeRiskScoreBands(): { low: number; medium: number; high: number; critical: number } {
    const result = { low: 0, medium: 0, high: 0, critical: 0 };

    this.risks.forEach(risk => {
      const score = this.computeRiskScore(risk);
      if (score >= 9) {
        result.critical += 1;
      } else if (score >= 6) {
        result.high += 1;
      } else if (score >= 3) {
        result.medium += 1;
      } else {
        result.low += 1;
      }
    });

    return result;
  }

  private computeMitigationPipeline(plans: MitigationPlan[]): { planned: number; inProgress: number; completed: number; cancelled: number } {
    const result = { planned: 0, inProgress: 0, completed: 0, cancelled: 0 };

    plans.forEach(plan => {
      const status = String(plan.status ?? '').toUpperCase();
      if (status.includes('CANCEL')) {
        result.cancelled += 1;
      } else if (status.includes('COMPLETE') || status.includes('DONE') || status.includes('CLOSED')) {
        result.completed += 1;
      } else if (status.includes('PROGRESS') || status.includes('IN_PROGRESS')) {
        result.inProgress += 1;
      } else {
        result.planned += 1;
      }
    });

    return result;
  }

  private computeMitigationEffectivenessFromPlans(plans: MitigationPlan[]): { effective: number; ineffective: number } {
    const result = { effective: 0, ineffective: 0 };

    plans.forEach(plan => {
      if (plan.effective === true) {
        result.effective += 1;
      } else if (plan.effective === false) {
        result.ineffective += 1;
      }
    });

    return result;
  }

  private getScopedMitigations(plans: MitigationPlan[]): MitigationPlan[] {
    if (this.selectedAnalysisWindow === 'ALL') {
      return plans;
    }

    const dayLimit = this.selectedAnalysisWindow === '7D'
      ? 7
      : this.selectedAnalysisWindow === '30D'
        ? 30
        : 90;

    return plans.filter(plan => {
      if (!plan.dueDate) return true;
      const delta = this.daysUntil(plan.dueDate);
      if (delta === null) return true;
      return delta <= dayLimit;
    });
  }

  private daysUntil(dueDate?: string): number | null {
    if (!dueDate) return null;
    const due = new Date(dueDate);
    if (Number.isNaN(due.getTime())) return null;
    const diff = due.getTime() - Date.now();
    return Math.ceil(diff / (1000 * 60 * 60 * 24));
  }

  private computeRecommendations(): void {
    const items: StatisticsRecommendation[] = [];

    if (this.urgencyIndex >= 70) {
      items.push({
        level: 'critical',
        title: 'Urgency is critically high',
        detail: 'Open a focused mitigation war-room for overdue and high-score risks in the selected window.'
      });
    }

    if (this.mitigationCoverageRate < 65) {
      items.push({
        level: 'high',
        title: 'Coverage gap detected',
        detail: 'Prioritize mitigation creation for uncovered risks, starting with high and critical score bands.'
      });
    }

    if (this.mitigationBacklogRate > 45) {
      items.push({
        level: 'high',
        title: 'Backlog pressure is elevated',
        detail: 'Rebalance ownership and set weekly closure targets for planned/in-progress mitigations.'
      });
    }

    if (this.portfolioHealthScore >= 75) {
      items.push({
        level: 'info',
        title: 'Portfolio health is stable',
        detail: 'Maintain cadence and monitor trend shifts with a weekly threshold review.'
      });
    }

    if (!items.length) {
      items.push({
        level: 'info',
        title: 'No urgent action triggered',
        detail: 'Keep current controls and continue monitoring KPI drifts in the selected window.'
      });
    }

    this.recommendations = items.slice(0, 4);
  }

  private computeTrendIndicators(current: KpiSnapshot): void {
    const previousMitigations = this.getPreviousWindowMitigations(this.mitigations);
    const previous = this.computeKpiSnapshot(previousMitigations);

    if (this.selectedAnalysisWindow === 'ALL') {
      this.trendWindowLabel = 'no previous period for ALL';
      this.backlogTrend = { text: 'N/A', state: 'na' };
      this.urgencyTrend = { text: 'N/A', state: 'na' };
      this.healthTrend = { text: 'N/A', state: 'na' };
      this.costAtRiskTrend = { text: 'N/A', state: 'na' };
      this.coverageTrend = { text: 'N/A', state: 'na' };
      return;
    }

    this.trendWindowLabel = 'vs previous period';
    this.backlogTrend = this.buildTrend(current.mitigationBacklogRate, previous.mitigationBacklogRate, false, '%');
    this.urgencyTrend = this.buildTrend(current.urgencyIndex, previous.urgencyIndex, false, '');
    this.healthTrend = this.buildTrend(current.portfolioHealthScore, previous.portfolioHealthScore, true, '');
    this.costAtRiskTrend = this.buildTrend(current.costAtRisk, previous.costAtRisk, false, '');
    this.coverageTrend = this.buildTrend(current.mitigationCoverageRate, previous.mitigationCoverageRate, true, '%');
  }

  private buildTrend(current: number, previous: number, upIsGood: boolean, suffix: string): TrendIndicator {
    if (!Number.isFinite(previous) || previous === 0 && current === 0) {
      return { text: 'No change', state: 'flat' };
    }

    const delta = Number((current - previous).toFixed(2));
    if (Math.abs(delta) < 0.01) {
      return { text: 'No change', state: 'flat' };
    }

    const improved = upIsGood ? delta > 0 : delta < 0;
    const state: TrendIndicator['state'] = improved ? 'up' : 'down';
    const symbol = improved ? '+' : '-';
    const value = `${symbol}${Math.abs(delta).toFixed(2)}${suffix}`;
    return { text: value, state };
  }

  private getPreviousWindowMitigations(plans: MitigationPlan[]): MitigationPlan[] {
    const range = this.getWindowDays(this.selectedAnalysisWindow);
    if (range === null) {
      return [];
    }

    return plans.filter(plan => {
      const days = this.daysUntil(plan.dueDate);
      if (days === null) return false;
      return days > range && days <= (range * 2);
    });
  }

  private getWindowDays(window: '7D' | '30D' | '90D' | 'ALL'): number | null {
    if (window === '7D') return 7;
    if (window === '30D') return 30;
    if (window === '90D') return 90;
    return null;
  }

  private toEntries(source?: Record<string, number>): Array<{ label: string; value: number }> {
    const entries = Object.entries(source ?? {});
    if (!entries.length) {
      return [{ label: 'NO_DATA', value: 0 }];
    }

    return entries.map(([label, value]) => ({ label, value: Number(value ?? 0) }));
  }
}
