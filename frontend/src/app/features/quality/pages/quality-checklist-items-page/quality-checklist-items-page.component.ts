import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { MessageService } from 'primeng/api';
import { catchError, forkJoin, of } from 'rxjs';
import {
  AuditChecklistItem,
  InspectionExecutionResponse,
  InspectionRecord,
  InspectionRecordRequest,
  NonConformity,
  QualityAudit
} from '../../models/quality.models';
import { QualityDataService } from '../../services/quality-data.service';

interface ExecutionStats {
  totalItems: number;
  reviewedItems: number;
  passedItems: number;
  failedItems: number;
  partialItems: number;
  complianceRate: number;
  score: number;
  openNonConformities: number;
  blockingFindings: number;
}

interface ExecutionChecklistItem extends AuditChecklistItem {
  latestInspection?: InspectionRecord;
  inspectionCount: number;
}

@Component({
  selector: 'app-quality-checklist-items-page',
  templateUrl: './quality-checklist-items-page.component.html',
  styleUrl: './quality-checklist-items-page.component.scss'
})
export class QualityChecklistItemsPageComponent implements OnInit {
  loading = true;
  submittingInspection = false;
  historyLoading = false;
  audits: QualityAudit[] = [];
  items: ExecutionChecklistItem[] = [];
  auditNonConformities: NonConformity[] = [];
  selectedAudit: QualityAudit | null = null;
  selectedAuditId: number | null = null;
  resultFilter: 'ALL' | 'PASS' | 'FAIL' | 'PARTIAL' = 'ALL';
  inspectionDialogVisible = false;
  historyDialogVisible = false;
  inspectionItem: ExecutionChecklistItem | null = null;
  historyItem: ExecutionChecklistItem | null = null;
  historyRecords: InspectionRecord[] = [];
  inspectionForm: InspectionRecordRequest = {
    auditChecklistItemId: 0,
    qualityAuditId: null,
    observedValue: '',
    comment: '',
    inspectorName: '',
    evidenceUrl: ''
  };

  readonly resultFilters = [
    { label: 'All Items', value: 'ALL' },
    { label: 'Passed', value: 'PASS' },
    { label: 'Failed', value: 'FAIL' },
    { label: 'Partial', value: 'PARTIAL' }
  ];

  constructor(
    private qualityDataService: QualityDataService,
    private messageService: MessageService,
    private route: ActivatedRoute,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.route.queryParamMap.subscribe(params => {
      const auditIdParam = params.get('auditId');
      const requestedAuditId = auditIdParam ? Number(auditIdParam) : null;
      if (requestedAuditId && !Number.isNaN(requestedAuditId)) {
        this.selectedAuditId = requestedAuditId;
      }

      this.loadAudits();
    });
  }

  get stats(): ExecutionStats {
    const totalItems = this.items.length;
    const passedItems = this.items.filter(item => item.status === 'COMPLIANT').length;
    const failedItems = this.items.filter(item => item.status === 'NON_COMPLIANT').length;
    const partialItems = this.items.filter(item => item.status === 'PARTIALLY_COMPLIANT').length;
    const reviewedItems = passedItems + failedItems + partialItems;
    const blockingFindings = this.items.filter(item => item.mandatory && item.status === 'NON_COMPLIANT').length;

    return {
      totalItems,
      reviewedItems,
      passedItems,
      failedItems,
      partialItems,
      complianceRate: this.selectedAudit?.complianceRate || 0,
      score: this.selectedAudit?.score || 0,
      openNonConformities: this.auditNonConformities.filter(item => item.status === 'OPEN' || item.status === 'IN_PROGRESS').length,
      blockingFindings
    };
  }

  get filteredItems(): ExecutionChecklistItem[] {
    if (this.resultFilter === 'ALL') {
      return this.items;
    }

    return this.items.filter(item => item.latestInspection?.resultStatus === this.resultFilter);
  }

