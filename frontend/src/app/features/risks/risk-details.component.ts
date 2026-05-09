import { Component, Inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { MessageService } from 'primeng/api';
import { ButtonModule } from 'primeng/button';
import { DropdownModule } from 'primeng/dropdown';
import { InputNumberModule } from 'primeng/inputnumber';
import { InputTextModule } from 'primeng/inputtext';
import { InputTextareaModule } from 'primeng/inputtextarea';
import { TooltipModule } from 'primeng/tooltip';
import { RiskService } from '../../core/services';
import { AuthService } from '../../core/services/auth.service';
import {
  CreateMitigationPlanRequest,
  MitigationEffectivenessEvaluationRequest,
  MitigationPlan,
  Risk,
  RiskCategory,
  RiskHistory,
  RiskImpact,
  RiskProbability,
  RiskStatus
} from '../../core/models/risk.model';

@Component({
  selector: 'app-risk-details',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    ButtonModule,
    DropdownModule,
    InputNumberModule,
    InputTextModule,
    InputTextareaModule,
    TooltipModule
  ],
  templateUrl: './risk-details.component.html',
  styleUrl: './risk-details.component.scss'
})
export class RiskDetailsComponent implements OnInit {
  risk: Risk | null = null;
  riskHistory: RiskHistory[] = [];
  loading = false;
  historyLoading = false;
  savingRisk = false;
  savingMitigation = false;
  evaluatingMitigation = false;

  riskForm: FormGroup;
  mitigationForm: FormGroup;
  effectivenessForm: FormGroup;

  probabilityOptions: { label: string; value: RiskProbability }[] = [];
  impactOptions: { label: string; value: RiskImpact }[] = [];
  riskStatusOptions: { label: string; value: RiskStatus }[] = [];
  riskCategoryOptions: { label: string; value: RiskCategory }[] = [];
  selectedMitigationId: number | null = null;

