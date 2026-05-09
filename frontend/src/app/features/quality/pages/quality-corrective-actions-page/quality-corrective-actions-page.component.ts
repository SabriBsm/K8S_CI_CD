import { Component, OnInit } from '@angular/core';
import { MessageService } from 'primeng/api';
import { CorrectiveAction } from '../../models/quality.models';
import { QualityDataService, QualitySortDir } from '../../services/quality-data.service';

interface SortOption {
  label: string;
  value: string;
}

@Component({
  selector: 'app-quality-corrective-actions-page',
  templateUrl: './quality-corrective-actions-page.component.html',
  styleUrl: './quality-corrective-actions-page.component.scss'
})
export class QualityCorrectiveActionsPageComponent implements OnInit {
  loading = true;
  actions: CorrectiveAction[] = [];
  completionDialogVisible = false;
  selectedAction: CorrectiveAction | null = null;
  verificationComment = '';
  selectedSortBy = 'dueDate';
  selectedSortDir: QualitySortDir = 'asc';
  readonly sortByOptions: SortOption[] = [
    { label: 'Due Date', value: 'dueDate' },
    { label: 'Created Date', value: 'createdAt' },
    { label: 'Updated Date', value: 'updatedAt' },
    { label: 'ID', value: 'id' },
    { label: 'Title', value: 'title' },
    { label: 'Status', value: 'status' },
    { label: 'Priority', value: 'priority' },
    { label: 'Start Date', value: 'startDate' },
    { label: 'Completion Date', value: 'completionDate' }
  ];
  readonly sortDirOptions: SortOption[] = [
    { label: 'Ascending', value: 'asc' },
    { label: 'Descending', value: 'desc' }
  ];

  constructor(
    private qualityDataService: QualityDataService,
    private messageService: MessageService
  ) {}

  ngOnInit(): void {
    this.loadActions();
  }

  loadActions(): void {
    this.loading = true;
    this.qualityDataService.getCorrectiveActions(this.selectedSortBy, this.selectedSortDir).subscribe(items => {
      this.actions = items;
      this.loading = false;
    }, () => {
      this.loading = false;
    });
  }

  onSortChange(): void {
    this.loadActions();
  }

  openCompleteDialog(action: CorrectiveAction): void {
    this.selectedAction = action;
    this.verificationComment = action.verificationComment || '';
    this.completionDialogVisible = true;
  }

  completeAction(): void {
    if (!this.selectedAction) {
      return;
    }

    this.qualityDataService.completeCorrectiveAction(this.selectedAction.id, this.verificationComment).subscribe(() => {
      this.selectedAction!.status = 'COMPLETED';
      this.selectedAction!.verificationComment = this.verificationComment;
      this.selectedAction!.completionDate = new Date().toISOString();
      this.completionDialogVisible = false;
      this.messageService.add({ severity: 'success', summary: 'Action completed', detail: `${this.selectedAction!.title} marked as completed.` });
    });
  }

  getStatusClass(status: string): string {
    const map: Record<string, string> = {
      OPEN: 'badge-pending',
      PENDING: 'badge-pending',
      IN_PROGRESS: 'badge-in-progress',
      COMPLETED: 'badge-active'
    };
    return map[status] ?? 'badge-on-hold';
  }

  getPriorityClass(priority: string): string {
    const map: Record<string, string> = {
      LOW: 'priority-low',
      MEDIUM: 'priority-medium',
      HIGH: 'priority-high',
      CRITICAL: 'priority-critical'
    };
    return map[priority] ?? 'priority-medium';
  }
}
