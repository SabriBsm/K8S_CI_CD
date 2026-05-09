import { Component, OnInit } from '@angular/core';
import { MessageService } from 'primeng/api';
import {
  ApplyAiSuggestionRequest,
  HistoricalActionRecommendation,
  MlNonConformityPredictionResponse,
  NonConformity,
  NonConformityAiSuggestionRequest,
  NonConformityAiSuggestionResponse,
  SmartCorrectiveActionRecommendation
} from '../../models/quality.models';
import { QualityDataService, QualitySortDir } from '../../services/quality-data.service';

interface SortOption {
  label: string;
  value: string;
}

@Component({
  selector: 'app-quality-non-conformities-page',
  templateUrl: './quality-non-conformities-page.component.html',
  styleUrl: './quality-non-conformities-page.component.scss'
})
export class QualityNonConformitiesPageComponent implements OnInit {
  loading = true;
  nonConformities: NonConformity[] = [];
  globalSearch = '';
  aiDialogVisible = false;
  aiLoading = false;
  aiCreateLoading = false;
  aiError = '';
  aiApplyError = '';
  aiSelectedItem: NonConformity | null = null;
  aiSelectedReference = '';
  aiSelectedTitle = '';
  aiSuggestions: NonConformityAiSuggestionResponse | null = null;
  smartRecommendations: SmartCorrectiveActionRecommendation | null = null;
  recommendationCreateLoadingId: number | null = null;
  generatingItemId: number | null = null;
  mlDialogVisible = false;
  mlLoading = false;
  mlError = '';
  mlDescription = '';
  mlSelectedReference = '';
  mlSelectedTitle = '';
  mlPrediction: MlNonConformityPredictionResponse | null = null;
  selectedSortBy = 'createdAt';
  selectedSortDir: QualitySortDir = 'desc';
  readonly sortByOptions: SortOption[] = [
    { label: 'Created Date', value: 'createdAt' },
    { label: 'Updated Date', value: 'updatedAt' },
    { label: 'ID', value: 'id' },
    { label: 'Reference', value: 'referenceCode' },
    { label: 'Title', value: 'title' },
    { label: 'Status', value: 'status' },
    { label: 'Severity', value: 'severity' },
    { label: 'Detected Date', value: 'detectedDate' },
    { label: 'Due Date', value: 'dueDate' }
  ];
  readonly sortDirOptions: SortOption[] = [
    { label: 'Descending', value: 'desc' },
    { label: 'Ascending', value: 'asc' }
  ];

  constructor(
    private qualityDataService: QualityDataService,
    private messageService: MessageService
  ) {}

  ngOnInit(): void {
    this.loadItems();
  }

  loadItems(): void {
    this.loading = true;
    this.qualityDataService.getNonConformities(this.selectedSortBy, this.selectedSortDir).subscribe(items => {
      this.nonConformities = items;
      this.loading = false;
    }, () => {
      this.loading = false;
    });
  }

  onSortChange(): void {
    this.loadItems();
  }

  closeItem(item: NonConformity): void {
    this.qualityDataService.closeNonConformity(item.id).subscribe(() => {
      item.status = 'CLOSED';
      item.resolutionDate = new Date().toISOString();
      this.messageService.add({ severity: 'success', summary: 'Finding closed', detail: `${item.referenceCode} closed successfully.` });
    });
  }

  generateSuggestions(item: NonConformity): void {
    this.aiDialogVisible = true;
    this.aiLoading = true;
    this.aiError = '';
    this.aiSuggestions = null;
    this.smartRecommendations = null;
    this.generatingItemId = item.id;
    this.aiSelectedItem = item;
    this.aiSelectedReference = item.referenceCode;
    this.aiSelectedTitle = item.title;

    this.qualityDataService.getSmartCorrectiveActionRecommendations(item.id).subscribe({
      next: response => {
        this.smartRecommendations = response;
        this.aiSuggestions = response.aiSuggestions;
        this.aiLoading = false;
        this.generatingItemId = null;
      },
      error: error => {
        this.aiLoading = false;
        this.generatingItemId = null;
        this.aiError = error?.error?.message || 'AI suggestions could not be generated for this finding.';
        this.messageService.add({
          severity: 'error',
          summary: 'Generation failed',
          detail: this.aiError
        });
      }
    });
  }

  closeAiDialog(): void {
    this.aiDialogVisible = false;
    this.aiLoading = false;
    this.aiCreateLoading = false;
    this.aiError = '';
    this.aiApplyError = '';
    this.aiSuggestions = null;
    this.smartRecommendations = null;
    this.recommendationCreateLoadingId = null;
    this.aiSelectedItem = null;
    this.aiSelectedReference = '';
    this.aiSelectedTitle = '';
    this.generatingItemId = null;
  }

  createCorrectiveActionFromSuggestion(): void {
    if (!this.aiSelectedItem || !this.aiSuggestions || this.aiCreateLoading) {
      return;
    }

    this.aiCreateLoading = true;
    this.aiApplyError = '';

    this.qualityDataService.createCorrectiveActionFromAiSuggestion(
      this.aiSelectedItem.id,
      this.buildApplySuggestionPayload(this.aiSelectedItem, this.aiSuggestions)
    ).subscribe({
      next: () => {
        const reference = this.aiSelectedItem?.referenceCode ?? 'finding';
        this.aiCreateLoading = false;
        this.messageService.add({
          severity: 'success',
          summary: 'Corrective action created',
          detail: `A corrective action was created for ${reference}.`
        });
        this.loadItems();
        this.closeAiDialog();
      },
      error: error => {
        this.aiCreateLoading = false;
        this.aiApplyError = error?.error?.message || 'The corrective action could not be created from this suggestion.';
        this.messageService.add({
          severity: error?.status === 409 ? 'warn' : 'error',
          summary: error?.status === 409 ? 'Already exists' : 'Creation failed',
          detail: this.aiApplyError
        });
      }
    });
  }

