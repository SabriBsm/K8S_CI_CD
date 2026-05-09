import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { ConfirmationService, MessageService } from 'primeng/api';
import { AuthService } from '../../../../core/services/auth.service';
import {
  QualityAudit,
  QualityAuditRequest,
  QualityProjectRef,
  QualityStandard,
  StandardCriterion,
  StandardCriterionRequest
} from '../../models/quality.models';
import { QualityService } from '../../services/quality.service';
import { QualityDataService } from '../../services/quality-data.service';

@Component({
  selector: 'app-quality-standards-page',
  templateUrl: './quality-standards-page.component.html',
  styleUrl: './quality-standards-page.component.scss'
})
export class QualityStandardsPageComponent implements OnInit {
  loading = true;
  loadingAudits = true;
  projectsLoading = true;
  submitting = false;
  submittingCriterion = false;
  submittingAudit = false;
  standards: QualityStandard[] = [];
  criteria: StandardCriterion[] = [];
  audits: QualityAudit[] = [];
  projects: QualityProjectRef[] = [];
  selectedStandardId: number | null = null;
  selectedStandard: QualityStandard | null = null;
  showStandardDialog = false;
  showCriterionDialog = false;
  showAuditDialog = false;
  criterionForm: FormGroup;
  auditForm: FormGroup;

  readonly auditTypeOptions = [
    { label: 'Standard Compliance', value: 'STANDARD_COMPLIANCE' },
    { label: 'Internal', value: 'INTERNAL' },
    { label: 'External', value: 'EXTERNAL' }
  ];

  constructor(
    private fb: FormBuilder,
    private qualityDataService: QualityDataService,
    private qualityService: QualityService,
    private authService: AuthService,
    private confirmationService: ConfirmationService,
    private messageService: MessageService
  ) {
    this.criterionForm = this.fb.group({
      title: ['', [Validators.required, Validators.maxLength(150)]],
      description: [''],
      expectedValue: [''],
      weight: [10, [Validators.required, Validators.min(0.1)]],
      mandatory: [true, Validators.required],
      orderIndex: [1, [Validators.required, Validators.min(1)]]
    });

    this.auditForm = this.fb.group({
      title: ['', [Validators.required, Validators.maxLength(150)]],
      description: [''],
      auditType: ['STANDARD_COMPLIANCE', Validators.required],
      status: ['PLANNED', Validators.required],
      plannedDate: ['']
    });
  }

  ngOnInit(): void {
    this.loadProjects();
    this.loadStandards();
  }

  loadStandards(): void {
    this.loading = true;
    this.qualityService.getStandards().subscribe(items => {
      this.standards = items;
      this.selectedStandardId = this.resolveSelectedStandardId(items);
      this.selectedStandard = this.standards.find(item => item.id === this.selectedStandardId) ?? null;
      this.loadCriteria();
      this.loadAudits();
    }, () => {
      this.loading = false;
      this.loadingAudits = false;
      this.messageService.add({ severity: 'error', summary: 'Load failed', detail: 'Unable to load quality standards.' });
    });
  }

  loadCriteria(): void {
    if (!this.selectedStandardId) {
      this.criteria = [];
      this.loading = false;
      return;
    }

    this.qualityDataService.getStandardCriteria(this.selectedStandardId).subscribe(items => {
      this.criteria = items;
      this.loading = false;
    }, () => {
      this.loading = false;
      this.criteria = [];
      this.messageService.add({ severity: 'error', summary: 'Load failed', detail: 'Unable to load checklist criteria.' });
    });
  }

  onStandardChange(): void {
    this.selectedStandard = this.standards.find(item => item.id === this.selectedStandardId) ?? null;
    this.loadCriteria();
    this.loadAudits();
  }

  loadProjects(): void {
    this.projectsLoading = true;
    this.qualityService.getProjects().subscribe({
      next: (projects) => {
        this.projects = projects;
        this.projectsLoading = false;
      },
      error: () => {
        this.projectsLoading = false;
        this.messageService.add({ severity: 'error', summary: 'Load failed', detail: 'Unable to load projects.' });
      }
    });
  }

  openCreateDialog(): void {
    this.selectedStandard = null;
    this.showStandardDialog = true;
  }

  editStandard(standard: QualityStandard): void {
    this.selectedStandard = standard;
    this.showStandardDialog = true;
  }

  deleteStandard(standard: QualityStandard): void {
    this.confirmationService.confirm({
      message: `Delete quality standard <strong>${standard.name}</strong>? This cannot be undone.`,
      header: 'Confirm Delete',
      icon: 'pi pi-exclamation-triangle',
      acceptButtonStyleClass: 'p-button-danger p-button-sm',
      rejectButtonStyleClass: 'p-button-text p-button-sm',
      accept: () => {
        this.submitting = true;
        this.qualityService.deleteStandard(standard.id).subscribe({
          next: () => {
            this.submitting = false;
            this.messageService.add({ severity: 'success', summary: 'Standard deleted', detail: `${standard.name} removed successfully.` });
            if (this.selectedStandardId === standard.id) {
              this.selectedStandardId = null;
            }
            this.loadStandards();
          },
          error: (error) => {
            this.submitting = false;
            this.messageService.add({
              severity: 'error',
              summary: 'Delete failed',
              detail: error?.error?.message || 'Unable to delete quality standard.'
            });
          }
        });
      }
    });
  }

