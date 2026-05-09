import { Component, OnInit } from '@angular/core';
import { MessageService } from 'primeng/api';
import {
  AuditChecklistItem,
  EvidenceScanResponse,
  NonConformity,
  QualityAudit
} from '../../models/quality.models';
import { QualityDataService } from '../../services/quality-data.service';

@Component({
  selector: 'app-quality-evidence-scanner-page',
  templateUrl: './quality-evidence-scanner-page.component.html',
  styleUrl: './quality-evidence-scanner-page.component.scss'
})
export class QualityEvidenceScannerPageComponent implements OnInit {
  loadingContext = true;
  scanning = false;
  creatingNonConformity = false;
  creatingCorrectiveAction = false;
  audits: QualityAudit[] = [];
  checklistItems: AuditChecklistItem[] = [];
  selectedAuditId: number | null = null;
  selectedChecklistItemId: number | null = null;
  selectedFile: File | null = null;
  manualText = '';
  scanResult: EvidenceScanResponse | null = null;
  createdNonConformity: NonConformity | null = null;

  constructor(
    private qualityDataService: QualityDataService,
    private messageService: MessageService
  ) {}

  ngOnInit(): void {
    this.loadAudits();
  }

  loadAudits(): void {
    this.loadingContext = true;
    this.qualityDataService.getQualityAudits().subscribe({
      next: audits => {
        this.audits = audits;
        this.loadingContext = false;
      },
      error: () => {
        this.audits = [];
        this.loadingContext = false;
      }
    });
  }

  onAuditChange(): void {
    this.selectedChecklistItemId = null;
    this.checklistItems = [];
    if (!this.selectedAuditId) {
      return;
    }

    this.qualityDataService.getChecklistItems(this.selectedAuditId).subscribe({
      next: items => this.checklistItems = items,
      error: () => this.checklistItems = []
    });
  }

  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    this.selectedFile = input.files?.[0] ?? null;
  }

  scanEvidence(): void {
    if (!this.selectedFile && !this.manualText.trim()) {
      this.messageService.add({
        severity: 'warn',
        summary: 'Evidence required',
        detail: 'Upload a PDF/image or paste evidence text before scanning.'
      });
      return;
    }

    this.scanning = true;
    this.scanResult = null;
    this.createdNonConformity = null;

    this.qualityDataService.scanEvidence({
      auditId: this.selectedAuditId,
      checklistItemId: this.selectedChecklistItemId,
      file: this.selectedFile,
      manualText: this.manualText
    }).subscribe({
      next: result => {
        this.scanResult = result;
        this.scanning = false;
        this.messageService.add({
          severity: 'success',
          summary: 'Evidence scanned',
          detail: 'AI evidence analysis is ready for review.'
        });
      },
      error: error => {
        this.scanning = false;
        this.messageService.add({
          severity: 'error',
          summary: 'Scan failed',
          detail: error?.error?.message || 'Evidence could not be scanned.'
        });
      }
    });
  }

  createNonConformity(): void {
    if (!this.scanResult || this.creatingNonConformity) {
      return;
    }

    this.creatingNonConformity = true;
    this.qualityDataService.createNonConformityFromEvidence({
      auditId: this.selectedAuditId,
      checklistItemId: this.selectedChecklistItemId,
      suggestedTitle: this.scanResult.suggestedTitle,
      suggestedDescription: this.scanResult.suggestedDescription,
      detectedIssue: this.scanResult.detectedIssue,
      suggestedSeverity: this.scanResult.suggestedSeverity,
      probableRootCause: this.scanResult.probableRootCause,
      suggestedCategory: this.scanResult.suggestedCategory
    }).subscribe({
      next: nonConformity => {
        this.createdNonConformity = nonConformity;
        this.creatingNonConformity = false;
        this.messageService.add({
          severity: 'success',
          summary: 'Non-conformity created',
          detail: `${nonConformity.referenceCode} was created from the AI evidence scan.`
        });
      },
      error: error => {
        this.creatingNonConformity = false;
        this.messageService.add({
          severity: 'error',
          summary: 'Creation failed',
          detail: error?.error?.message || 'The non-conformity could not be created.'
        });
      }
    });
  }

  createCorrectiveAction(): void {
    if (!this.createdNonConformity || !this.scanResult || this.creatingCorrectiveAction) {
      return;
    }

    this.creatingCorrectiveAction = true;
    this.qualityDataService.createCorrectiveActionFromEvidence(this.createdNonConformity.id, {
      title: `Corrective action: ${this.scanResult.suggestedTitle}`,
      description: this.scanResult.suggestedCorrectiveAction,
      priority: this.scanResult.suggestedPriority,
      assignedToUserId: this.createdNonConformity.assignedTo?.id,
      createdByUserId: this.createdNonConformity.reportedBy?.id,
      dueDate: this.createdNonConformity.dueDate
    }).subscribe({
      next: () => {
        this.creatingCorrectiveAction = false;
        this.messageService.add({
          severity: 'success',
          summary: 'Corrective action created',
          detail: 'The suggested corrective action was added to the finding.'
        });
      },
      error: error => {
        this.creatingCorrectiveAction = false;
        this.messageService.add({
          severity: 'error',
          summary: 'Creation failed',
          detail: error?.error?.message || 'The corrective action could not be created.'
        });
      }
    });
  }

  getSeverityClass(severity?: string): string {
    const map: Record<string, string> = {
      LOW: 'priority-low',
      MEDIUM: 'priority-medium',
      HIGH: 'priority-high',
      CRITICAL: 'priority-critical'
    };
    return map[severity || 'MEDIUM'] ?? 'priority-medium';
  }

  getConfidencePercent(): number {
    return Math.round((this.scanResult?.confidenceScore ?? 0) * 100);
  }
}
