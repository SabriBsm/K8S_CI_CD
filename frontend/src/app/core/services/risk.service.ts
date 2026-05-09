import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable, of, throwError } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import { environment } from '../../../environments/environment';
import {
  AiMitigationDetectionRequest,
  AiMitigationDetectionResult,
  CreateMitigationPlanRequest,
  CreateRiskRequest,
  DashboardStats,
  MitigationEffectivenessEvaluationRequest,
  MitigationITRule,
  MitigationPlan,
  NotificationRule,
  ProjectOption,
  Risk,
  RiskAlertsSummary,
  RiskHistory,
  UpdateMitigationPlanRequest,
  UpdateRiskRequest
} from '../models/risk.model';

@Injectable({ providedIn: 'root' })
export class RiskService {
  private readonly riskBaseUrl = `${(environment as any).riskApiUrl ?? environment.apiUrl}`;
  private readonly apiUrl = `${this.riskBaseUrl}/risks`;
  private readonly projectApiUrl = `${(environment as any).projectApiUrl ?? environment.apiUrl}/projects`;
  private readonly financeProjectsApiUrl = (() => {
    const base = String((environment as any).financeApiUrl ?? '').trim();
    return base ? `${base}/projects` : '';
  })();
  private readonly aiApiUrl = `${this.riskBaseUrl}/ai`;
  private readonly chatbotApiUrl = `${this.riskBaseUrl}/chatboot`;
  private readonly mitigationApiUrl = `${this.riskBaseUrl}/mitigation-plans`;
  private readonly projectsCacheKey = 'plansync_risk_projects_cache';

  private readonly jsonOptions = {
    headers: new HttpHeaders({
      'Content-Type': 'application/json',
      Accept: 'application/json'
    })
  };

  constructor(private http: HttpClient) {}

  getRisks(): Observable<Risk[]> {
    return this.http.get<Risk[]>(this.apiUrl);
  }

  getRiskDetails(id: number): Observable<Risk> {
    return this.http.get<Risk>(`${this.apiUrl}/${id}/details`);
  }

  getRiskHistory(id: number): Observable<RiskHistory[]> {
    return this.http.get<RiskHistory[]>(`${this.apiUrl}/${id}/history`);
  }

  createRisk(request: CreateRiskRequest): Observable<Risk> {
    return this.http.post<Risk>(this.apiUrl, request, this.jsonOptions);
  }

  updateRisk(id: number, request: UpdateRiskRequest): Observable<Risk> {
    return this.http.put<Risk>(`${this.apiUrl}/${id}`, request, this.jsonOptions);
  }