  get auditExecutionBlocked(): boolean {
    return !!this.selectedAudit && this.selectedAudit.status !== 'IN_PROGRESS';
  }

  loadAudits(): void {
    this.loading = true;
    this.qualityDataService.getQualityAudits().subscribe(items => {
      this.audits = items;
      this.selectedAuditId = this.resolveSelectedAuditId(items);
      this.selectedAudit = this.audits.find(item => item.id === this.selectedAuditId) ?? null;
      this.loadExecutionData();
    }, () => {
      this.loading = false;
    });
  }

  onAuditChange(): void {
    if (this.selectedAuditId) {
      this.router.navigate([], {
        relativeTo: this.route,
        queryParams: { auditId: this.selectedAuditId },
        queryParamsHandling: 'merge'
      });
      return;
    }

    this.loadExecutionData();
  }

  loadExecutionData(): void {
    if (!this.selectedAuditId) {
      this.items = [];
      this.auditNonConformities = [];
      this.selectedAudit = null;
      this.loading = false;
      return;
    }

    this.loading = true;
    this.selectedAudit = this.audits.find(item => item.id === this.selectedAuditId) ?? null;

    forkJoin({
      items: this.qualityDataService.getChecklistItems(this.selectedAuditId),
      records: this.qualityDataService.getInspectionRecordsByAudit(this.selectedAuditId).pipe(
        catchError(error => {
          console.warn('Inspection records could not be loaded for audit execution workspace.', error);
          return of([]);
        })
      ),
      nonConformities: this.qualityDataService.getNonConformitiesByAudit(this.selectedAuditId).pipe(
        catchError(error => {
          console.warn('Non-conformities could not be loaded for audit execution workspace.', error);
          return of([]);
        })
      )
    }).subscribe(({ items, records, nonConformities }) => {
      this.items = this.mergeInspectionState(items, records);
      this.auditNonConformities = nonConformities;
      this.loading = false;
    }, (error) => {
      this.loading = false;
      this.items = [];
      this.auditNonConformities = [];
      console.error('Checklist items could not be loaded for audit execution workspace.', error);
      this.messageService.add({ severity: 'error', summary: 'Load failed', detail: 'Checklist items could not be loaded for the selected audit.' });
    });
  }

  openInspection(item: ExecutionChecklistItem): void {
    if (this.auditExecutionBlocked) {
      this.messageService.add({
        severity: 'warn',
        summary: 'Verification required',
        detail: 'Face verification is required before executing this audit.'
      });
      this.router.navigate(['/quality/audit-verification'], { queryParams: { auditId: this.selectedAuditId } });
      return;
    }

    this.inspectionItem = item;
    this.inspectionForm = {
      auditChecklistItemId: item.id,
      qualityAuditId: this.selectedAuditId,
      observedValue: item.observedValue || '',
      comment: item.comment || '',
      inspectorName: this.getDefaultInspectorName(),
      evidenceUrl: item.latestInspection?.evidenceUrl || ''
    };
    this.inspectionDialogVisible = true;
  }

  openHistory(item: ExecutionChecklistItem): void {
    this.historyItem = item;
    this.historyRecords = [];
    this.historyDialogVisible = true;
    this.historyLoading = true;

    this.qualityDataService.getInspectionRecordsByChecklistItem(item.id).subscribe(records => {
      this.historyRecords = records;
      this.historyLoading = false;
    }, () => {
      this.historyLoading = false;
      this.messageService.add({ severity: 'error', summary: 'History unavailable', detail: 'Inspection history could not be loaded.' });
    });
  }

  goToAuditVerification(): void {
    this.router.navigate(['/quality/audit-verification'], { queryParams: { auditId: this.selectedAuditId } });
  }

