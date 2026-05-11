import { Injectable } from '@angular/core';
import { HttpClient, HttpContext } from '@angular/common/http';
import { Observable, of, throwError } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import { environment } from '../../../environments/environment';
import {
  AppNotification,
  BudgetRequest,
  ExpenseRequest,
  FinanceDashboardProject,
  FinanceDashboardResponse,
  FinanceBudget,
  FinanceExpense,
  FinanceGlobalStats,
  FinanceMonthlyExpensePoint,
  FinancialReport,
  FinanceProject,
  FinanceProjectStats,
  FinanceRiskAnalysis,
  ProjectRequest,
  ReportAnalysisResponse
} from '../models/finance.model';
import { SKIP_GLOBAL_ERROR_TOAST } from '../interceptors/error.interceptor';

type ApiCollection<T> =
  | T[]
  | {
      data?: T[] | null;
      items?: T[] | null;
      content?: T[] | null;
      results?: T[] | null;
    };

type ApiEntity<T> =
  | T
  | {
      data?: T | null;
      item?: T | null;
      result?: T | null;
    };

@Injectable({ providedIn: 'root' })
export class FinanceService {
  private readonly apiUrl = (environment as { financeApiUrl?: string; apiSpring?: string; apiUrl: string }).financeApiUrl
    ?? (environment as { apiSpring?: string }).apiSpring
    ?? environment.apiUrl;
  private readonly projectApiUrl = (environment as { projectApiUrl?: string }).projectApiUrl;
  private notificationsEndpointUnavailable = false;

  constructor(private http: HttpClient) {}

  getAllProjects(): Observable<FinanceProject[]> {
    return this.http.get<ApiCollection<unknown>>(`${this.apiUrl}/projects`).pipe(
      map((response) => this.extractCollection(response).map((item) => this.mapProject(item)))
    );
  }

  getMyProjects(): Observable<FinanceProject[]> {
    return this.http.get<ApiCollection<unknown>>(`${this.apiUrl}/projects/my`).pipe(
      map((response) => this.extractCollection(response).map((item) => this.mapProject(item)))
    );
  }

  getProject(id: number): Observable<FinanceProject> {
    return this.http.get<ApiEntity<unknown>>(`${this.apiUrl}/projects/${id}`).pipe(
      map((response) => this.mapProject(this.extractEntity(response)))
    );
  }

  createProject(payload: ProjectRequest): Observable<FinanceProject> {
    return this.http.post<ApiEntity<unknown>>(`${this.apiUrl}/projects`, payload).pipe(
      map((response) => this.mapProject(this.extractEntity(response)))
    );
  }

  createIntegratedProject(payload: ProjectRequest & {
    startDate: string;
    endDate: string;
    objectives?: string;
    status?: string;
    visibility?: string;
    progress?: number;
  }): Observable<FinanceProject> {
    const targetUrl = this.projectApiUrl ? `${this.projectApiUrl}/projects` : `${this.apiUrl}/projects`;
    return this.http.post<ApiEntity<unknown>>(targetUrl, payload).pipe(
      map((response) => this.mapProject(this.extractEntity(response)))
    );
  }

  updateProjectStatus(id: number, status: FinanceProject['status']): Observable<FinanceProject> {
    return this.http.patch<ApiEntity<unknown>>(`${this.apiUrl}/projects/${id}/status`, { status }).pipe(
      map((response) => this.mapProject(this.extractEntity(response)))
    );
  }

  getBudgetsByProject(projectId: number): Observable<FinanceBudget[]> {
    return this.http.get<ApiCollection<unknown>>(`${this.apiUrl}/budgets/project/${projectId}`).pipe(
      map((response) => this.extractCollection(response).map((item) => this.mapBudget(item)))
    );
  }

  getAllBudgets(): Observable<FinanceBudget[]> {
    return this.http.get<ApiCollection<unknown>>(`${this.apiUrl}/budgets`).pipe(
      map((response) => this.extractCollection(response).map((item) => this.mapBudget(item)))
    );
  }

  createBudget(payload: BudgetRequest): Observable<FinanceBudget> {
    return this.http.post<ApiEntity<unknown>>(`${this.apiUrl}/budgets`, payload).pipe(
      map((response) => this.mapBudget(this.extractEntity(response)))
    );
  }

  updateBudget(id: number, payload: BudgetRequest): Observable<FinanceBudget> {
    return this.http.put<ApiEntity<unknown>>(`${this.apiUrl}/budgets/${id}`, payload).pipe(
      map((response) => this.mapBudget(this.extractEntity(response)))
    );
  }