  chatOpen = false;
  chatbotLoading = false;
  chatbotQuestion = '';
  chatbotAnswer = '';

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private fb: FormBuilder,
    @Inject(RiskService) private riskService: RiskService,
    private messageService: MessageService,
    private authService: AuthService
  ) {
    this.riskForm = this.fb.group({
      title: ['', [Validators.required, Validators.minLength(3)]],
      description: ['', [Validators.required, Validators.minLength(8)]],
      probability: ['LOW', Validators.required],
      impact: ['MODERATE', Validators.required],
      status: ['IDENTIFIED', Validators.required],
      category: ['OPERATIONAL_RISK', Validators.required]
    });

    this.mitigationForm = this.fb.group({
      action: ['', [Validators.required, Validators.minLength(3)]],
      status: ['PLANNED', Validators.required],
      dueDate: ['', Validators.required],
      cost: [null, [Validators.min(0)]]
    });

    this.probabilityOptions = this.toEnumOptions<RiskProbability>(['LOW', 'MEDIUM', 'HIGH']);
    this.impactOptions = this.toEnumOptions<RiskImpact>(['NEGLIGIBLE', 'MINOR', 'MODERATE']);
    this.riskStatusOptions = this.toEnumOptions<RiskStatus>(['IDENTIFIED', 'ANALYZED', 'IN_PROGRESS', 'MITIGATED', 'ACCEPTED', 'CLOSED']);
    this.riskCategoryOptions = this.toEnumOptions<RiskCategory>([
      'OPERATIONAL_RISK',
      'FINANCIAL_RISK',
      'TECHNICAL_RISK',
      'SECURITY_RISK',
      'COMPLIANCE_RISK',
      'STRATEGIC_RISK',
      'PROJECT_RISK',
      'ENVIRONMENTAL_RISK',
      'LEGAL_RISK',
      'REPUTATIONAL_RISK'
    ]);

    this.effectivenessForm = this.fb.group({
      finalProbability: ['MEDIUM', Validators.required],
      finalImpact: ['MINOR', Validators.required],
      note: ['']
    });
  }

  ngOnInit(): void {
    this.authService.currentUser$.subscribe(user => {
      this.currentUser = user;
    });
    this.route.paramMap.subscribe(params => {
      const idRaw = params.get('id');
      const id = Number(idRaw);
      if (!idRaw || Number.isNaN(id)) {
        this.router.navigate(['/risks']);
        return;
      }
      this.loadRiskDetails(id);
    });
  }

  backToList(): void {
    this.router.navigate(['/risks']);
  }

  loadRiskDetails(id: number): void {
    this.loading = true;
    this.riskService.getRiskDetails(id).subscribe({
      next: (risk: Risk) => {
        const normalizedRisk: Risk = {
          ...risk,
          mitigationPlans: risk.mitigationPlans ?? []
        };
        this.risk = normalizedRisk;
        this.selectedMitigationId = normalizedRisk.mitigationPlans?.[0]?.id ?? null;
        this.riskForm.patchValue({
          title: normalizedRisk.title,
          description: normalizedRisk.description,
          probability: normalizedRisk.probability,
          impact: normalizedRisk.impact,
          status: normalizedRisk.status,
          category: normalizedRisk.category
        });
        this.loadRiskHistory(normalizedRisk.id);
        this.loading = false;
      },
      error: () => {
        this.loading = false;
        this.messageService.add({
          severity: 'error',
          summary: 'Error',
          detail: 'Unable to load risk details.'
        });
      }
    });
  }

  evaluateSelectedMitigation(): void {
    if (!this.risk || !this.selectedMitigationId) return;
    if (this.effectivenessForm.invalid) {
      this.effectivenessForm.markAllAsTouched();
      return;
    }

    const payload: MitigationEffectivenessEvaluationRequest = {
      finalProbability: this.effectivenessForm.value.finalProbability,
      finalImpact: this.effectivenessForm.value.finalImpact,
      note: this.effectivenessForm.value.note?.trim() || undefined
    };

    this.evaluatingMitigation = true;
    this.riskService.evaluateMitigationEffectiveness(this.selectedMitigationId, payload).subscribe({
      next: () => {
        this.evaluatingMitigation = false;
        this.loadRiskDetails(this.risk!.id);
        this.messageService.add({
          severity: 'success',
          summary: 'Evaluation complete',
          detail: 'Mitigation effectiveness has been calculated and saved.'
        });
      },
      error: () => {
        this.evaluatingMitigation = false;
        this.messageService.add({
          severity: 'error',
          summary: 'Evaluation failed',
          detail: 'Unable to evaluate mitigation effectiveness.'
        });
      }
    });
  }

  get selectedMitigation(): MitigationPlan | null {
    if (!this.risk?.mitigationPlans?.length || !this.selectedMitigationId) return null;
    return this.risk.mitigationPlans.find(m => m.id === this.selectedMitigationId) ?? null;
  }
  currentUser: any;
  get isCustomerOrClient(): boolean {
  return ['CUSTOMER', 'CLIENT'].includes(this.currentUser?.role ?? '');
}

  get mitigationEffectivenessValue(): number | null {
    const initial = this.selectedMitigationInitialScore;
    const final = this.selectedMitigationFinalScore;
    if (initial !== null && final !== null && initial > 0) {
      return ((initial - final) / initial) * 100;
    }

    const mitigation = this.selectedMitigation;
    if (!mitigation) return null;

    const backendValue = Number(mitigation.effectivenessPercentage);
    return Number.isFinite(backendValue) ? backendValue : null;
  }

  get selectedMitigationInitialScore(): number | null {
    const mitigation = this.selectedMitigation;
    if (!mitigation) return null;

    const backendInitial = Number(mitigation.initialRiskScore);
    if (Number.isFinite(backendInitial) && backendInitial > 0) {
      return backendInitial;
    }

    const riskProbability = this.mapProbabilityToNumber(this.risk?.probability);
    const riskImpact = this.mapImpactToNumber(this.risk?.impact);
    if (riskProbability === null || riskImpact === null) {
      return null;
    }

    return riskProbability * riskImpact;
  }

  get selectedMitigationFinalScore(): number | null {
    const mitigation = this.selectedMitigation;
    if (!mitigation) return null;

    const backendFinal = Number(mitigation.finalRiskScore);
    if (Number.isFinite(backendFinal) && backendFinal > 0) {
      return backendFinal;
    }

    const finalProbability = this.mapProbabilityToNumber(this.effectivenessForm.value.finalProbability);
    const finalImpact = this.mapImpactToNumber(this.effectivenessForm.value.finalImpact);
    if (finalProbability === null || finalImpact === null) {
      return null;
    }

    return finalProbability * finalImpact;
  }

  get mitigationEffectivenessLabel(): string {
    const value = this.mitigationEffectivenessValue;
    if (value === null) {
      return 'Not evaluated';
    }

    return `${value.toFixed(2)}%`;
  }

  get mitigationStatusLabel(): string {
    const initial = this.selectedMitigationInitialScore;
    const final = this.selectedMitigationFinalScore;
    if (initial !== null && final !== null && Number.isFinite(initial) && Number.isFinite(final) && initial > 0) {
      return final < initial ? 'Effective' : 'Ineffective';
    }

    const mitigation = this.selectedMitigation;
    if (!mitigation) return '-';

    if (mitigation.effective === null || mitigation.effective === undefined) {
      return '-';
    }

    return mitigation.effective ? 'Effective' : 'Ineffective';
  }

  private mapProbabilityToNumber(value: unknown): number | null {
    const normalized = String(value ?? '').toUpperCase();
    if (normalized === 'LOW') return 1;
    if (normalized === 'MEDIUM') return 2;
    if (normalized === 'HIGH') return 3;
    return null;
  }

  private mapImpactToNumber(value: unknown): number | null {
    const normalized = String(value ?? '').toUpperCase();
    if (normalized === 'NEGLIGIBLE') return 1;
    if (normalized === 'MINOR') return 2;
    if (normalized === 'MODERATE') return 3;
    return null;
  }

  formatHistoryNote(note?: string | null): string {
    const value = String(note ?? '').trim();
    if (!value) return 'Risk update';

    return value
      .replace(/(mitigation)\s*#\d+/gi, '$1')
      .replace(/\s{2,}/g, ' ')
      .trim();
  }

  updateRisk(): void {
    if (!this.risk) return;
    if (this.riskForm.invalid) {
      this.riskForm.markAllAsTouched();
      return;
    }

    this.savingRisk = true;
    this.riskService.updateRisk(this.risk.id, this.riskForm.value).subscribe({
      next: (updated: Risk) => {
        this.risk = {
          ...updated,
          mitigationPlans: this.risk?.mitigationPlans ?? []
        };
        this.loadRiskHistory(updated.id);
        this.savingRisk = false;
        this.messageService.add({
          severity: 'success',
          summary: 'Updated',
          detail: 'Risk updated successfully.'
        });

        if (this.isCriticalRisk(this.risk)) {
          this.messageService.add({
            severity: 'warn',
            summary: 'Critical risk',
            detail: 'This risk is critical (HIGH probability and MODERATE impact).'
          });
        }
      },
      error: () => {
        this.savingRisk = false;
        this.messageService.add({
          severity: 'error',
          summary: 'Update failed',
          detail: 'Unable to update risk.'
        });
      }
    });
  }

  addMitigation(): void {
    if (!this.risk) return;
    if (this.mitigationForm.invalid) {
      this.mitigationForm.markAllAsTouched();
      return;
    }

    this.savingMitigation = true;
    const payload: CreateMitigationPlanRequest = this.mitigationForm.value;

    this.riskService.createMitigation(this.risk.id, payload).subscribe({
      next: () => {
        this.savingMitigation = false;
        this.mitigationForm.reset({
          action: '',
          status: 'PLANNED',
          dueDate: '',
          cost: null
        });
        this.riskService.getMitigationsByRiskId(this.risk!.id).subscribe({
          next: (plans: MitigationPlan[]) => {
            this.risk = {
              ...this.risk!,
              mitigationPlans: plans
            };
          }
        });
        this.messageService.add({
          severity: 'success',
          summary: 'Added',
          detail: 'Mitigation added successfully.'
        });
      },
      error: () => {
        this.savingMitigation = false;
        this.messageService.add({
          severity: 'error',
          summary: 'Add failed',
          detail: 'Unable to add mitigation.'
        });
      }
    });
  }

  toggleChat(): void {
    this.chatOpen = !this.chatOpen;
  }

  askChatbot(): void {
    if (!this.risk) return;
    const question = this.chatbotQuestion.trim();
    if (!question) {
      this.messageService.add({
        severity: 'warn',
        summary: 'Question required',
        detail: 'Please type a question.'
      });
      return;
    }

    if (!this.isMeaningfulChatQuestion(question)) {
      this.messageService.add({
        severity: 'warn',
        summary: 'Question unclear',
        detail: 'Your message does not look like a clear question. Please write a complete question.'
      });
      return;
    }

    this.chatbotLoading = true;
    this.chatbotAnswer = '';

    this.riskService.askChatbot(question, this.risk.title, this.risk.description).subscribe({
      next: (answer: string) => {
        this.chatbotAnswer = answer;
        this.chatbotLoading = false;
      },
      error: () => {
        this.chatbotLoading = false;
        this.messageService.add({
          severity: 'error',
          summary: 'Chatbot error',
          detail: 'Unable to get chatbot response.'
        });
      }
    });
  }

  isCriticalRisk(risk: Risk | null): boolean {
    if (!risk) return false;
    return String(risk.probability).toUpperCase() === 'HIGH'
      && String(risk.impact).toUpperCase() === 'MODERATE';
  }

  private loadRiskHistory(riskId: number): void {
    this.historyLoading = true;
    this.riskService.getRiskHistory(riskId).subscribe({
      next: (history) => {
        this.riskHistory = history ?? [];
        this.historyLoading = false;
      },
      error: () => {
        this.riskHistory = [];
        this.historyLoading = false;
      }
    });
  }

  private toEnumOptions<T extends string>(values: string[]): Array<{ label: string; value: T }> {
    return values.map(v => ({ label: v, value: v as T }));
  }

  private isMeaningfulChatQuestion(text: string): boolean {
    const normalized = String(text ?? '').trim();
    if (normalized.length < 4) return false;

    const letterOnly = normalized.replace(/[^a-zA-ZÀ-ÿ]/g, '');
    if (!letterOnly.length) return false;
    if (/^([a-zA-ZÀ-ÿ])\1{2,}$/i.test(letterOnly)) return false;

    const words = normalized.split(/\s+/).filter(Boolean);
    if (words.length >= 2) return true;

    return normalized.includes('?');
  }
}