  submitInspection(): void {
    if (!this.inspectionItem) {
      return;
    }

    if (this.auditExecutionBlocked) {
      this.messageService.add({
        severity: 'warn',
        summary: 'Execution blocked',
        detail: 'This audit must be started with face verification before inspection can be submitted.'
      });
      return;
    }

    this.submittingInspection = true;
    this.qualityDataService.createInspectionRecord(this.inspectionForm).subscribe(response => {
      this.applyInspectionResponse(response);
      this.submittingInspection = false;
      this.inspectionDialogVisible = false;
      this.messageService.add({ severity: 'success', summary: 'Inspection saved', detail: 'Checklist item updated from live audit execution.' });

      if (response.nonConformityCreated) {
        this.messageService.add({
          severity: 'warn',
          summary: 'Non-conformity generated',
          detail: response.nonConformityReferenceCode
            ? `The system opened ${response.nonConformityReferenceCode} for this failed inspection.`
            : 'A new non-conformity was opened automatically.'
        });
      }
    }, (error) => {
      this.submittingInspection = false;
      this.messageService.add({ severity: 'error', summary: 'Inspection failed', detail: error?.error?.message || 'Inspection record could not be saved.' });
    });
  }

  getStatusClass(status: string): string {
    const map: Record<string, string> = {
      COMPLIANT: 'badge-active',
      PARTIALLY_COMPLIANT: 'badge-in-progress',
      NON_COMPLIANT: 'badge-suspended',
      NOT_REVIEWED: 'badge-pending',
      CLOSED: 'badge-closed',
      COMPLETED: 'badge-active',
      IN_PROGRESS: 'badge-in-progress',
      PLANNED: 'badge-pending'
    };

    return map[status] ?? 'badge-on-hold';
  }

  getInspectionSeverity(resultStatus?: string): 'success' | 'warning' | 'danger' | 'info' {
    switch (resultStatus) {
      case 'PASS':
        return 'success';
      case 'PARTIAL':
        return 'warning';
      case 'FAIL':
        return 'danger';
      default:
        return 'info';
    }
  }

  private resolveSelectedAuditId(audits: QualityAudit[]): number | null {
    if (this.selectedAuditId && audits.some(item => item.id === this.selectedAuditId)) {
      return this.selectedAuditId;
    }

    return audits[0]?.id ?? null;
  }

  private mergeInspectionState(items: AuditChecklistItem[], records: InspectionRecord[]): ExecutionChecklistItem[] {
    const latestRecordMap = new Map<number, InspectionRecord>();
    const inspectionCountMap = new Map<number, number>();

    for (const record of records) {
      inspectionCountMap.set(record.auditChecklistItemId, (inspectionCountMap.get(record.auditChecklistItemId) ?? 0) + 1);
      if (!latestRecordMap.has(record.auditChecklistItemId)) {
        latestRecordMap.set(record.auditChecklistItemId, record);
      }
    }

    return items.map(item => ({
      ...item,
      latestInspection: latestRecordMap.get(item.id),
      inspectionCount: inspectionCountMap.get(item.id) ?? 0
    }));
  }

  private getDefaultInspectorName(): string {
    if (this.selectedAudit?.auditor?.firstName || this.selectedAudit?.auditor?.lastName) {
      return `${this.selectedAudit?.auditor?.firstName || ''} ${this.selectedAudit?.auditor?.lastName || ''}`.trim();
    }

    return 'Lead Auditor';
  }

  private applyInspectionResponse(response: InspectionExecutionResponse): void {
    this.items = this.items.map(item => item.id === response.checklistItem.id
      ? {
          ...response.checklistItem,
          latestInspection: response.inspectionRecord,
          inspectionCount: response.inspectionCountForItem
        }
      : item
    );

    this.audits = this.audits.map(item => item.id === response.qualityAudit.id ? response.qualityAudit : item);
    this.selectedAudit = response.qualityAudit;

    if (this.selectedAuditId) {
      this.qualityDataService.getNonConformitiesByAudit(this.selectedAuditId).pipe(
        catchError(error => {
          console.warn('Non-conformities could not be refreshed after inspection submission.', error);
          return of([]);
        })
      ).subscribe(items => {
        this.auditNonConformities = items;
      });
    }
  }
}
