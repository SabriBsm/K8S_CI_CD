import { Component, OnInit } from '@angular/core';
import { MessageService } from 'primeng/api';
import { AuthService } from '../../../../core/services/auth.service';
import { QualityReport } from '../../models/quality.models';
import { QualityDataService, QualitySortDir } from '../../services/quality-data.service';

interface SortOption {
  label: string;
  value: string;
}

@Component({
  selector: 'app-quality-reports-page',
  templateUrl: './quality-reports-page.component.html',
  styleUrl: './quality-reports-page.component.scss'
})
export class QualityReportsPageComponent implements OnInit {
  loading = true;
  reports: QualityReport[] = [];
  selectedSortBy = 'createdAt';
  selectedSortDir: QualitySortDir = 'desc';
  readonly sortByOptions: SortOption[] = [
    { label: 'Created Date', value: 'createdAt' },
    { label: 'Updated Date', value: 'updatedAt' },
    { label: 'ID', value: 'id' },
    { label: 'Title', value: 'title' },
    { label: 'Status', value: 'status' },
    { label: 'Compliance Rate', value: 'complianceRate' },
    { label: 'Overall Score', value: 'overallScore' },
    { label: 'Approved Date', value: 'approvedAt' }
  ];
  readonly sortDirOptions: SortOption[] = [
    { label: 'Descending', value: 'desc' },
    { label: 'Ascending', value: 'asc' }
  ];

  constructor(
    private qualityDataService: QualityDataService,
    private authService: AuthService,
    private messageService: MessageService
  ) {}

  ngOnInit(): void {
    this.loadReports();
  }

  loadReports(): void {
    this.loading = true;
    this.qualityDataService.getQualityReports(this.selectedSortBy, this.selectedSortDir).subscribe(items => {
      this.reports = items;
      this.loading = false;
    }, () => {
      this.loading = false;
    });
  }

  onSortChange(): void {
    this.loadReports();
  }

  approve(report: QualityReport): void {
    const currentUser = this.authService.getCurrentUser();
    if (!currentUser) {
      return;
    }

    this.qualityDataService.approveQualityReport(report.id, currentUser.id).subscribe(() => {
      report.status = 'APPROVED';
      report.approvedAt = new Date().toISOString();
      report.approvedBy = {
        id: currentUser.id,
        firstName: currentUser.firstName,
        lastName: currentUser.lastName
      };
      this.messageService.add({ severity: 'success', summary: 'Report approved', detail: `${report.title} approved successfully.` });
    });
  }

  getStatusClass(status: string): string {
    const map: Record<string, string> = {
      DRAFT: 'badge-pending',
      REVIEW: 'badge-in-progress',
      APPROVED: 'badge-active'
    };
    return map[status] ?? 'badge-on-hold';
  }
}