  onStandardSaved(standard: QualityStandard): void {
    this.showStandardDialog = false;
    this.selectedStandard = null;
    this.selectedStandardId = standard.id;
    this.loadStandards();
  }

  loadAudits(): void {
    if (!this.selectedStandardId) {
      this.audits = [];
      this.loadingAudits = false;
      return;
    }

    this.loadingAudits = true;
    this.qualityDataService.getQualityAuditsByStandard(this.selectedStandardId).subscribe(items => {
      this.audits = items;
      this.loadingAudits = false;
    }, () => {
      this.audits = [];
      this.loadingAudits = false;
      this.messageService.add({ severity: 'error', summary: 'Load failed', detail: 'Unable to load quality audits for this standard.' });
    });
  }

  openCreateCriterionDialog(): void {
    if (!this.selectedStandardId) {
      this.messageService.add({ severity: 'warn', summary: 'Select a standard', detail: 'Choose a quality standard before adding criteria.' });
      return;
    }

    this.criterionForm.reset({
      title: '',
      description: '',
      expectedValue: '',
      weight: 10,
      mandatory: true,
      orderIndex: this.criteria.length + 1
    });
    this.showCriterionDialog = true;
  }

  createCriterion(): void {
    if (!this.selectedStandardId) {
      return;
    }

    if (this.criterionForm.invalid) {
      this.criterionForm.markAllAsTouched();
      return;
    }

    this.submittingCriterion = true;
    const payload: StandardCriterionRequest = {
      title: this.criterionForm.value.title,
      description: this.criterionForm.value.description || undefined,
      expectedValue: this.criterionForm.value.expectedValue || undefined,
      weight: Number(this.criterionForm.value.weight),
      mandatory: !!this.criterionForm.value.mandatory,
      orderIndex: Number(this.criterionForm.value.orderIndex)
    };

    this.qualityDataService.createStandardCriterion(this.selectedStandardId, payload).subscribe({
      next: () => {
        this.submittingCriterion = false;
        this.showCriterionDialog = false;
        this.messageService.add({ severity: 'success', summary: 'Criterion created', detail: 'Criterion added to the selected standard.' });
        this.loadCriteria();
      },
      error: (error) => {
        this.submittingCriterion = false;
        this.messageService.add({
          severity: 'error',
          summary: 'Creation failed',
          detail: error?.error?.message || 'Unable to create criterion.'
        });
      }
    });
  }

  openCreateAuditDialog(): void {
    if (!this.selectedStandardId || !this.selectedStandard?.project?.id) {
      this.messageService.add({ severity: 'warn', summary: 'Select a standard', detail: 'Choose a quality standard with a valid project before creating an audit.' });
      return;
    }

    const today = new Date().toISOString().slice(0, 10);
    this.auditForm.reset({
      title: `${this.selectedStandard.code} Compliance Audit`,
      description: this.selectedStandard.name,
      auditType: 'STANDARD_COMPLIANCE',
      status: 'PLANNED',
      plannedDate: today
    });
    this.showAuditDialog = true;
  }

  createAudit(): void {
    if (!this.selectedStandardId || !this.selectedStandard?.project?.id) {
      return;
    }

    const currentUser = this.authService.getCurrentUser();
    if (!currentUser) {
      this.messageService.add({ severity: 'error', summary: 'Authentication required', detail: 'Please sign in again to create an audit.' });
      return;
    }

    if (this.auditForm.invalid) {
      this.auditForm.markAllAsTouched();
      return;
    }

    this.submittingAudit = true;
    const payload: QualityAuditRequest = {
      title: this.auditForm.value.title,
      description: this.auditForm.value.description || undefined,
      projectId: this.selectedStandard.project.id,
      qualityStandardId: this.selectedStandardId,
      auditType: this.auditForm.value.auditType,
      status: this.auditForm.value.status,
      plannedDate: this.auditForm.value.plannedDate || undefined,
      auditorUserId: currentUser.id,
      createdByUserId: currentUser.id
    };

    this.qualityDataService.createQualityAudit(payload).subscribe({
      next: () => {
        this.submittingAudit = false;
        this.showAuditDialog = false;
        this.messageService.add({
          severity: 'success',
          summary: 'Audit created',
          detail: 'Audit created and linked to the selected standard.'
        });
        this.loadAudits();
      },
      error: (error) => {
        this.submittingAudit = false;
        this.messageService.add({
          severity: 'error',
          summary: 'Creation failed',
          detail: error?.error?.message || 'Unable to create quality audit.'
        });
      }
    });
  }

  getAuditStatusClass(status: string): string {
    const map: Record<string, string> = {
      PLANNED: 'badge-pending',
      IN_PROGRESS: 'badge-in-progress',
      COMPLETED: 'badge-active',
      CLOSED: 'badge-closed'
    };
    return map[status] ?? 'badge-on-hold';
  }

  isCriterionFieldInvalid(field: string): boolean {
    const control = this.criterionForm.get(field);
    return !!(control?.invalid && control?.touched);
  }

  isAuditFieldInvalid(field: string): boolean {
    const control = this.auditForm.get(field);
    return !!(control?.invalid && control?.touched);
  }

  private resolveSelectedStandardId(items: QualityStandard[]): number | null {
    if (!items.length) {
      return null;
    }

    if (this.selectedStandardId && items.some(item => item.id === this.selectedStandardId)) {
      return this.selectedStandardId;
    }

    return items[0].id;
  }
}