  createCorrectiveActionFromRecommendation(recommendation: HistoricalActionRecommendation): void {
    if (!this.aiSelectedItem || this.recommendationCreateLoadingId) {
      return;
    }

    this.recommendationCreateLoadingId = recommendation.sourceCorrectiveActionId;
    this.aiApplyError = '';

    this.qualityDataService.createCorrectiveActionFromRecommendation(
      this.aiSelectedItem.id,
      {
        sourceCorrectiveActionId: recommendation.sourceCorrectiveActionId,
        title: recommendation.recommendedTitle,
        description: recommendation.recommendedDescription,
        actionType: 'CORRECTIVE',
        priority: recommendation.priority || this.aiSelectedItem.severity,
        assignedToUserId: this.aiSelectedItem.assignedTo?.id,
        createdByUserId: this.aiSelectedItem.reportedBy?.id,
        dueDate: this.aiSelectedItem.dueDate
      }
    ).subscribe({
      next: () => {
        const reference = this.aiSelectedItem?.referenceCode ?? 'finding';
        this.recommendationCreateLoadingId = null;
        this.messageService.add({
          severity: 'success',
          summary: 'Corrective action created',
          detail: `A corrective action was created for ${reference}.`
        });
        this.loadItems();
        this.closeAiDialog();
      },
      error: error => {
        this.recommendationCreateLoadingId = null;
        this.aiApplyError = error?.error?.message || 'The corrective action could not be created from this recommendation.';
        this.messageService.add({
          severity: 'error',
          summary: 'Creation failed',
          detail: this.aiApplyError
        });
      }
    });
  }

  openMlDialog(item: NonConformity): void {
    this.mlDialogVisible = true;
    this.mlLoading = false;
    this.mlError = '';
    this.mlPrediction = null;
    this.mlDescription = item.description ?? '';
    this.mlSelectedReference = item.referenceCode;
    this.mlSelectedTitle = item.title;
  }

  runMlPrediction(): void {
    const description = this.mlDescription.trim();
    if (!description) {
      this.mlError = 'Description is required for ML prediction.';
      this.messageService.add({
        severity: 'warn',
        summary: 'Description required',
        detail: this.mlError
      });
      return;
    }

    this.mlLoading = true;
    this.mlError = '';
    this.mlPrediction = null;

    this.qualityDataService.predictNonConformity({ description }).subscribe({
      next: response => {
        this.mlPrediction = response;
        this.mlLoading = false;
        this.messageService.add({
          severity: 'success',
          summary: 'Prediction ready',
          detail: 'ML category and priority were predicted successfully.'
        });
      },
      error: error => {
        this.mlLoading = false;
        this.mlError = error?.error?.message || 'ML prediction failed for this description.';
        this.messageService.add({
          severity: 'error',
          summary: 'Prediction failed',
          detail: this.mlError
        });
      }
    });
  }

  closeMlDialog(): void {
    this.mlDialogVisible = false;
    this.mlLoading = false;
    this.mlError = '';
    this.mlDescription = '';
    this.mlSelectedReference = '';
    this.mlSelectedTitle = '';
    this.mlPrediction = null;
  }

  get filteredItems(): NonConformity[] {
    const term = this.globalSearch.trim().toLowerCase();
    if (!term) {
      return this.nonConformities;
    }

    return this.nonConformities.filter(item =>
      [item.referenceCode, item.title, item.status, item.severity, item.project?.name, item.assignedTo?.firstName, item.assignedTo?.lastName]
        .filter(Boolean)
        .some(value => String(value).toLowerCase().includes(term))
    );
  }

  getStatusClass(status: string): string {
    const map: Record<string, string> = {
      OPEN: 'badge-pending',
      IN_PROGRESS: 'badge-in-progress',
      RESOLVED: 'badge-active',
      CLOSED: 'badge-closed'
    };
    return map[status] ?? 'badge-on-hold';
  }

  getSeverityClass(severity: string): string {
    const map: Record<string, string> = {
      LOW: 'priority-low',
      MEDIUM: 'priority-medium',
      HIGH: 'priority-high',
      CRITICAL: 'priority-critical'
    };
    return map[severity] ?? 'priority-medium';
  }

  private buildAiPayload(item: NonConformity): NonConformityAiSuggestionRequest {
    return {
      referenceCode: item.referenceCode,
      title: item.title,
      description: item.description,
      severity: item.severity,
      status: item.status,
      detectedDate: item.detectedDate,
      dueDate: item.dueDate,
      resolutionDate: item.resolutionDate,
      rootCause: item.rootCause,
      resolutionSummary: item.resolutionSummary
    };
  }

  private buildApplySuggestionPayload(
    item: NonConformity,
    suggestion: NonConformityAiSuggestionResponse
  ): ApplyAiSuggestionRequest {
    return {
      title: `AI Recommended Fix: ${item.title}`,
      description: this.buildSuggestionDescription(suggestion),
      priority: suggestion.suggestedPriority,
      actionType: 'CORRECTIVE',
      assignedToUserId: item.assignedTo?.id,
      createdByUserId: item.reportedBy?.id,
      dueDate: item.dueDate
    };
  }

  private buildSuggestionDescription(suggestion: NonConformityAiSuggestionResponse): string {
    const actions = suggestion.suggestedCorrectiveActions
      .map(action => `- ${action}`)
      .join('\n');

    return [
      `Probable root cause: ${suggestion.probableRootCause}`,
      '',
      'Suggested corrective actions:',
      actions,
      '',
      `Reasoning: ${suggestion.reasoning}`
    ].join('\n').trim();
  }
}