  deleteRisk(id: number): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${id}`);
  }

  createMitigation(riskId: number, request: CreateMitigationPlanRequest): Observable<MitigationPlan> {
    const payload = {
      ...request,
      riskId
    };

    return this.http.post<MitigationPlan>(this.mitigationApiUrl, payload, this.jsonOptions);
  }

  updateMitigation(riskId: number, mitigationId: number, request: UpdateMitigationPlanRequest): Observable<MitigationPlan> {
    return this.http.put<MitigationPlan>(`${this.mitigationApiUrl}/${mitigationId}`, request, this.jsonOptions);
  }

  deleteMitigation(riskId: number, mitigationId: number): Observable<void> {
    return this.http.delete<void>(`${this.mitigationApiUrl}/${mitigationId}`);
  }

  getMitigationsByRiskId(riskId: number): Observable<MitigationPlan[]> {
    return this.http.get<MitigationPlan[]>(`${this.mitigationApiUrl}/by-risk/${riskId}`);
  }

  getMilestonesByRiskId(riskId: number): Observable<any[]> {
    return this.http.get<any[]>(`${this.mitigationApiUrl}/by-risk/${riskId}`);
  }

  getRisksByProjectId(projectId: number): Observable<Risk[]> {
    return this.http.get<Risk[]>(`${this.apiUrl}/by-project/${projectId}`);
  }

  getAllMitigations(): Observable<MitigationPlan[]> {
    return this.http.get<MitigationPlan[]>(this.mitigationApiUrl);
  }

  getMitigationITRules(): Observable<MitigationITRule[]> {
    return this.http.get<MitigationITRule[]>(`${this.mitigationApiUrl}/it-rules`);
  }

  detectMitigationProfilesWithAi(request: AiMitigationDetectionRequest): Observable<AiMitigationDetectionResult[]> {
    return this.http.post<AiMitigationDetectionResult[]>(`${this.aiApiUrl}/detect-mitigations`, request, this.jsonOptions);
  }

  getNotificationRules(): Observable<NotificationRule[]> {
    return this.http.get<NotificationRule[]>(`${this.riskBaseUrl}/notifications/rules`);
  }

  saveNotificationRules(rules: NotificationRule[]): Observable<NotificationRule[]> {
    return this.http.put<NotificationRule[]>(`${this.riskBaseUrl}/notifications/rules`, rules, this.jsonOptions);
  }

  getRiskAlertsSummary(): Observable<RiskAlertsSummary> {
    return this.http.get<RiskAlertsSummary>(`${this.apiUrl}/alerts/summary`);
  }

  assignMitigationToRisk(mitigationId: number, riskId: number): Observable<MitigationPlan> {
    return this.http.put<MitigationPlan>(`${this.mitigationApiUrl}/${mitigationId}/assign/${riskId}`, {}, this.jsonOptions);
  }

  unassignMitigationFromRisk(mitigationId: number): Observable<void> {
    return this.http.put<void>(`${this.mitigationApiUrl}/${mitigationId}/unassign`, {}, this.jsonOptions);
  }

  evaluateMitigationEffectiveness(
    mitigationId: number,
    request: MitigationEffectivenessEvaluationRequest
  ): Observable<MitigationPlan> {
    return this.http.post<MitigationPlan>(
      `${this.mitigationApiUrl}/${mitigationId}/evaluate-effectiveness`,
      request,
      this.jsonOptions
    );
  }

  generateRiskDescription(title: string): Observable<string> {
    return this.http.get(`${this.aiApiUrl}/generate-description`, {
      params: { title },
      responseType: 'text'
    });
  }

  askChatbot(question: string, title: string, description: string): Observable<string> {
    return this.http.post<{ response: string }>(`${this.chatbotApiUrl}/ask`, {
      question,
      title,
      description
    }).pipe(
      map((response: { response: string }) => response.response)
    );
  }

  getDashboardStats(): Observable<DashboardStats> {
    return this.http.get<DashboardStats>(`${(environment as any).riskApiUrl ?? environment.apiUrl}/statistics/dashboard`);
  }

  getProjects(userId?: string): Observable<ProjectOption[]> {
    const configuredRiskProjectsUrl = String((environment as any).riskProjectsApiUrl ?? '').trim();
    const userScopedProjectUrl = userId ? `${this.projectApiUrl}/user/${encodeURIComponent(userId)}` : '';
    const candidateEndpoints = [
      ...(configuredRiskProjectsUrl ? [configuredRiskProjectsUrl] : []),
      ...(userScopedProjectUrl ? [userScopedProjectUrl] : []),
      this.financeProjectsApiUrl,
      this.projectApiUrl
    ].map((url) => String(url ?? '').trim()).filter(Boolean);
    const projectEndpoints = Array.from(new Set(candidateEndpoints));

    const tryEndpoint = (index: number): Observable<ProjectOption[]> => {
      if (index >= projectEndpoints.length) {
        const cachedProjects = this.readCachedProjectOptions();
        return cachedProjects.length > 0
          ? of(cachedProjects)
          : throwError(() => new Error('No project endpoint available'));
      }

      return this.http.get<any>(projectEndpoints[index]).pipe(
        map((response: any) => {
          const mapped = this.mapProjectOptions(response);
          if (mapped.length > 0) {
            this.writeCachedProjectOptions(mapped);
          }
          return mapped;
        }),
        catchError(() => tryEndpoint(index + 1))
      );
    };

    return tryEndpoint(0);
  }

  private mapProjectOptions(response: any): ProjectOption[] {
    const items = this.extractProjectItems(response);

    const mapped = items
      .map((project: any) => ({
        id: Number(project?.id ?? project?.projectId),
        name: String(
          project?.name
          ?? project?.projectName
          ?? project?.title
          ?? project?.nom
          ?? ''
        ).trim()
      }))
      .filter((project: ProjectOption) => Number.isFinite(project.id) && !!project.name);

    const unique = new Map<number, ProjectOption>();
    mapped.forEach((project: ProjectOption) => {
      if (!unique.has(project.id)) unique.set(project.id, project);
    });

    return Array.from(unique.values()).sort((a, b) => a.name.localeCompare(b.name));
  }

  private extractProjectItems(response: any): any[] {
    if (Array.isArray(response)) return response;
    if (Array.isArray(response?.content)) return response.content;
    if (Array.isArray(response?.data)) return response.data;
    if (Array.isArray(response?.items)) return response.items;
    if (Array.isArray(response?.results)) return response.results;
    if (Array.isArray(response?.projects)) return response.projects;
    if (Array.isArray(response?._embedded?.projects)) return response._embedded.projects;
    return [];
  }

  private readCachedProjectOptions(): ProjectOption[] {
    try {
      const raw = localStorage.getItem(this.projectsCacheKey);
      if (!raw) return [];
      const parsed = JSON.parse(raw);
      if (!Array.isArray(parsed)) return [];
      return parsed
        .map((item: any) => ({
          id: Number(item?.id),
          name: String(item?.name ?? '').trim()
        }))
        .filter((item: ProjectOption) => Number.isFinite(item.id) && !!item.name);
    } catch {
      return [];
    }
  }

  private writeCachedProjectOptions(projects: ProjectOption[]): void {
    try {
      localStorage.setItem(this.projectsCacheKey, JSON.stringify(projects));
    } catch {
      // Ignore storage errors silently
    }
  }
}
