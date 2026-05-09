import { Component, OnInit } from '@angular/core';
import { MessageService } from 'primeng/api';
import { Router } from '@angular/router';
import { QualityAudit } from '../../models/quality.models';
import { QualityDataService, QualitySortDir } from '../../services/quality-data.service';

interface SortOption {
  label: string;
  value: string;
}

@Component({
  selector: 'app-quality-audits-page',
  templateUrl: './quality-audits-page.component.html',
  styleUrl: './quality-audits-page.component.scss'
})
export class QualityAuditsPageComponent implements OnInit {
  loading = true;
  audits: QualityAudit[] = [];
  selectedSortBy = 'createdAt';
  selectedSortDir: QualitySortDir = 'desc';
  readonly sortByOptions: SortOption[] = [
    { label: 'Created Date', value: 'createdAt' },
    { label: 'Updated Date', value: 'updatedAt' },
    { label: 'ID', value: 'id' },
    { label: 'Title', value: 'title' },
    { label: 'Status', value: 'status' },
    { label: 'Planned Date', value: 'plannedDate' },
    { label: 'Execution Date', value: 'executionDate' },
    { label: 'Score', value: 'score' },
    { label: 'Compliance Rate', value: 'complianceRate' }
  ];
  readonly sortDirOptions: SortOption[] = [
    { label: 'Descending', value: 'desc' },
    { label: 'Ascending', value: 'asc' }
  ];

  constructor(
    private qualityDataService: QualityDataService,
    private messageService: MessageService,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.loadAudits();
  }

  loadAudits(): void {
    this.loading = true;
    this.qualityDataService.getQualityAudits(this.selectedSortBy, this.selectedSortDir).subscribe(items => {
      this.audits = items;
      this.loading = false;
    }, () => {
      this.loading = false;
    });
  }

  onSortChange(): void {
    this.loadAudits();
  }

  verifyIdentityToStart(audit: QualityAudit): void {
    if (audit.status === 'IN_PROGRESS') {
      this.router.navigate(['/quality/checklist-items'], { queryParams: { auditId: audit.id } });
      return;
    }

    this.router.navigate(['/quality/audit-verification'], { queryParams: { auditId: audit.id } });
  }

  closeAudit(audit: QualityAudit): void {
    this.qualityDataService.closeQualityAudit(audit.id).subscribe(() => {
      audit.status = 'CLOSED';
      audit.closedAt = new Date().toISOString();
      this.messageService.add({ severity: 'success', summary: 'Audit closed', detail: `${audit.title} marked as closed.` });
    }, (error) => {
      this.messageService.add({
        severity: 'warn',
        summary: 'Close blocked',
        detail: error?.error?.message || 'Mandatory failed inspection items must be resolved before closing this audit.'
      });
    });
  }

  getStatusClass(status: string): string {
    const map: Record<string, string> = {
      PLANNED: 'badge-pending',
      IN_PROGRESS: 'badge-in-progress',
      COMPLETED: 'badge-active',
      CLOSED: 'badge-closed'
    };
    return map[status] ?? 'badge-on-hold';
  }
}
