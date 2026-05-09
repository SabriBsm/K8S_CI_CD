import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { map, Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import {
  ApplyAiSuggestionRequest,
  AuditChecklistItem,
  AuditHeatmapItem,
  AuditIdentityVerificationLog,
  ChecklistReviewPayload,
  CorrectiveAction,
  CreateCorrectiveActionFromEvidenceRequest,
  CreateCorrectiveActionFromRecommendationRequest,
  CreateNonConformityFromEvidenceRequest,
  EvidenceScanResponse,
  FaceProfileResponse,
  InspectionExecutionResponse,
  InspectionRecord,
  InspectionRecordRequest,
  MlNonConformityPredictionRequest,
  MlNonConformityPredictionResponse,
  NonConformity,
  NonConformityAiSuggestionRequest,
  NonConformityAiSuggestionResponse,
  QualityAudit,
  QualityAuditRequest,
  QualityDashboardMetrics,
  QualityDashboardSummary,
  QualityReport,
  QualityStandard,
  RegisterFaceProfileRequest,
  SmartCorrectiveActionRecommendation,
  StandardCriterion,
  StandardCriterionRequest,
  VerifyAuditFaceRequest,
  VerifyAuditFaceResponse
} from '../../features/quality/models/quality.models';

export type QualitySortDir = 'asc' | 'desc';

@Injectable({ providedIn: 'root' })
export class QualityDataService {
  private readonly apiUrl = environment.qualityApiUrl;

  constructor(private http: HttpClient) {}

  getDashboardMetrics(): Observable<QualityDashboardMetrics> {
    return this.http.get<QualityDashboardMetrics>(`${this.apiUrl}/dashboard/metrics`);
  }

  getDashboardSummary(): Observable<QualityDashboardSummary> {
    return this.http.get<QualityDashboardSummary>(`${this.apiUrl}/dashboard/summary`);
  }

  registerFaceProfile(payload: RegisterFaceProfileRequest): Observable<FaceProfileResponse> {
    return this.http.post<FaceProfileResponse>(`${this.apiUrl}/face-verification/register-profile`, payload);
  }

  getFaceProfileStatus(userId: number): Observable<FaceProfileResponse> {
    return this.http.get<FaceProfileResponse>(`${this.apiUrl}/face-verification/profile-status/${userId}`);
  }

  verifyAuditStart(payload: VerifyAuditFaceRequest): Observable<VerifyAuditFaceResponse> {
    return this.http.post<VerifyAuditFaceResponse>(`${this.apiUrl}/face-verification/verify-audit-start`, payload);
  }

  getAuditVerificationLogs(auditId: number): Observable<AuditIdentityVerificationLog[]> {
    return this.http.get<AuditIdentityVerificationLog[]>(`${this.apiUrl}/face-verification/audit/${auditId}/logs`);
  }

  getAuditHeatmap(groupBy: string): Observable<AuditHeatmapItem[]> {
    const params = new HttpParams().set('groupBy', groupBy);
    return this.http.get<AuditHeatmapItem[]>(`${this.apiUrl}/dashboard/audit-heatmap`, { params });
  }

  getQualityStandards(): Observable<QualityStandard[]> {
    return this.http.get<QualityStandard[]>(`${this.apiUrl}/standards`);
  }

  getStandardCriteria(qualityStandardId?: number | null): Observable<StandardCriterion[]> {
    const endpoint = qualityStandardId
      ? `${this.apiUrl}/standard-criteria/quality-standard/${qualityStandardId}/ordered`
      : `${this.apiUrl}/standard-criteria`;

    return this.http.get<StandardCriterion[]>(endpoint);
  }

  createStandardCriterion(qualityStandardId: number, payload: StandardCriterionRequest): Observable<StandardCriterion> {
    return this.http.post<StandardCriterion>(`${this.apiUrl}/standard-criteria`, {
      ...payload,
      qualityStandard: { id: qualityStandardId }
    });
  }

  getQualityAudits(sortBy?: string, sortDir: QualitySortDir = 'desc'): Observable<QualityAudit[]> {
    const params = this.buildSortParams(sortBy, sortDir);
    return this.http.get<QualityAudit[]>(`${this.apiUrl}/audits`, { params });
  }

  getQualityAuditsByStandard(qualityStandardId: number): Observable<QualityAudit[]> {
    return this.http.get<QualityAudit[]>(`${this.apiUrl}/audits/standard/${qualityStandardId}`);
  }

  createQualityAudit(payload: QualityAuditRequest): Observable<QualityAudit> {
    return this.http.post<QualityAudit>(`${this.apiUrl}/audits`, payload);
  }

  closeQualityAudit(id: number): Observable<void> {
    return this.http.patch<void>(`${this.apiUrl}/audits/${id}/close`, {});
  }

  startQualityAudit(auditId: number, userId: number): Observable<QualityAudit> {
    return this.http.post<QualityAudit>(`${this.apiUrl}/audits/${auditId}/start`, { userId });
  }

  getChecklistItems(auditId?: number | null): Observable<AuditChecklistItem[]> {
    const endpoint = auditId
      ? `${this.apiUrl}/audit-checklist-items/audit/${auditId}`
      : `${this.apiUrl}/audit-checklist-items`;

    return this.http.get<AuditChecklistItem[]>(endpoint);
  }

  createInspectionRecord(payload: InspectionRecordRequest): Observable<InspectionExecutionResponse> {
    return this.http.post<InspectionExecutionResponse>(`${this.apiUrl}/inspection-records`, payload);
  }

  getInspectionRecordsByAudit(auditId: number): Observable<InspectionRecord[]> {
    return this.http.get<InspectionRecord[]>(`${this.apiUrl}/inspection-records/audit/${auditId}`);
  }

  getInspectionRecordsByChecklistItem(itemId: number): Observable<InspectionRecord[]> {
    return this.http.get<InspectionRecord[]>(`${this.apiUrl}/inspection-records/checklist-item/${itemId}`);
  }

  getLatestInspectionRecord(itemId: number): Observable<InspectionRecord> {
    return this.http.get<InspectionRecord>(`${this.apiUrl}/inspection-records/checklist-item/${itemId}/latest`);
  }

  reviewChecklistItem(id: number, payload: ChecklistReviewPayload): Observable<void> {
    let params = new HttpParams().set('status', payload.status);
    if (payload.observedValue) {
      params = params.set('observedValue', payload.observedValue);
    }
    if (payload.comment) {
      params = params.set('comment', payload.comment);
    }

    return this.http.patch<void>(`${this.apiUrl}/audit-checklist-items/${id}/review`, {}, { params });
  }

  getNonConformities(sortBy?: string, sortDir: QualitySortDir = 'desc'): Observable<NonConformity[]> {
    const params = this.buildSortParams(sortBy, sortDir);
    return this.http.get<NonConformity[]>(`${this.apiUrl}/non-conformities`, { params });
  }

  getNonConformitiesByAudit(auditId: number): Observable<NonConformity[]> {
    return this.http.get<NonConformity[]>(`${this.apiUrl}/non-conformities/audit/${auditId}`);
  }

  closeNonConformity(id: number): Observable<void> {
    return this.http.patch(`${this.apiUrl}/non-conformities/${id}/close`, {}, { responseType: 'text' }).pipe(
      map(() => void 0)
    );
  }

  generateNonConformitySuggestions(
    payload: NonConformityAiSuggestionRequest
  ): Observable<NonConformityAiSuggestionResponse> {
    return this.http.post<NonConformityAiSuggestionResponse>(`${this.apiUrl}/ai/non-conformities/suggestions`, payload);
  }

  getSmartCorrectiveActionRecommendations(
    nonConformityId: number
  ): Observable<SmartCorrectiveActionRecommendation> {
    return this.http.get<SmartCorrectiveActionRecommendation>(
      `${this.apiUrl}/non-conformities/${nonConformityId}/smart-corrective-recommendations`
    );
  }

  predictNonConformity(
    payload: MlNonConformityPredictionRequest
  ): Observable<MlNonConformityPredictionResponse> {
    return this.http.post<MlNonConformityPredictionResponse>(`${this.apiUrl}/ml/non-conformities/predict`, payload);
  }

  getCorrectiveActions(sortBy?: string, sortDir: QualitySortDir = 'desc'): Observable<CorrectiveAction[]> {
    const params = this.buildSortParams(sortBy, sortDir);
    return this.http.get<CorrectiveAction[]>(`${this.apiUrl}/corrective-actions`, { params });
  }

  createCorrectiveActionFromAiSuggestion(
    nonConformityId: number,
    payload: ApplyAiSuggestionRequest
  ): Observable<CorrectiveAction> {
    return this.http.post<CorrectiveAction>(`${this.apiUrl}/corrective-actions/from-ai-suggestion/${nonConformityId}`, payload);
  }

  createCorrectiveActionFromRecommendation(
    nonConformityId: number,
    payload: CreateCorrectiveActionFromRecommendationRequest
  ): Observable<CorrectiveAction> {
    return this.http.post<CorrectiveAction>(
      `${this.apiUrl}/non-conformities/${nonConformityId}/corrective-actions/from-recommendation`,
      payload
    );
  }

  scanEvidence(payload: {
    auditId?: number | null;
    checklistItemId?: number | null;
    file?: File | null;
    manualText?: string;
  }): Observable<EvidenceScanResponse> {
    const formData = new FormData();
    if (payload.auditId) {
      formData.append('auditId', String(payload.auditId));
    }
    if (payload.checklistItemId) {
      formData.append('checklistItemId', String(payload.checklistItemId));
    }
    if (payload.file) {
      formData.append('file', payload.file);
    }
    if (payload.manualText?.trim()) {
      formData.append('manualText', payload.manualText.trim());
    }

    return this.http.post<EvidenceScanResponse>(`${this.apiUrl}/evidence-scanner/scan`, formData);
  }

  createNonConformityFromEvidence(
    payload: CreateNonConformityFromEvidenceRequest
  ): Observable<NonConformity> {
    return this.http.post<NonConformity>(`${this.apiUrl}/evidence-scanner/create-non-conformity`, payload);
  }

  createCorrectiveActionFromEvidence(
    nonConformityId: number,
    payload: CreateCorrectiveActionFromEvidenceRequest
  ): Observable<CorrectiveAction> {
    return this.http.post<CorrectiveAction>(
      `${this.apiUrl}/evidence-scanner/non-conformities/${nonConformityId}/create-corrective-action`,
      payload
    );
  }

  completeCorrectiveAction(id: number, verificationComment: string): Observable<void> {
    const params = new HttpParams().set('verificationComment', verificationComment);
    return this.http.patch<void>(`${this.apiUrl}/corrective-actions/${id}/complete`, {}, { params });
  }

  getQualityReports(sortBy?: string, sortDir: QualitySortDir = 'desc'): Observable<QualityReport[]> {
    const params = this.buildSortParams(sortBy, sortDir);
    return this.http.get<QualityReport[]>(`${this.apiUrl}/reports`, { params });
  }

  approveQualityReport(id: number, approvedByUserId: number): Observable<void> {
    const params = new HttpParams().set('approvedByUserId', approvedByUserId);
    return this.http.patch<void>(`${this.apiUrl}/reports/${id}/approve`, {}, { params });
  }

  private buildSortParams(sortBy?: string, sortDir: QualitySortDir = 'desc'): HttpParams {
    let params = new HttpParams();
    if (sortBy?.trim()) {
      params = params.set('sortBy', sortBy.trim());
      params = params.set('sortDir', sortDir);
    }
    return params;
  }
}