  deleteBudget(id: number): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/budgets/${id}`);
  }

  getExpensesByBudget(budgetId: number): Observable<FinanceExpense[]> {
    return this.http.get<ApiCollection<unknown>>(`${this.apiUrl}/expenses/budget/${budgetId}`).pipe(
      map((response) => this.extractCollection(response).map((item) => this.mapExpense(item)))
    );
  }

  getExpensesByProject(projectId: number): Observable<FinanceExpense[]> {
    return this.http.get<ApiCollection<unknown>>(`${this.apiUrl}/expenses/project/${projectId}`).pipe(
      map((response) => this.extractCollection(response).map((item) => this.mapExpense(item)))
    );
  }

  getAllExpenses(): Observable<FinanceExpense[]> {
    return this.http.get<ApiCollection<unknown>>(`${this.apiUrl}/expenses`).pipe(
      map((response) => this.extractCollection(response).map((item) => this.mapExpense(item)))
    );
  }

  createExpense(payload: ExpenseRequest): Observable<FinanceExpense> {
    return this.http.post<ApiEntity<unknown>>(`${this.apiUrl}/expenses`, payload).pipe(
      map((response) => this.mapExpense(this.extractEntity(response)))
    );
  }

  updateExpense(id: number, payload: ExpenseRequest): Observable<FinanceExpense> {
    return this.http.put<ApiEntity<unknown>>(`${this.apiUrl}/expenses/${id}`, payload).pipe(
      map((response) => this.mapExpense(this.extractEntity(response)))
    );
  }

  deleteExpense(id: number): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/expenses/${id}`);
  }

  getReports(): Observable<FinancialReport[]> {
    return this.http.get<ApiCollection<unknown>>(`${this.apiUrl}/reports`).pipe(
      map((response) => this.extractCollection(response).map((item) => this.mapReport(item)))
    );
  }

  generateReport(projectId: number, summary: string): Observable<FinancialReport> {
    return this.http.post<ApiEntity<unknown>>(`${this.apiUrl}/reports/generate`, { projectId, summary }).pipe(
      map((response) => this.mapReport(this.extractEntity(response)))
    );
  }

  downloadReportPdf(reportId: number): Observable<Blob> {
    return this.http.get(`${this.apiUrl}/reports/${reportId}/pdf`, {
      responseType: 'blob',
      context: new HttpContext().set(SKIP_GLOBAL_ERROR_TOAST, true)
    });
  }

  uploadPdfAnalysis(projectId: number, file: File): Observable<ReportAnalysisResponse> {
    const formData = new FormData();
    formData.append('projectId', String(projectId));
    formData.append('file', file);

    return this.http.post<ApiEntity<unknown>>(`${this.apiUrl}/upload-pdf`, formData, {
      context: new HttpContext().set(SKIP_GLOBAL_ERROR_TOAST, true)
    }).pipe(
      map((response) => this.mapAnalysis(this.extractEntity(response)))
    );
  }

  getProjectAnalyses(projectId: number): Observable<ReportAnalysisResponse[]> {
    return this.http.get<ApiCollection<unknown>>(`${this.apiUrl}/upload-pdf/project/${projectId}`, {
      context: new HttpContext().set(SKIP_GLOBAL_ERROR_TOAST, true)
    }).pipe(
      map((response) => this.extractCollection(response).map((item) => this.mapAnalysis(item)))
    );
  }

  getNotifications(): Observable<AppNotification[]> {
    if (this.notificationsEndpointUnavailable) {
      return of([]);
    }

    return this.http.get<ApiCollection<unknown>>(`${this.apiUrl}/notifications`, {
      context: new HttpContext().set(SKIP_GLOBAL_ERROR_TOAST, true)
    }).pipe(
      catchError((error) => {
        if (error?.status === 404 || error?.status === 503) {
          this.notificationsEndpointUnavailable = true;
          return of([]);
        }
        return throwError(() => error);
      }),
      map((response) => this.extractCollection(response).map((item) => this.mapNotification(item)))
    );
  }

  markNotificationAsRead(notificationId: number): Observable<AppNotification> {
    if (this.notificationsEndpointUnavailable) {
      return of(this.buildPlaceholderNotification(notificationId));
    }

    return this.http.put<ApiEntity<unknown>>(`${this.apiUrl}/notifications/${notificationId}/read`, {}).pipe(
      catchError((error) => {
        if (error?.status === 404 || error?.status === 503) {
          this.notificationsEndpointUnavailable = true;
          return of(this.buildPlaceholderNotification(notificationId));
        }
        return throwError(() => error);
      }),
      map((response) => this.mapNotification(this.extractEntity(response)))
    );
  }

  markAllNotificationsAsRead(): Observable<void> {
    if (this.notificationsEndpointUnavailable) {
      return of(void 0);
    }

    return this.http.put<void>(`${this.apiUrl}/notifications/read-all`, {}).pipe(
      catchError((error) => {
        if (error?.status === 404 || error?.status === 503) {
          this.notificationsEndpointUnavailable = true;
          return of(void 0);
        }
        return throwError(() => error);
      })
    );
  }

  getDashboard(): Observable<FinanceDashboardResponse> {
    return this.http.get<ApiEntity<unknown>>(`${this.apiUrl}/finance/dashboard`).pipe(
      map((response) => this.mapDashboard(this.extractEntity(response)))
    );
  }

  getGlobalStats(): Observable<FinanceGlobalStats> {
    return this.http.get<ApiEntity<unknown>>(`${this.apiUrl}/finance/global-stats`).pipe(
      map((response) => this.mapGlobalStats(this.extractEntity(response)))
    );
  }

  getProjectStats(projectId: number): Observable<FinanceProjectStats> {
    return this.http.get<ApiEntity<unknown>>(`${this.apiUrl}/finance/projects/${projectId}/stats`).pipe(
      map((response) => this.mapProjectStats(this.extractEntity(response)))
    );
  }

  private extractCollection<T>(response: ApiCollection<T> | null | undefined): T[] {
    if (Array.isArray(response)) {
      return response;
    }

    const record = this.asRecord(response);
    const candidates = ['data', 'items', 'content', 'results'] as const;

    for (const key of candidates) {
      const candidate = record[key];
      if (Array.isArray(candidate)) {
        return candidate as T[];
      }
    }

    return [];
  }

  private extractEntity<T>(response: ApiEntity<T> | null | undefined): unknown {
    const record = this.asRecord(response);
    return record['data'] ?? record['item'] ?? record['result'] ?? response ?? {};
  }

  private mapProject(value: unknown): FinanceProject {
    const record = this.asRecord(value);
    const client = this.asRecord(record['client']);
    const clientName = this.asString(record['clientName'])
      || [this.asString(client['firstName']), this.asString(client['lastName'])].filter(Boolean).join(' ').trim();
    const budgets = this.extractCollection(record['budgets'] as ApiCollection<unknown>).map((item) => this.mapBudget(item));
    const expenses = this.extractCollection(record['expenses'] as ApiCollection<unknown>).map((item) => this.mapExpense(item));

    return {
      id: this.asNumber(record['id']),
      name: this.asString(record['name']),
      description: this.asString(record['description']),
      status: this.toProjectStatus(record['status']),
      createdAt: this.asString(record['createdAt'] ?? record['created_at']),
      clientId: this.asNumber(record['clientId'] ?? record['client_id'] ?? client['id']),
      clientName,
      ownerId: this.asNullableString(record['ownerId'] ?? record['owner_id']) ?? undefined,
      budgets,
      expenses
    };
  }

  private mapBudget(value: unknown): FinanceBudget {
    const record = this.asRecord(value);
    return {
      id: this.asNumber(record['id']),
      name: this.asString(record['name']),
      description: this.asString(record['description']),
      plannedAmount: this.asNumber(record['plannedAmount'] ?? record['planned_amount']),
      allocatedAmount: this.asNumber(record['allocatedAmount'] ?? record['allocated_amount']),
      startDate: this.asNullableString(record['startDate'] ?? record['start_date']),
      endDate: this.asNullableString(record['endDate'] ?? record['end_date']),
      projectId: this.asNumber(record['projectId'] ?? record['project_id']),
      projectName: this.asString(record['projectName'] ?? record['project_name']),
      createdBy: this.asNullableString(record['createdBy'] ?? record['created_by']) ?? undefined
    };
  }

  private mapExpense(value: unknown): FinanceExpense {
    const record = this.asRecord(value);
    return {
      id: this.asNumber(record['id']),
      title: this.asString(record['title']),
      description: this.asString(record['description']),
      amount: this.asNumber(record['amount']),
      expenseDate: this.asString(record['expenseDate'] ?? record['expense_date']),
      budgetId: this.asNumber(record['budgetId'] ?? record['budget_id']),
      budgetName: this.asString(record['budgetName'] ?? record['budget_name']),
      projectId: this.asNumber(record['projectId'] ?? record['project_id']),
      createdBy: this.asNullableString(record['createdBy'] ?? record['created_by']) ?? undefined
    };
  }

  private mapReport(value: unknown): FinancialReport {
    const record = this.asRecord(value);
    return {
      id: this.asNumber(record['id']),
      generatedAt: this.asString(record['generatedAt'] ?? record['generated_at']),
      totalBudget: this.asNumber(record['totalBudget'] ?? record['total_budget']),
      totalExpenses: this.asNumber(record['totalExpenses'] ?? record['total_expenses']),
      variance: this.asNumber(record['variance']),
      summary: this.asString(record['summary']),
      projectId: this.asNumber(record['projectId'] ?? record['project_id']),
      projectName: this.asString(record['projectName'] ?? record['project_name']),
      clientName: this.asString(record['clientName'] ?? record['client_name'])
    };
  }

  private mapNotification(value: unknown): AppNotification {
    const record = this.asRecord(value);
    return {
      id: this.asNumber(record['id']),
      title: this.asString(record['title']),
      message: this.asString(record['message']),
      type: this.asString(record['type']) || 'REPORT_GENERATED',
      read: this.asBoolean(record['read'] ?? record['isRead']),
      createdAt: this.asString(record['createdAt'] ?? record['created_at']),
      projectId: this.asNullableNumber(record['projectId'] ?? record['project_id']),
      projectName: this.asNullableString(record['projectName'] ?? record['project_name'])
    };
  }

  private mapAnalysis(value: unknown): ReportAnalysisResponse {
    const record = this.asRecord(value);
    const summary = this.asString(record['summary']);
    const analysis = this.asString(record['analysis']) || summary;

    return {
      id: this.asNullableNumber(record['id']) ?? undefined,
      fileName: this.asNullableString(record['fileName'] ?? record['file_name']),
      budget: this.asNullableNumber(record['budget']),
      expenses: this.asNullableNumber(record['expenses']),
      status: this.normalizeAnalysisStatus(record['status']),
      summary: summary || analysis || 'No AI summary was returned.',
      analysis: analysis || summary || 'No AI analysis was returned.',
      risks: this.asStringArray(record['risks']),
      recommendations: this.asStringArray(record['recommendations']),
      source: this.asString(record['source']) || 'fallback',
      analyzedAt: this.asNullableString(record['analyzedAt'] ?? record['analyzed_at']),
      projectId: this.asNullableNumber(record['projectId'] ?? record['project_id']) ?? undefined,
      projectName: this.asNullableString(record['projectName'] ?? record['project_name']) ?? undefined
    };
  }

  private mapDashboard(value: unknown): FinanceDashboardResponse {
    const record = this.asRecord(value);
    return {
      globalStats: this.mapGlobalStats(record['globalStats']),
      projects: this.extractCollection(record['projects'] as ApiCollection<unknown>).map((item) => this.mapDashboardProject(item))
    };
  }

  private mapGlobalStats(value: unknown): FinanceGlobalStats {
    const record = this.asRecord(value);
    return {
      totalBudget: this.asNumber(record['totalBudget'] ?? record['total_budget']),
      totalExpenses: this.asNumber(record['totalExpenses'] ?? record['total_expenses']),
      remainingBudget: this.asNumber(record['remainingBudget'] ?? record['remaining_budget']),
      spentPercentage: this.asNumber(record['spentPercentage'] ?? record['spent_percentage']),
      monthlyExpenses: this.extractCollection(record['monthlyExpenses'] as ApiCollection<unknown>).map((item) => this.mapMonthlyExpensePoint(item))
    };
  }

  private mapProjectStats(value: unknown): FinanceProjectStats {
    const record = this.asRecord(value);
    return {
      projectId: this.asNumber(record['projectId'] ?? record['project_id']),
      projectName: this.asString(record['projectName'] ?? record['project_name']),
      budget: this.asNumber(record['budget']),
      expenses: this.asNumber(record['expenses']),
      remainingBudget: this.asNumber(record['remainingBudget'] ?? record['remaining_budget']),
      spentPercentage: this.asNumber(record['spentPercentage'] ?? record['spent_percentage']),
      overspending: this.asBoolean(record['overspending']),
      expenseTrend: this.extractCollection(record['expenseTrend'] as ApiCollection<unknown>).map((item) => this.mapMonthlyExpensePoint(item)),
      totalTasks: this.asNumber(record['totalTasks'] ?? record['total_tasks']),
      completedTasks: this.asNumber(record['completedTasks'] ?? record['completed_tasks']),
      lateTasks: this.asNumber(record['lateTasks'] ?? record['late_tasks']),
      upcomingDeadlines: this.asNumber(record['upcomingDeadlines'] ?? record['upcoming_deadlines']),
      risk: this.mapRiskAnalysis(record['risk']),
      insights: this.asStringArray(record['insights'])
    };
  }

  private mapDashboardProject(value: unknown): FinanceDashboardProject {
    const record = this.asRecord(value);
    return {
      projectId: this.asNumber(record['projectId'] ?? record['project_id']),
      projectName: this.asString(record['projectName'] ?? record['project_name']),
      budget: this.asNumber(record['budget']),
      expenses: this.asNumber(record['expenses']),
      remainingBudget: this.asNumber(record['remainingBudget'] ?? record['remaining_budget']),
      spentPercentage: this.asNumber(record['spentPercentage'] ?? record['spent_percentage']),
      overspending: this.asBoolean(record['overspending']),
      riskScore: this.asNumber(record['riskScore'] ?? record['risk_score']),
      riskLevel: this.asString(record['riskLevel'] ?? record['risk_level']) || 'LOW',
      expenseTrend: this.extractCollection(record['expenseTrend'] as ApiCollection<unknown>).map((item) => this.mapMonthlyExpensePoint(item)),
      insights: this.asStringArray(record['insights'])
    };
  }

  private mapRiskAnalysis(value: unknown): FinanceRiskAnalysis {
    const record = this.asRecord(value);
    const factors = this.asRecord(record['factors']);
    return {
      riskScore: this.asNumber(record['riskScore'] ?? record['risk_score']),
      riskLevel: this.asString(record['riskLevel'] ?? record['risk_level']) || 'LOW',
      factors: {
        budgetOverflow: this.asNumber(factors['budgetOverflow'] ?? factors['budget_overflow']),
        taskDelayRatio: this.asNumber(factors['taskDelayRatio'] ?? factors['task_delay_ratio']),
        deadlinePressure: this.asNumber(factors['deadlinePressure'] ?? factors['deadline_pressure']),
        expenseGrowth: this.asNumber(factors['expenseGrowth'] ?? factors['expense_growth'])
      }
    };
  }

  private mapMonthlyExpensePoint(value: unknown): FinanceMonthlyExpensePoint {
    const record = this.asRecord(value);
    return {
      month: this.asString(record['month']),
      year: this.asNumber(record['year']),
      monthNumber: this.asNumber(record['monthNumber'] ?? record['month_number']),
      amount: this.asNumber(record['amount'])
    };
  }

  private toProjectStatus(value: unknown): FinanceProject['status'] {
    const normalized = String(value ?? '').toUpperCase();
    if (normalized === 'IN_PROGRESS' || normalized === 'ON_HOLD' || normalized === 'COMPLETED') {
      return normalized;
    }

    return 'PLANNED';
  }

  private normalizeAnalysisStatus(value: unknown): ReportAnalysisResponse['status'] {
    const normalized = String(value ?? '').trim().toUpperCase();
    if (normalized === 'ACCEPTABLE') {
      return 'ACCEPTABLE';
    }

    if (normalized === 'NOT ACCEPTABLE' || normalized === 'NON ACCEPTABLE') {
      return 'NOT ACCEPTABLE';
    }

    return null;
  }

  private asRecord(value: unknown): Record<string, unknown> {
    return typeof value === 'object' && value !== null ? value as Record<string, unknown> : {};
  }

  private asString(value: unknown): string {
    return typeof value === 'string' ? value : value == null ? '' : String(value);
  }

  private asNullableString(value: unknown): string | null {
    const text = this.asString(value).trim();
    return text ? text : null;
  }

  private asNumber(value: unknown): number {
    if (typeof value === 'number') {
      return Number.isFinite(value) ? value : 0;
    }

    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : 0;
  }

  private asNullableNumber(value: unknown): number | null {
    if (value == null || value === '') {
      return null;
    }

    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }

  private asBoolean(value: unknown): boolean {
    return value === true || value === 'true' || value === 1 || value === '1';
  }

  private asStringArray(value: unknown): string[] {
    if (!Array.isArray(value)) {
      return [];
    }

    return value
      .map((entry) => this.asString(entry).trim())
      .filter((entry) => entry.length > 0);
  }

  private buildPlaceholderNotification(id: number): AppNotification {
    return {
      id,
      title: '',
      message: '',
      type: 'REPORT_GENERATED',
      read: true,
      createdAt: new Date().toISOString(),
      projectId: null,
      projectName: null
    };
  }
}
