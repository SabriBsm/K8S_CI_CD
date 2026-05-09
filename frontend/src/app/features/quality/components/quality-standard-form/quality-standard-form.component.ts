import { Component, EventEmitter, Input, OnChanges, Output, SimpleChanges } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { MessageService } from 'primeng/api';
import { AuthService } from '../../../../core/services/auth.service';
import { QualityProjectRef, QualityStandard, QualityStandardRequest } from '../../models/quality.models';
import { QualityService } from '../../services/quality.service';

@Component({
  selector: 'app-quality-standard-form',
  templateUrl: './quality-standard-form.component.html',
  styleUrl: './quality-standard-form.component.scss'
})
export class QualityStandardFormComponent implements OnChanges {
  @Input() visible = false;
  @Input() standard: QualityStandard | null = null;
  @Input() projects: QualityProjectRef[] = [];
  @Output() visibleChange = new EventEmitter<boolean>();
  @Output() saved = new EventEmitter<QualityStandard>();

  form: FormGroup;
  loading = false;
  isEdit = false;

  readonly categories = [
    { label: 'Functional', value: 'FUNCTIONAL' },
    { label: 'Security', value: 'SECURITY' },
    { label: 'Performance', value: 'PERFORMANCE' },
    { label: 'Maintainability', value: 'MAINTAINABILITY' },
    { label: 'Usability', value: 'USABILITY' },
    { label: 'Reliability', value: 'RELIABILITY' },
    { label: 'Documentation', value: 'DOCUMENTATION' },
    { label: 'Process', value: 'PROCESS' }
  ];

  readonly sourceTypes = [
    { label: 'ISO', value: 'ISO' },
    { label: 'CMMI', value: 'CMMI' },
    { label: 'OWASP', value: 'OWASP' },
    { label: 'Internal', value: 'INTERNAL' },
    { label: 'Custom', value: 'CUSTOM' }
  ];

  readonly statuses = [
    { label: 'Active', value: true },
    { label: 'Inactive', value: false }
  ];

  constructor(
    private fb: FormBuilder,
    private qualityService: QualityService,
    private authService: AuthService,
    private messageService: MessageService
  ) {
    this.form = this.buildForm();
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['standard'] || changes['visible']) {
      this.isEdit = !!this.standard;
      this.form = this.buildForm();

      if (this.standard) {
        this.form.patchValue({
          code: this.standard.code,
          name: this.standard.name,
          description: this.standard.description ?? '',
          category: this.standard.category,
          sourceType: this.standard.sourceType,
          version: this.standard.version,
          active: this.standard.active,
          projectId: this.standard.project?.id ?? null
        });
      }
    }
  }

  onSubmit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const currentUser = this.authService.getCurrentUser();
    if (!currentUser) {
      this.messageService.add({ severity: 'error', summary: 'Authentication required', detail: 'Please sign in again to continue.' });
      return;
    }

    this.loading = true;
    const payload: QualityStandardRequest = {
      ...this.form.getRawValue(),
      createdByUserId: currentUser.id
    };

    const request$ = this.isEdit && this.standard
      ? this.qualityService.updateStandard(this.standard.id, payload)
      : this.qualityService.createStandard(payload);

    request$.subscribe({
      next: (savedStandard) => {
        this.loading = false;
        this.messageService.add({
          severity: 'success',
          summary: this.isEdit ? 'Standard updated' : 'Standard created',
          detail: `${savedStandard.name} saved successfully.`
        });
        this.saved.emit(savedStandard);
      },
      error: (error) => {
        this.loading = false;
        this.messageService.add({
          severity: 'error',
          summary: this.isEdit ? 'Update failed' : 'Creation failed',
          detail: error?.error?.message || 'Unable to save quality standard.'
        });
      }
    });
  }

  close(): void {
    if (!this.loading) {
      this.visibleChange.emit(false);
    }
  }

  isInvalid(field: string): boolean {
    const control = this.form.get(field);
    return !!(control?.invalid && control?.touched);
  }

  private buildForm(): FormGroup {
    return this.fb.group({
      code: ['', [Validators.required, Validators.maxLength(50)]],
      name: ['', [Validators.required, Validators.maxLength(150)]],
      description: ['', Validators.required],
      category: [null, Validators.required],
      sourceType: ['INTERNAL', Validators.required],
      version: ['', [Validators.required, Validators.maxLength(30)]],
      active: [true, Validators.required],
      projectId: [null, Validators.required]
    });
  }
}
