import { Component, Inject, OnInit } from '@angular/core';
import { AbstractControl, FormBuilder, FormGroup, ValidationErrors, ValidatorFn, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { ConfirmationService, MessageService } from 'primeng/api';
import jsPDF from 'jspdf';
import { environment } from '../../../environments/environment';
import { RiskService } from '../../core/services';
import { AuthService } from '../../core/services/auth.service';
import { AuthUser, UserRole } from '../../core/models/auth.model';
import {
  AiMitigationDetectionRequest,
  AiMitigationDetectionResult,
  CreateMitigationPlanRequest,
  CreateRiskRequest,
  DashboardStats,
  MitigationITRule,
  MitigationPlan,
  MitigationPlanStatus,
  NotificationRule,
  ProjectOption,
  Risk,
  RiskAlertsSummary,
  RiskCategory,
  RiskImpact,
  RiskProbability,
  RiskStatus,
  UpdateMitigationPlanRequest,
  UpdateRiskRequest
} from '../../core/models/risk.model';

interface ITMitigationProfile {
  category: string;
  owner: string;
  priority: 'Critical' | 'High' | 'Medium';
  signal: string;
  reason: string;
  actions: string[];
}

@Component({
  selector: 'app-risks',
  templateUrl: './risks.component.html',
  styleUrl: './risks.component.scss'
})
export class RisksComponent implements OnInit {
  activeManagementTab: 'RISKS' | 'MITIGATIONS' | 'AUTOMATION' = 'RISKS';
  risks: Risk[] = [];
  loading = false;
  searchTerm = '';
  activeStatusFilter = 'ALL';
  dashboardStats: DashboardStats | null = null;
  first = 0;
  rows = 6;
  mitigationFirst = 0;
  mitigationRows = 5;

  showRiskDialog = false;
  showMitigationDialog = false;
  showAssignMitigationDialog = false;
  riskEditMode = false;
  mitigationEditMode = false;

  selectedRisk: Risk | null = null;
  selectedRiskForEdit: Risk | null = null;
  selectedMitigation: MitigationPlan | null = null;

  riskForm: FormGroup;
  mitigationForm: FormGroup;
  minMitigationDate = this.getTodayIsoDate();
  aiSuggestionLoading = false;
  showAiSuggestion = false;
  aiDescriptionSuggestion = '';
  aiStepsSuggestion: string[] = [];
  chatOpen = false;
  chatbotLoading = false;
  chatbotQuestion = '';
  chatbotAnswer = '';
  chatMessages: { sender: 'user' | 'bot'; text: string; time: string }[] = [];
  assigningMitigation = false;
  selectedUnassignedMitigationId: number | null = null;
  unassignedMitigations: MitigationPlan[] = [];
  unassignedMitigationOptions: { label: string; value: number }[] = [];
  projects: ProjectOption[] = [];
  projectOptions: { label: string; value: number | null }[] = [];
  projectLoading = false;

  probabilityOptions: { label: string; value: RiskProbability }[] = [];

  impactOptions: { label: string; value: RiskImpact }[] = [];

  riskStatusOptions: { label: string; value: RiskStatus }[] = [];
  riskCategoryOptions: { label: string; value: RiskCategory }[] = [];

  mitigationStatusOptions: { label: string; value: MitigationPlanStatus }[] = [];
  mitigationITRules: MitigationITRule[] = this.buildDefaultMitigationITRules();
  mitigationAiProfiles = new Map<number, ITMitigationProfile>();
  readonly appPublicUrl = String((environment as any).appPublicUrl ?? '').trim();
  readonly crisisChecklistFormUrl = String((environment as any).crisisChecklistFormUrl ?? '').trim();
  notificationRules: NotificationRule[] = [];
  alertsSummary: RiskAlertsSummary = {
    dueIn3Days: 0,
    dueIn1Day: 0,
    overdue: 0,
    criticalOpen: 0
  };
  savingAutomationRules = false;



  currentUser: AuthUser | null = null;
  currentRole: UserRole | null = null;

  constructor(
    private fb: FormBuilder,
    @Inject(RiskService) private riskService: RiskService,
    private router: Router,
    private messageService: MessageService,
    private confirmationService: ConfirmationService,
    private authService: AuthService
  ) {
    this.initializeEnumOptions();
    this.riskForm = this.buildRiskForm();
    this.mitigationForm = this.buildMitigationForm();
    this.authService.currentUser$.subscribe(user => {
      this.currentUser = user;
      this.currentRole = user?.role ?? null;
    });
  }

  // Helpers d'autorisation UI
  canAddRisk(): boolean {
    return this.currentRole === 'ADMIN'
      || this.currentRole === 'PROJECT_MANAGER'
      || this.currentRole === 'PROJECT_MEMBER';
  }
  canEditRisk(risk: Risk): boolean {
    if (this.currentRole === 'ADMIN' || this.currentRole === 'PROJECT_MANAGER') return true;
    if (this.currentRole === 'PROJECT_MEMBER' && this.isCurrentUserRiskOwner(risk)) return true;
    return false;
  }
  canDeleteRisk(risk: Risk): boolean {
    if (this.currentRole === 'ADMIN' || this.currentRole === 'PROJECT_MANAGER') return true;
    return this.currentRole === 'PROJECT_MEMBER' && this.isCurrentUserRiskOwner(risk);
  }
  canViewRisk(risk: Risk): boolean {
    // Tous les rôles peuvent voir
    return true;
  }

  ngOnInit(): void {
    this.loadRisks();
    this.loadProjects();
    this.loadDashboardStats();
    this.loadMitigationITRules();
    this.loadNotificationRules();
    this.loadRiskAlertsSummary();
  }

  loadRisks(): void {
    this.loading = true;
    this.riskService.getRisks().subscribe({
      next: (risks) => {
        this.risks = risks.map(r => this.normalizeRisk(r));
        if (!this.projects.length && !this.projectLoading) {
          this.loadProjects();
        }
        this.refreshEnumOptionsFromData();
        this.loading = false;
        this.ensureSelectionAfterReload();
        this.loadDashboardStats();
      },
      error: () => {
        this.risks = [];
        this.loading = false;
        this.messageService.add({
          severity: 'error',
          summary: 'Backend indisponible',
          detail: 'Impossible de charger les risques depuis Spring Boot/MySQL.'
        });
        this.ensureSelectionAfterReload();
        this.loadDashboardStats();
      }
    });
  }

  openNewRisk(): void {
    this.riskEditMode = false;
    this.selectedRiskForEdit = null;
    this.riskForm = this.buildRiskForm();
    this.loadProjects();
    this.resetAiSuggestion();
    this.showRiskDialog = true;
  }

  editRisk(risk: Risk): void {
    this.riskEditMode = true;
    this.selectedRiskForEdit = risk;
    this.riskForm = this.buildRiskForm();
    this.loadProjects();
    this.resetAiSuggestion();
    this.riskForm.patchValue({
      title: risk.title,
      description: risk.description,
      probability: risk.probability,
      impact: risk.impact,
      status: risk.status,
      category: risk.category,
      slaDueDate: this.formatDateForInput(risk.slaDueDate),
      projectId: risk.projectId ?? null
    });
    this.showRiskDialog = true;
  }

  saveRisk(): void {
    if (this.riskForm.invalid) {
      this.riskForm.markAllAsTouched();
      return;
    }

    const rawSlaDate = String(this.riskForm.get('slaDueDate')?.value ?? '').trim();
    this.setRiskSlaPastDateCreateError(!this.riskEditMode && this.isDateBeforeToday(rawSlaDate));
    if (!this.riskEditMode && this.riskForm.get('slaDueDate')?.errors?.['pastDateCreate']) {
      this.riskForm.get('slaDueDate')?.markAsTouched();
      this.messageService.add({
        severity: 'warn',
        summary: 'SLA invalide',
        detail: 'A la creation, la date SLA doit etre aujourd\'hui ou une date future.'
      });
      return;
    }

    // Vérification stricte du nom complet (owner)
    let ownerFullName = (this.currentUser?.firstName && this.currentUser?.lastName)
      ? `${this.currentUser.firstName} ${this.currentUser.lastName}`.trim()
      : '';
    if (!ownerFullName || ownerFullName.length < 3) {
      this.messageService.add({
        severity: 'error',
        summary: 'Echec de creation',
        detail: 'Le responsable du risque est obligatoire et doit contenir au moins 3 caractères.'
      });
      return;
    }

    const rawPayload = this.riskForm.value as CreateRiskRequest;
    const { owner, ...payloadWithoutOwner } = rawPayload;
    let payload: CreateRiskRequest = {
      ...payloadWithoutOwner,
      projectId: this.normalizeProjectId(rawPayload.projectId)
    };
    // Pour ADMIN/PROJECT_MANAGER/TEAM_MEMBER, ajouter owner (nom complet)
    if (this.currentRole === 'ADMIN'
      || this.currentRole === 'PROJECT_MANAGER'
      || this.currentRole === 'PROJECT_MEMBER') {
      payload = {
        ...payload,
        owner: ownerFullName
      };
    }

    if (this.riskEditMode && this.selectedRiskForEdit) {
      const updatePayload: UpdateRiskRequest = payload;
      const riskId = this.selectedRiskForEdit.id;
      this.riskService.updateRisk(riskId, updatePayload).subscribe({
        next: (updated) => this.applyRiskSaveSuccess(this.normalizeRisk(updated, this.selectedRiskForEdit?.mitigationPlans ?? []), true),
        error: (err) => this.messageService.add({
          severity: 'error',
          summary: 'Echec de mise a jour',
          detail: this.extractBackendErrorMessage(err, 'La modification a echoue cote backend.')
        })
      });
      return;
    }

    this.riskService.createRisk(payload).subscribe({
      next: (created) => this.applyRiskSaveSuccess(this.normalizeRisk(created), false),
      error: (err) => this.messageService.add({
        severity: 'error',
        summary: 'Echec de creation',
        detail: this.extractBackendErrorMessage(err, 'La creation a echoue cote backend.')
      })
    });
  }

  suggestRiskDescription(): void {
    const titleControl = this.riskForm.get('title');
    const title = String(titleControl?.value ?? '').trim();
    if (!title) {
      titleControl?.markAsTouched();
      this.messageService.add({ severity: 'warn', summary: 'Title required', detail: 'Write a risk title first to generate a suggestion.' });
      return;
    }

    if (!this.isMeaningfulRiskTitleForAi(title)) {
      this.setRiskTitleMeaninglessError(true);
      titleControl?.markAsTouched();
      this.showAiSuggestion = false;
      this.aiDescriptionSuggestion = '';
      this.aiStepsSuggestion = [];
      return;
    }

    this.setRiskTitleMeaninglessError(false);

    this.aiSuggestionLoading = true;
    this.showAiSuggestion = false;
    this.riskService.generateRiskDescription(title).subscribe({
      next: (description) => {
        this.aiDescriptionSuggestion = description;
        this.aiStepsSuggestion = [];
        this.showAiSuggestion = true;
        this.aiSuggestionLoading = false;
      },
      error: (err) => {
        this.aiSuggestionLoading = false;
        this.aiDescriptionSuggestion = '';
        this.aiStepsSuggestion = [];
        this.showAiSuggestion = false;

        if (err?.status === 500) {
          this.messageService.add({
            severity: 'warn',
            summary: 'Suggestion unavailable',
            detail: 'Unable to suggest a description for this title right now. Try a clearer risk title.'
          });
          return;
        }

        this.messageService.add({
          severity: 'error',
          summary: 'AI unavailable',
          detail: 'AI service is temporarily unavailable. Please try again later.'
        });
      }
    });
  }

  askRiskChatbot(): void {
    const question = this.chatbotQuestion.trim();
    const title = String(this.selectedRisk?.title ?? 'General Risk Discussion').trim();
    const description = this.buildChatbotContext(this.selectedRisk);

    if (!question) {
      this.messageService.add({ severity: 'warn', summary: 'Question required', detail: 'Write a question for the AI assistant.' });
      return;
    }

    if (!this.isMeaningfulChatQuestion(question)) {
      const now = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      this.chatMessages = [
        ...this.chatMessages,
        { sender: 'user', text: question, time: now },
        {
          sender: 'bot',
          text: 'Votre message ne ressemble pas a une question claire. Merci de poser une question complete (ex: "Quel plan de mitigation recommandez-vous ?").',
          time: now
        }
      ];
      this.chatbotQuestion = '';
      return;
    }

    const userMessage = {
      sender: 'user' as const,
      text: question,
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    this.chatMessages = [...this.chatMessages, userMessage];
    this.chatbotQuestion = '';
    this.chatbotLoading = true;
    this.chatbotAnswer = '';

    this.riskService.askChatbot(question, title, description).subscribe({
      next: (answer: string) => {
        this.chatbotAnswer = answer;
        this.chatMessages = [
          ...this.chatMessages,
          {
            sender: 'bot',
            text: answer,
            time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
          }
        ];
        this.chatbotLoading = false;
      },
      error: (err: unknown) => {
        this.chatbotLoading = false;
        this.chatMessages = [
          ...this.chatMessages,
          {
            sender: 'bot',
            text: 'Unable to answer now. Please try again in a moment.',
            time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
          }
        ];
        this.messageService.add({
          severity: 'error',
          summary: 'Chatbot error',
          detail: this.extractBackendErrorMessage(err, 'Unable to get AI chatbot response.')
        });
      }
    });
  }

  private buildChatbotContext(risk: Risk | null): string {
    if (!risk) {
      return 'No specific risk selected. Provide general risk management guidance.';
    }

    const mitigationSummary = (risk.mitigationPlans ?? [])
      .slice(0, 5)
      .map(plan => `- ${plan.action} [${plan.status}]`)
      .join('\n');

    return [
      risk.description || 'No description provided.',
      `Status: ${risk.status}`,
      `Probability: ${risk.probability}`,
      `Impact: ${risk.impact}`,
      `Mitigations count: ${risk.mitigationPlans?.length ?? 0}`,
      mitigationSummary ? `Mitigation plans:\n${mitigationSummary}` : 'No mitigation plans available.'
    ].join('\n');
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

  toggleChat(): void {
    this.chatOpen = !this.chatOpen;
    if (this.chatOpen) {
      this.chatMessages = [this.buildWelcomeMessage()];
      this.chatbotQuestion = '';
      this.chatbotAnswer = '';
      this.chatbotLoading = false;
    }
  }

  applyQuickPrompt(prompt: string): void {
    this.chatbotQuestion = prompt;
    this.askRiskChatbot();
  }

  private buildWelcomeMessage(): { sender: 'user' | 'bot'; text: string; time: string } {
    const greeting = this.selectedRisk?.title
      ? `Bonjour, je suis votre assistant Risk Manager. Je peux vous aider sur le risque "${this.selectedRisk.title}". Comment puis-je vous aider ?`
      : 'Bonjour, je suis votre assistant Risk Manager. Comment puis-je vous aider ?';

    return {
      sender: 'bot',
      text: greeting,
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };
  }

  applyAiSuggestion(): void {
    if (!this.aiDescriptionSuggestion) return;
    this.riskForm.patchValue({ description: this.aiDescriptionSuggestion });
    this.riskForm.get('description')?.markAsTouched();
    this.messageService.add({ severity: 'success', summary: 'Applied', detail: 'AI description applied to the form.' });
    this.showAiSuggestion = false;
  }

  dismissAiSuggestion(): void {
    this.showAiSuggestion = false;
  }

  deleteRisk(risk: Risk): void {
    this.confirmationService.confirm({
      key: 'risksDeleteConfirm',
      header: 'Delete Risk',
      message: `Delete risk <strong>${risk.title}</strong>? This action cannot be undone.`,
      icon: 'pi pi-exclamation-triangle',
      acceptButtonStyleClass: 'p-button-danger p-button-sm',
      accept: () => {
        this.riskService.deleteRisk(risk.id).subscribe({
          next: () => this.removeRiskLocally(risk),
          error: () => this.removeRiskLocally(risk)
        });
      }
    });
  }

  onSearch(event: Event): void {
    const value = (event.target as HTMLInputElement).value;
    this.searchTerm = value;
    this.first = 0;
  }

  setStatusFilter(status: string): void {
    this.activeStatusFilter = status;
    this.first = 0;
  }

  resetFilters(): void {
    this.searchTerm = '';
    this.activeStatusFilter = 'ALL';
    this.first = 0;
  }

  onRiskPageChange(event: { first?: number; rows?: number }): void {
    this.first = Number(event.first ?? 0);
    this.rows = Number(event.rows ?? this.rows);
  }

  switchManagementTab(tab: 'RISKS' | 'MITIGATIONS' | 'AUTOMATION'): void {
    this.activeManagementTab = tab;
  }

  get filteredRisks(): Risk[] {
    const search = this.searchTerm.trim().toLowerCase();

    return this.risks.filter((risk) => {
      const matchesStatus = this.activeStatusFilter === 'ALL'
        ? true
        : (risk.status || '').toUpperCase().includes(this.activeStatusFilter);

      if (!matchesStatus) return false;
      if (!search) return true;

      return [
        risk.title,
        risk.description,
        risk.category,
        risk.probability,
        risk.impact,
        risk.status,
        risk.slaDueDate
      ].some(value => String(value || '').toLowerCase().includes(search));
    });
  }

  get pagedRisks(): Risk[] {
    return this.filteredRisks.slice(this.first, this.first + this.rows);
  }

  get totalFilteredRisks(): number {
    return this.filteredRisks.length;
  }

  isFilterActive(status: string): boolean {
    return this.activeStatusFilter === status;
  }

  selectRisk(risk: Risk): void {
    this.selectedRisk = risk;
    this.mitigationFirst = 0;
    this.chatbotQuestion = '';
    this.chatbotAnswer = '';
    this.loadSelectedRiskDetails();
    this.loadMitigationsForSelectedRisk();
  }

  openRiskDetails(risk: Risk): void {
    this.router.navigate(['/risks', risk.id]);
  }

  openStatisticsPage(): void {
    this.router.navigate(['/risks/statistics']);
  }

  openNewMitigation(): void {
    if (!this.selectedRisk) {
      this.messageService.add({ severity: 'warn', summary: 'Select a risk', detail: 'Select a risk before adding a mitigation plan.' });
      return;
    }
    this.mitigationEditMode = false;
    this.selectedMitigation = null;
    this.mitigationForm = this.buildMitigationForm();
    this.showMitigationDialog = true;
  }

  openAssignMitigationDialog(): void {
    if (!this.selectedRisk) {
      this.messageService.add({ severity: 'warn', summary: 'Select a risk', detail: 'Select a risk before linking a mitigation plan.' });
      return;
    }

    this.selectedUnassignedMitigationId = null;
    this.unassignedMitigations = [];
    this.unassignedMitigationOptions = [];
    this.showAssignMitigationDialog = true;
    this.loadUnassignedMitigations();
  }

  assignSelectedMitigationToRisk(): void {
    if (!this.selectedRisk || !this.selectedUnassignedMitigationId) {
      this.messageService.add({ severity: 'warn', summary: 'Selection required', detail: 'Select a mitigation plan to link.' });
      return;
    }

    this.assigningMitigation = true;
    this.riskService.assignMitigationToRisk(this.selectedUnassignedMitigationId, this.selectedRisk.id).subscribe({
      next: () => {
        this.assigningMitigation = false;
        this.showAssignMitigationDialog = false;
        this.selectedUnassignedMitigationId = null;
        this.loadMitigationsForSelectedRisk();
        this.loadDashboardStats();
        this.messageService.add({ severity: 'success', summary: 'Linked', detail: 'Mitigation plan linked to selected risk.' });
      },
      error: (err) => {
        this.assigningMitigation = false;
        this.messageService.add({
          severity: 'error',
          summary: 'Link failed',
          detail: this.extractBackendErrorMessage(err, 'Unable to link mitigation plan to selected risk.')
        });
      }
    });
  }

  editMitigation(mitigation: MitigationPlan): void {
    this.mitigationEditMode = true;
    this.selectedMitigation = mitigation;
    this.mitigationForm = this.buildMitigationForm();
    this.mitigationForm.patchValue({
      action: mitigation.action,
      status: mitigation.status,
      dueDate: this.formatDateForInput(mitigation.dueDate),
      cost: mitigation.cost ?? null
    });
    this.showMitigationDialog = true;
  }

  // risks.component.ts - Modifiez saveMitigation()
saveMitigation(): void {
  if (!this.selectedRisk) {
    this.messageService.add({ severity: 'warn', summary: 'No risk selected', detail: 'Please select a risk first.' });
    return;
  }
  if (this.mitigationForm.invalid) {
    this.mitigationForm.markAllAsTouched();
    return;
  }

  // Ne pas inclure riskId ici, il sera ajouté dans le service
  const normalizedCost = this.normalizeMitigationCost(this.mitigationForm.value.cost);
  const payload: CreateMitigationPlanRequest = {
    action: this.mitigationForm.value.action,
    status: this.mitigationForm.value.status,
    dueDate: this.mitigationForm.value.dueDate,
    cost: normalizedCost
  };

  const selectedRiskId = this.selectedRisk.id;

  if (this.mitigationEditMode && this.selectedMitigation) {
    const updatePayload: UpdateMitigationPlanRequest = payload;
    this.riskService.updateMitigation(selectedRiskId, this.selectedMitigation.id, updatePayload).subscribe({
      next: (updated) => this.applyMitigationSaveSuccess(this.normalizeMitigation(updated), true),
      error: (err) => {
        console.error('Erreur update mitigation:', err);
        this.messageService.add({
          severity: 'error',
          summary: 'Echec de mise a jour',
          detail: this.extractBackendErrorMessage(err, 'La mise a jour du plan de mitigation a echoue cote backend.')
        });
      }
    });
    return;
  }

  this.riskService.createMitigation(selectedRiskId, payload).subscribe({
    next: (created) => this.applyMitigationSaveSuccess(this.normalizeMitigation(created), false),
    error: (err) => {
      console.error('Erreur create mitigation:', err);
      this.messageService.add({
        severity: 'error',
        summary: 'Echec de creation',
        detail: this.extractBackendErrorMessage(err, 'La creation du plan de mitigation a echoue cote backend.')
      });
    }
  });
}
  deleteMitigation(mitigation: MitigationPlan): void {
    if (!this.selectedRisk) return;

    this.confirmationService.confirm({
      key: 'risksDeleteConfirm',
      header: 'Delete Mitigation Plan',
      message: `Delete mitigation plan <strong>${mitigation.action}</strong>?`,
      icon: 'pi pi-exclamation-triangle',
      acceptButtonStyleClass: 'p-button-danger p-button-sm',
      accept: () => {
        this.riskService.deleteMitigation(this.selectedRisk!.id, mitigation.id).subscribe({
          next: () => this.removeMitigationLocally(mitigation),
          error: () => this.removeMitigationLocally(mitigation)
        });
      }
    });
  }

  unassignMitigation(mitigation: MitigationPlan): void {
    this.confirmationService.confirm({
      key: 'risksDeleteConfirm',
      header: 'Unlink Mitigation Plan',
      message: `Unlink mitigation plan <strong>${mitigation.action}</strong> from selected risk?`,
      icon: 'pi pi-exclamation-triangle',
      acceptButtonStyleClass: 'p-button-warning p-button-sm',
      accept: () => {
        this.riskService.unassignMitigationFromRisk(mitigation.id).subscribe({
          next: () => {
            this.removeMitigationLocally(mitigation);
            this.messageService.add({ severity: 'success', summary: 'Unlinked', detail: 'Mitigation plan unlinked successfully.' });
          },
          error: (err) => {
            this.messageService.add({
              severity: 'error',
              summary: 'Unlink failed',
              detail: this.extractBackendErrorMessage(err, 'Unable to unlink mitigation plan.')
            });
          }
        });
      }
    });
  }

  downloadSelectedRiskPdf(): void {
    if (!this.selectedRisk) {
      this.messageService.add({ severity: 'warn', summary: 'No risk selected', detail: 'Select a risk before exporting PDF.' });
      return;
    }

    const risk = this.selectedRisk;
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const marginX = 14;
    const contentWidth = pageWidth - marginX * 2;

    const ensureSpace = (required: number, currentY: number): number => {
      if (currentY + required < pageHeight - 14) return currentY;
      doc.addPage();
      return 20;
    };

    const drawLabelValue = (label: string, value: string, x: number, y: number): void => {
      doc.setFontSize(9);
      doc.setTextColor(100);
      doc.text(label, x, y);
      doc.setFontSize(11);
      doc.setTextColor(20);
      doc.text(value || '-', x, y + 5);
    };

    doc.setFillColor(16, 63, 146);
    doc.roundedRect(marginX, 12, contentWidth, 24, 3, 3, 'F');

    doc.setFontSize(18);
    doc.setTextColor(255);
    doc.text('Risk Report', marginX + 4, 22);

    doc.setFontSize(10);
    doc.text('PlanSync Risk Management', marginX + 4, 29);
    doc.text(new Date().toLocaleString(), pageWidth - marginX - 4, 29, { align: 'right' });

    let y = 46;

    doc.setFontSize(13);
    doc.setTextColor(28, 34, 45);
    doc.text('Risk Overview', marginX, y);
    y += 6;

    doc.setDrawColor(225);
    doc.setFillColor(248, 250, 252);
    doc.roundedRect(marginX, y, contentWidth, 46, 3, 3, 'FD');

    drawLabelValue('Title', risk.title, marginX + 4, y + 8);
    drawLabelValue('Status', risk.status, marginX + 4, y + 20);
    drawLabelValue('Probability', risk.probability, marginX + contentWidth / 2, y + 8);
    drawLabelValue('Impact', risk.impact, marginX + contentWidth / 2, y + 20);

    y += 54;

    doc.setFontSize(13);
    doc.setTextColor(28, 34, 45);
    doc.text('Description', marginX, y);
    y += 6;

    const descLines = doc.splitTextToSize(risk.description || '-', contentWidth - 8);
    const descHeight = Math.max(20, descLines.length * 6 + 8);
    doc.setFillColor(252, 252, 252);
    doc.roundedRect(marginX, y, contentWidth, descHeight, 3, 3, 'FD');
    doc.setFontSize(10);
    doc.setTextColor(40);
    doc.text(descLines, marginX + 4, y + 7);

    y += descHeight + 10;

    doc.setFontSize(13);
    doc.setTextColor(28, 34, 45);
    doc.text('Mitigation Plans', marginX, y);
    y += 6;

    const mitigationPlans = risk.mitigationPlans ?? [];
    if (!mitigationPlans.length) {
      doc.setFillColor(250, 250, 250);
      doc.roundedRect(marginX, y, contentWidth, 16, 3, 3, 'FD');
      doc.setFontSize(10);
      doc.setTextColor(90);
      doc.text('No mitigation plans available for this risk.', marginX + 4, y + 10);
    } else {
      mitigationPlans.forEach((plan, index) => {
        y = ensureSpace(30, y);
        doc.setDrawColor(226, 232, 240);
        doc.setFillColor(255, 255, 255);
        doc.roundedRect(marginX, y, contentWidth, 26, 3, 3, 'FD');

        doc.setFontSize(11);
        doc.setTextColor(17, 24, 39);
        doc.text(`${index + 1}. ${plan.action || '-'}`, marginX + 4, y + 7);

        doc.setFontSize(9);
        doc.setTextColor(90);
        doc.text(`Status: ${plan.status || '-'}`, marginX + 4, y + 14);
        doc.text(`Due Date: ${plan.dueDate || '-'}`, marginX + 64, y + 14);
        doc.text(`Cost: ${plan.cost !== undefined && plan.cost !== null ? plan.cost : '-'}`, marginX + 124, y + 14);

        y += 30;
      });
    }

    const safeTitle = (risk.title || 'risk').replace(/[^a-z0-9_-]+/gi, '_').toLowerCase();
    doc.save(`risk_report_${safeTitle}.pdf`);
  }

  getSelectedRiskMitigations(): MitigationPlan[] {
    return this.selectedRisk?.mitigationPlans ?? [];
  }

  get selectedRiskMitigationCount(): number {
    return this.getSelectedRiskMitigations().length;
  }

  get pagedSelectedRiskMitigations(): MitigationPlan[] {
    return this.getSelectedRiskMitigations().slice(this.mitigationFirst, this.mitigationFirst + this.mitigationRows);
  }

  onMitigationPageChange(event: { first?: number; rows?: number }): void {
    this.mitigationFirst = Number(event.first ?? 0);
    this.mitigationRows = Number(event.rows ?? this.mitigationRows);
  }

  get totalRisks(): number {
    return this.dashboardStats?.totalRisks ?? this.risks.length;
  }

  get openRisks(): number {
    return this.countStatsByStatusFragment('OPEN') ?? this.countByRiskStatus('OPEN');
  }

  get inProgressRisks(): number {
    return this.countStatsByStatusFragment('PROGRESS') ?? this.countByRiskStatus('PROGRESS');
  }

  get mitigatedRisks(): number {
    return this.countStatsByStatusFragment('MITIGAT') ?? this.countByRiskStatus('MITIGAT');
  }

  get totalMitigationPlans(): number {
    return this.dashboardStats?.totalMitigations ?? this.risks.reduce((acc, risk) => acc + (risk.mitigationPlans?.length ?? 0), 0);
  }

  get overdueMitigations(): number {
    return Number(this.dashboardStats?.overdueMitigations ?? 0);
  }

  get averageMitigationCost(): number {
    return Number(this.dashboardStats?.averageMitigationCost ?? 0);
  }

  getRiskStatusClass(status: RiskStatus): string {
    const value = (status || '').toUpperCase();
    if (value.includes('OPEN')) return 'st-open';
    if (value.includes('PROGRESS')) return 'st-progress';
    if (value.includes('MITIGAT')) return 'st-mitigated';
    if (value.includes('CLOSED')) return 'st-closed';
    return 'st-open';
  }

  getMitigationStatusClass(status: MitigationPlanStatus): string {
    const value = (status || '').toUpperCase();
    if (value.includes('PLAN')) return 'mit-planned';
    if (value.includes('PROGRESS')) return 'mit-progress';
    if (value.includes('COMPLETE') || value.includes('DONE')) return 'mit-completed';
    if (value.includes('CANCEL')) return 'mit-cancelled';
    return 'mit-planned';
  }

  isRiskSlaOverdue(risk: Risk): boolean {
    if (!risk.slaDueDate) return false;
    const due = new Date(risk.slaDueDate);
    if (Number.isNaN(due.getTime())) return false;
    const endOfDay = new Date(due);
    endOfDay.setHours(23, 59, 59, 999);
    return endOfDay.getTime() < Date.now() && !this.isRiskClosedLike(risk.status);
  }

  isRiskSlaDueSoon(risk: Risk): boolean {
    if (!risk.slaDueDate || this.isRiskSlaOverdue(risk) || this.isRiskClosedLike(risk.status)) return false;
    const due = new Date(risk.slaDueDate);
    if (Number.isNaN(due.getTime())) return false;
    const daysLeft = (due.getTime() - Date.now()) / (1000 * 60 * 60 * 24);
    return daysLeft <= 7;
  }

  isMitigationOverdue(dueDate?: string): boolean {
    if (!dueDate) return false;
    const due = new Date(dueDate);
    if (Number.isNaN(due.getTime())) return false;

    const endOfDay = new Date(due);
    endOfDay.setHours(23, 59, 59, 999);
    return endOfDay.getTime() < Date.now();
  }

  isMitigationDueSoon(dueDate?: string): boolean {
    if (!dueDate || this.isMitigationOverdue(dueDate)) return false;
    const due = new Date(dueDate);
    if (Number.isNaN(due.getTime())) return false;

    const daysLeft = (due.getTime() - Date.now()) / (1000 * 60 * 60 * 24);
    return daysLeft <= 7;
  }

  getMitigationITProfile(mitigation: MitigationPlan): ITMitigationProfile {
    const aiProfile = this.mitigationAiProfiles.get(mitigation.id);
    if (aiProfile) {
      return aiProfile;
    }

    const actionCorpus = String(mitigation.action ?? '').toLowerCase();
    const riskCorpus = `${this.selectedRisk?.title ?? ''} ${this.selectedRisk?.description ?? ''}`.toLowerCase();

    let profile: ITMitigationProfile = this.buildHeuristicITProfile(mitigation);
    const rankedRules = this.mitigationITRules
      .map(rule => ({
        rule,
        actionHits: this.countKeywordHits(actionCorpus, rule.keywords ?? []),
        contextHits: this.countKeywordHits(riskCorpus, rule.keywords ?? [])
      }))
      .map(item => ({
        ...item,
        score: (item.actionHits * 5) + (item.contextHits * 2)
      }))
      .sort((a, b) => b.score - a.score);

    const bestRule = rankedRules[0];
    if (bestRule && bestRule.score > 0) {
      const matchedKeyword = this.findKeyword(actionCorpus, bestRule.rule.keywords ?? [])
        ?? this.findKeyword(riskCorpus, bestRule.rule.keywords ?? []);

      profile = {
        category: bestRule.rule.category || profile.category,
        owner: bestRule.rule.owner || profile.owner,
        priority: this.normalizePriorityLabel(bestRule.rule.priority),
        signal: matchedKeyword || bestRule.rule.signal || profile.signal,
        reason: bestRule.actionHits > 0
          ? `Matched mitigation action keyword "${matchedKeyword ?? bestRule.rule.signal}".`
          : `Matched risk context keyword "${matchedKeyword ?? bestRule.rule.signal}".`,
        actions: bestRule.rule.actions?.length ? bestRule.rule.actions : profile.actions
      };
    }

    const priorityDecision = this.computeMitigationPriority(mitigation, profile.priority);
    profile.priority = priorityDecision.priority;
    profile.reason = `${priorityDecision.reason} ${profile.reason}`.trim();

    profile.actions = this.buildMitigationSpecificActions(mitigation, profile.actions);

    return profile;
  }

  private loadMitigationAiProfiles(mitigations: MitigationPlan[]): void {
    if (!mitigations.length) {
      this.mitigationAiProfiles.clear();
      return;
    }

    const payload: AiMitigationDetectionRequest = {
      riskTitle: this.selectedRisk?.title,
      riskDescription: this.selectedRisk?.description,
      riskStatus: this.selectedRisk?.status,
      riskProbability: this.selectedRisk?.probability,
      riskImpact: this.selectedRisk?.impact,
      mitigations: mitigations.map((m) => ({
        mitigationId: m.id,
        action: m.action,
        status: String(m.status),
        dueDate: m.dueDate
      }))
    };

    this.riskService.detectMitigationProfilesWithAi(payload).subscribe({
      next: (results) => {
        this.mitigationAiProfiles.clear();
        (results ?? []).forEach((result: AiMitigationDetectionResult) => {
          const mitigationId = Number(result?.mitigationId);
          if (!Number.isFinite(mitigationId)) return;

          this.mitigationAiProfiles.set(mitigationId, {
            category: String(result?.category ?? 'General IT Operations'),
            owner: String(result?.owner ?? 'IT Support / System Administrator'),
            priority: this.normalizePriorityLabel(String(result?.priority ?? 'Medium')),
            signal: String(result?.signal ?? 'heuristic'),
            reason: String(result?.reason ?? 'AI-based mitigation analysis'),
            actions: Array.isArray(result?.actions) && result.actions.length
              ? result.actions.map(action => String(action)).filter(Boolean).slice(0, 5)
              : ['Validate mitigation scope', 'Assign owner', 'Track completion']
          });
        });
      },
      error: () => {
        this.mitigationAiProfiles.clear();
      }
    });
  }


  getITPriorityClass(priority: ITMitigationProfile['priority']): string {
    const normalized = String(priority ?? '').toLowerCase();
    if (normalized === 'critical') return 'prio-critical';
    if (normalized === 'high') return 'prio-high';
    return 'prio-medium';
  }

  getMitigationQrCodeUrl(mitigation: MitigationPlan): string {
    const checklistUrl = this.getMitigationChecklistUrl(mitigation);
    if (!checklistUrl) return '';
    const absoluteChecklistUrl = this.toAbsoluteUrl(checklistUrl);
    const encoded = encodeURIComponent(absoluteChecklistUrl);
    return `https://api.qrserver.com/v1/create-qr-code/?size=140x140&margin=2&data=${encoded}`;
  }
  get isCustomerOrClient(): boolean {
  return ['CUSTOMER', 'CLIENT'].includes(this.currentUser?.role ?? '');
}

  private isCurrentUserRiskOwner(risk: Risk): boolean {
    if (!this.currentUser || !risk) {
      return false;
    }

    const currentId = this.currentUser.id != null ? String(this.currentUser.id) : '';
    const createdById = risk.createdById != null ? String(risk.createdById) : '';
    if (currentId && createdById && currentId === createdById) {
      return true;
    }

    const email = (this.currentUser.email || '').trim().toLowerCase();
    const createdByUsername = String(risk.createdByUsername || '').trim().toLowerCase();
    const owner = String(risk.owner || '').trim().toLowerCase();
    return (!!email && !!createdByUsername && email === createdByUsername)
      || (!!email && !!owner && email === owner);
  }

 getMitigationChecklistUrl(mitigation: MitigationPlan): string {
  const riskTitle = this.selectedRisk?.title ?? 'Unknown Risk';
  const params = {
    riskTitle: riskTitle,
    mitigationAction: mitigation.action,
    mitigationStatus: String(mitigation.status),
    priority: this.getMitigationITProfile(mitigation).priority,
    dueDate: mitigation.dueDate ?? ''
  };
  const query = new URLSearchParams(params).toString();
  const base = this.appPublicUrl || window.location.origin;
  return `${base}/public/checklist/${mitigation.id}?${query}`;
}

  private toAbsoluteUrl(url: string): string {
  if (/^https?:\/\//i.test(url)) return url;
  return `${window.location.origin}${url.startsWith('/') ? '' : '/'}${url}`;
}

  private loadMitigationITRules(): void {
    this.riskService.getMitigationITRules().subscribe({
      next: (rules) => {
        if (Array.isArray(rules) && rules.length) {
          this.mitigationITRules = rules;
        }
      },
      error: () => {
        this.mitigationITRules = this.buildDefaultMitigationITRules();
      }
    });
  }

  private loadNotificationRules(): void {
    this.riskService.getNotificationRules().subscribe({
      next: (rules) => {
        this.notificationRules = Array.isArray(rules) ? rules : [];
      },
      error: () => {
        this.notificationRules = [
          { key: 'DUE_IN_3', label: 'Reminder J-3', enabled: true, daysBefore: 3, severity: 'MEDIUM', escalate: false, channels: ['EMAIL'] },
          { key: 'DUE_IN_1', label: 'Reminder J-1', enabled: true, daysBefore: 1, severity: 'HIGH', escalate: true, channels: ['EMAIL'] },
          { key: 'OVERDUE', label: 'Overdue alert', enabled: true, daysBefore: 0, severity: 'HIGH', escalate: true, channels: ['EMAIL'] },
          { key: 'CRITICAL', label: 'Critical risk alert', enabled: true, daysBefore: 0, severity: 'CRITICAL', escalate: true, channels: ['EMAIL'] }
        ];
      }
    });
  }

  private loadRiskAlertsSummary(): void {
    this.riskService.getRiskAlertsSummary().subscribe({
      next: (summary) => {
        this.alertsSummary = {
          dueIn3Days: Number(summary?.dueIn3Days ?? 0),
          dueIn1Day: Number(summary?.dueIn1Day ?? 0),
          overdue: Number(summary?.overdue ?? 0),
          criticalOpen: Number(summary?.criticalOpen ?? 0)
        };
      },
      error: () => {
        this.alertsSummary = { dueIn3Days: 0, dueIn1Day: 0, overdue: 0, criticalOpen: 0 };
      }
    });
  }

  saveAutomationRules(): void {
    if (!this.notificationRules.length) {
      this.messageService.add({ severity: 'warn', summary: 'No rules', detail: 'No automation rules to save.' });
      return;
    }

    const sanitized = this.notificationRules.map(rule => ({
      ...rule,
      key: String(rule.key ?? '').trim(),
      label: String(rule.label ?? '').trim(),
      daysBefore: Math.max(0, Number(rule.daysBefore ?? 0)),
      severity: String(rule.severity ?? 'MEDIUM').toUpperCase(),
      channels: (rule.channels ?? ['EMAIL']).length ? rule.channels : ['EMAIL']
    }));

    this.savingAutomationRules = true;
    this.riskService.saveNotificationRules(sanitized).subscribe({
      next: (saved) => {
        this.notificationRules = Array.isArray(saved) ? saved : sanitized;
        this.savingAutomationRules = false;
        this.messageService.add({ severity: 'success', summary: 'Saved', detail: 'Automation rules updated successfully.' });
      },
      error: (err) => {
        this.savingAutomationRules = false;
        this.messageService.add({
          severity: 'error',
          summary: 'Save failed',
          detail: this.extractBackendErrorMessage(err, 'Unable to save automation rules.')
        });
      }
    });
  }

  toggleRuleChannel(rule: NotificationRule, channel: string, enabled: boolean): void {
    const current = new Set((rule.channels ?? []).map(c => String(c).toUpperCase()));
    const normalized = String(channel).toUpperCase();
    if (enabled) current.add(normalized);
    else current.delete(normalized);
    rule.channels = Array.from(current);
  }

  hasRuleChannel(rule: NotificationRule, channel: string): boolean {
    const normalized = String(channel).toUpperCase();
    return (rule.channels ?? []).map(c => String(c).toUpperCase()).includes(normalized);
  }

  private buildDefaultITProfile(): ITMitigationProfile {
    return {
      category: 'General IT Operations',
      owner: 'IT Support / System Administrator',
      priority: 'Medium',
      signal: 'standard-ops',
      reason: 'Default operational priority based on current mitigation data.',
      actions: [
        'Validate service health checks',
        'Document intervention in incident log',
        'Confirm post-change system stability'
      ]
    };
  }

  private normalizePriorityLabel(priority: string | undefined): ITMitigationProfile['priority'] {
    const normalized = String(priority ?? '').trim().toLowerCase();
    if (normalized === 'critical') return 'Critical';
    if (normalized === 'high') return 'High';
    return 'Medium';
  }

  private buildDefaultMitigationITRules(): MitigationITRule[] {
    return [
      {
        category: 'Server Availability',
        owner: 'IT Support / System Administrator',
        priority: 'High',
        signal: 'server',
        keywords: ['server', 'down', 'outage', 'restart', 'availability', 'service'],
        actions: [
          'Restart impacted service/server and validate uptime',
          'Review system logs to identify root cause',
          'Apply failover or escalation if instability continues'
        ]
      },
      {
        category: 'Backup & Recovery',
        owner: 'IT Support / System Administrator',
        priority: 'High',
        signal: 'backup',
        keywords: ['backup', 'restore', 'recovery', 'snapshot', 'rollback', 'data loss'],
        actions: [
          'Restore from latest valid backup',
          'Verify data integrity after restore',
          'Schedule backup reliability test and report'
        ]
      },
      {
        category: 'Security Hardening',
        owner: 'IT Support + Security Team',
        priority: 'High',
        signal: 'security',
        keywords: ['vulnerability', 'patch', 'breach', 'ransomware', 'malware', 'security'],
        actions: [
          'Isolate impacted assets and collect evidence logs',
          'Apply patch or security control immediately',
          'Run post-remediation vulnerability verification'
        ]
      },
      {
        category: 'Network Stability',
        owner: 'System Administrator / Network Ops',
        priority: 'Medium',
        signal: 'network',
        keywords: ['network', 'dns', 'latency', 'connectivity', 'firewall', 'bandwidth'],
        actions: [
          'Validate DNS, routing, and connectivity paths',
          'Inspect firewall and access rules',
          'Monitor packet loss/latency after correction'
        ]
      },
      {
        category: 'Monitoring & Incident Response',
        owner: 'IT Support / NOC',
        priority: 'Medium',
        signal: 'monitor',
        keywords: ['monitor', 'alert', 'log', 'observability', 'metric', 'incident'],
        actions: [
          'Confirm alert source and impact scope',
          'Correlate logs/metrics to isolate failure point',
          'Create follow-up prevention task with SLA'
        ]
      }
    ];
  }

  private buildMitigationSpecificActions(mitigation: MitigationPlan, baseActions: string[]): string[] {
    const actionLabel = String(mitigation.action ?? '').trim();
    const status = String(mitigation.status ?? '').toUpperCase();
    const dynamicActions: string[] = [];

    if (actionLabel) {
      dynamicActions.push(`Execute and verify mitigation scope: ${actionLabel}`);
    }

    if (this.isMitigationOverdue(mitigation.dueDate)) {
      dynamicActions.push('Escalate immediately: mitigation is overdue and requires urgent closure.');
    } else if (this.isMitigationDueSoon(mitigation.dueDate)) {
      dynamicActions.push('Prioritize this week: due date is close, run focused follow-up checks.');
    }

    if (status.includes('PLAN')) {
      dynamicActions.push('Finalize implementation checklist and assign execution owner.');
    } else if (status.includes('PROGRESS')) {
      dynamicActions.push('Capture evidence of progress and update technical runbook notes.');
    } else if (status.includes('COMPLETE') || status.includes('DONE')) {
      dynamicActions.push('Perform post-implementation validation and close residual risks.');
    }

    const normalized = [...dynamicActions, ...baseActions]
      .map(item => String(item ?? '').trim())
      .filter(Boolean);

    return Array.from(new Set(normalized)).slice(0, 5);
  }

  private computeMitigationPriority(
    mitigation: MitigationPlan,
    basePriority: ITMitigationProfile['priority']
  ): { priority: ITMitigationProfile['priority']; reason: string } {
    const probabilityScore = this.mapProbabilityToScore(this.selectedRisk?.probability);
    const impactScore = this.mapImpactToScore(this.selectedRisk?.impact);
    const riskScore = probabilityScore * impactScore;
    const status = String(mitigation.status ?? '').toUpperCase();

    if (this.isMitigationOverdue(mitigation.dueDate)) {
      return {
        priority: 'Critical',
        reason: `Overdue mitigation. Risk score ${riskScore} requires immediate action.`
      };
    }

    const dueInDays = this.getDueInDays(mitigation.dueDate);
    if (dueInDays !== null && dueInDays <= 7 && (riskScore >= 4 || !status.includes('COMPLETE'))) {
      return {
        priority: 'High',
        reason: `Due in ${dueInDays} day(s) with risk score ${riskScore}.`
      };
    }

    if (!status.includes('COMPLETE') && riskScore >= 6) {
      return {
        priority: 'High',
        reason: `High inherent risk score (${riskScore}) and mitigation not completed.`
      };
    }

    return {
      priority: basePriority === 'Critical' ? 'High' : basePriority,
      reason: `Based on risk score ${riskScore}, status ${status || '-'}, and due date.`
    };
  }

  private mapProbabilityToScore(value: unknown): number {
    const normalized = String(value ?? '').toUpperCase();
    if (normalized.includes('HIGH')) return 3;
    if (normalized.includes('MEDIUM')) return 2;
    return 1;
  }

  private mapImpactToScore(value: unknown): number {
    const normalized = String(value ?? '').toUpperCase();
    if (normalized.includes('MODERATE') || normalized.includes('HIGH') || normalized.includes('MAJOR')) return 3;
    if (normalized.includes('MINOR') || normalized.includes('MEDIUM')) return 2;
    return 1;
  }

  private getDueInDays(dueDate?: string): number | null {
    if (!dueDate) return null;
    const due = new Date(dueDate);
    if (Number.isNaN(due.getTime())) return null;
    return Math.max(0, Math.ceil((due.getTime() - Date.now()) / (1000 * 60 * 60 * 24)));
  }

  private findKeyword(corpus: string, keywords: string[]): string | null {
    const match = keywords.find(keyword => corpus.includes(keyword));
    return match ?? null;
  }

  private countKeywordHits(corpus: string, keywords: string[]): number {
    if (!corpus || !keywords?.length) return 0;
    return keywords.filter(keyword => corpus.includes(String(keyword).toLowerCase())).length;
  }

  private buildHeuristicITProfile(mitigation: MitigationPlan): ITMitigationProfile {
    if (this.isMitigationOverdue(mitigation.dueDate)) {
      return {
        category: 'Monitoring & Incident Response',
        owner: 'IT Support / NOC',
        priority: 'High',
        signal: 'overdue',
        reason: 'Heuristic fallback: mitigation is overdue.',
        actions: [
          'Open incident bridge and assign technical owner',
          'Collect logs and metrics from impacted services',
          'Validate containment and fallback continuity'
        ]
      };
    }

    return this.buildDefaultITProfile();
  }

  isRiskFieldInvalid(field: string): boolean {
    const control = this.riskForm.get(field);
    return !!(control?.invalid && control?.touched);
  }

  getRiskTitleError(): string {
    const control = this.riskForm.get('title');
    if (!control || !control.touched || !control.errors) return '';
    if (control.errors['required'] || control.errors['minlength']) {
      return 'Title is required (min 3 chars).';
    }
    if (control.errors['meaninglessForAi']) {
      return 'This does not look like a meaningful risk title. Please use a real risk name.';
    }
    return 'Invalid title.';
  }

  isMitigationFieldInvalid(field: string): boolean {
    const control = this.mitigationForm.get(field);
    return !!(control?.invalid && control?.touched);
  }

  getMitigationDateError(): string {
    const control = this.mitigationForm.get('dueDate');
    if (!control || !control.touched || !control.errors) return '';
    if (control.errors['pastDate']) return 'Due date must be today or in the future.';
    return '';
  }

  getRiskSlaError(): string {
    const control = this.riskForm.get('slaDueDate');
    if (!control || !control.touched || !control.errors) return '';
    if (control.errors['required']) return 'SLA due date is required.';
    if (control.errors['pastDateCreate']) return 'For a new risk, SLA date cannot be in the past.';
    return 'Invalid SLA date.';
  }

  onRiskGovernanceChanged(): void {
    const slaDueDate = this.riskForm.get('slaDueDate')?.value;

    this.setRiskSlaPastDateCreateError(!this.riskEditMode && this.isDateBeforeToday(String(slaDueDate ?? '')));
  }

  private buildRiskForm(): FormGroup {
    return this.fb.group({
      title: ['', [Validators.required, Validators.minLength(3)]],
      description: ['', [Validators.required, Validators.minLength(8)]],
      probability: ['LOW', Validators.required],
      impact: ['MODERATE', Validators.required],
      status: ['IDENTIFIED', Validators.required],
      category: ['OPERATIONAL_RISK', Validators.required],
      slaDueDate: ['', [Validators.required]],
      projectId: [null]
    });
  }

  private isMeaningfulRiskTitleForAi(title: string): boolean {
    const normalized = String(title ?? '').trim();
    if (normalized.length < 4) return false;

    const lettersOnly = normalized.replace(/[^a-zA-ZÀ-ÿ]/g, '');
    if (lettersOnly.length < 4) return false;
    if (/^([a-zA-ZÀ-ÿ])\1{2,}$/i.test(lettersOnly)) return false;

    const distinctChars = new Set(lettersOnly.toLowerCase().split(''));
    return distinctChars.size >= 3;
  }

  private setRiskTitleMeaninglessError(enabled: boolean): void {
    const control = this.riskForm.get('title');
    if (!control) return;

    const errors = { ...(control.errors ?? {}) };
    if (enabled) {
      errors['meaninglessForAi'] = true;
      control.setErrors(errors);
      return;
    }

    if (!errors['meaninglessForAi']) return;
    delete errors['meaninglessForAi'];
    control.setErrors(Object.keys(errors).length ? errors : null);
  }

  private loadProjects(): void {
    if (this.projectLoading) {
      return;
    }
    this.projectLoading = true;
    const scopedRoles: UserRole[] = ['PROJECT_MEMBER', 'PROJECT_MANAGER'];
    const scopedUserId = this.currentUser?.id != null && scopedRoles.includes(this.currentRole as UserRole)
      ? String(this.currentUser.id)
      : undefined;

    this.riskService.getProjects(scopedUserId).subscribe({
      next: (projects) => {
        const backendProjects = projects ?? [];
        const fallbackProjects = this.extractProjectsFromRisks();

        const projectMap = new Map<number, ProjectOption>();
        [...backendProjects, ...fallbackProjects].forEach((project) => {
          if (Number.isFinite(project.id) && project.name) {
            projectMap.set(project.id, project);
          }
        });

        this.projects = Array.from(projectMap.values()).sort((a, b) => a.name.localeCompare(b.name));
        this.projectOptions = this.projects.map(project => ({
          value: project.id,
          label: project.name
        }));
        this.projectLoading = false;
      },
      error: () => {
        this.projects = this.extractProjectsFromRisks();
        this.projectOptions = this.projects.map(project => ({
          value: project.id,
          label: project.name
        }));
        this.projectLoading = false;

        if (!this.projectOptions.length && (this.showRiskDialog || this.riskEditMode)) {
          this.messageService.add({
            severity: 'warn',
            summary: 'Projects unavailable',
            detail: 'Project list endpoint is unavailable. Check project-service (/api/projects) or configure riskProjectsApiUrl in environment.'
          });
        }
      }
    });
  }

  private extractProjectsFromRisks(): ProjectOption[] {
    const map = new Map<number, ProjectOption>();

    this.risks.forEach((risk) => {
      const id = this.normalizeProjectId(risk.projectId);
      const name = String(risk.projectName ?? '').trim();
      if (id !== null && name) {
        map.set(id, { id, name });
      }
    });

    return Array.from(map.values());
  }

  private normalizeProjectId(value: unknown): number | null {
    if (value === null || value === undefined || value === '') return null;
    const normalized = Number(value);
    return Number.isFinite(normalized) ? normalized : null;
  }

  private resetAiSuggestion(): void {
    this.aiSuggestionLoading = false;
    this.showAiSuggestion = false;
    this.aiDescriptionSuggestion = '';
    this.aiStepsSuggestion = [];
    this.chatbotLoading = false;
    this.chatbotQuestion = '';
    this.chatbotAnswer = '';
  }

  private buildMitigationForm(): FormGroup {
    return this.fb.group({
      action: ['', [Validators.required, Validators.minLength(3)]],
      status: ['PLANNED', Validators.required],
      dueDate: ['', [Validators.required, this.futureDateValidator()]],
      cost: [null, [Validators.min(0)]]
    });
  }

  private normalizeMitigationCost(value: unknown): number | undefined {
    if (value === null || value === undefined || value === '') return undefined;
    const parsed = Number(value);
    if (!Number.isFinite(parsed) || parsed < 0) return undefined;
    return parsed;
  }

  private applyRiskSaveSuccess(risk: Risk, edited: boolean): void {
    if (edited) {
      const index = this.risks.findIndex(r => r.id === risk.id);
      if (index !== -1) this.risks[index] = risk;
      if (this.selectedRisk?.id === risk.id) this.selectedRisk = this.risks[index];
    } else {
      this.risks = [risk, ...this.risks];
      this.selectedRisk = risk;
    }

    this.showRiskDialog = false;
    this.loadDashboardStats();
    this.messageService.add({
      severity: 'success',
      summary: edited ? 'Risk Updated' : 'Risk Created',
      detail: edited ? 'Risk updated successfully.' : 'Risk created successfully.'
    });
  }

  private applyMitigationSaveSuccess(mitigation: MitigationPlan, edited: boolean): void {
    if (!this.selectedRisk) return;

    const mitigationPlans = this.selectedRisk.mitigationPlans ?? [];
    if (edited) {
      const index = mitigationPlans.findIndex(m => m.id === mitigation.id);
      if (index !== -1) mitigationPlans[index] = mitigation;
    } else {
      mitigationPlans.unshift(mitigation);
    }

    this.selectedRisk.mitigationPlans = mitigationPlans;
    this.refreshRiskInList(this.selectedRisk);
    this.showMitigationDialog = false;
    this.loadDashboardStats();
    this.messageService.add({
      severity: 'success',
      summary: edited ? 'Mitigation Updated' : 'Mitigation Added',
      detail: edited ? 'Mitigation plan updated successfully.' : 'Mitigation plan added successfully.'
    });
  }

  private removeRiskLocally(risk: Risk): void {
    this.risks = this.risks.filter(r => r.id !== risk.id);
    if (this.selectedRisk?.id === risk.id) {
      this.selectedRisk = this.risks[0] ?? null;
    }
    this.loadDashboardStats();
    this.messageService.add({ severity: 'success', summary: 'Risk Deleted', detail: 'Risk deleted successfully.' });
  }

  private removeMitigationLocally(mitigation: MitigationPlan): void {
    if (!this.selectedRisk) return;
    this.selectedRisk.mitigationPlans = (this.selectedRisk.mitigationPlans ?? []).filter(m => m.id !== mitigation.id);
    this.refreshRiskInList(this.selectedRisk);
    this.loadDashboardStats();
    this.messageService.add({ severity: 'success', summary: 'Mitigation Deleted', detail: 'Mitigation plan deleted successfully.' });
  }

  private loadDashboardStats(): void {
    this.riskService.getDashboardStats().subscribe({
      next: (stats) => {
        this.dashboardStats = {
          ...stats,
          risksByStatus: stats.risksByStatus ?? {},
          risksByImpact: stats.risksByImpact ?? {},
          risksByProbability: stats.risksByProbability ?? {},
          mitigationsByStatus: stats.mitigationsByStatus ?? {},
          totalRisks: Number(stats.totalRisks ?? 0),
          totalMitigations: Number(stats.totalMitigations ?? 0),
          averageMitigationCost: Number(stats.averageMitigationCost ?? 0),
          overdueMitigations: Number(stats.overdueMitigations ?? 0)
        };
      },
      error: () => {
        // Keep local KPI fallback values when stats endpoint is unavailable.
        this.dashboardStats = null;
      }
    });
  }

  private countStatsByStatusFragment(fragment: string): number | null {
    if (!this.dashboardStats?.risksByStatus) return null;

    return Object.entries(this.dashboardStats.risksByStatus)
      .filter(([status]) => status.toUpperCase().includes(fragment))
      .reduce((total, [, count]) => total + Number(count || 0), 0);
  }

  private refreshRiskInList(risk: Risk): void {
    const index = this.risks.findIndex(r => r.id === risk.id);
    if (index !== -1) this.risks[index] = { ...risk };
  }

  private normalizeRisk(risk: Risk, fallbackMitigations: MitigationPlan[] = []): Risk {
    const normalizedOwner = String(risk.owner ?? '').trim();
    const normalizedSlaDueDate = this.formatDateForInput(risk.slaDueDate);

    return {
      ...risk,
      owner: normalizedOwner,
      slaDueDate: normalizedSlaDueDate || undefined,
      mitigationPlans: (risk.mitigationPlans ?? fallbackMitigations ?? []).map(m => this.normalizeMitigation(m))
    };
  }

  private normalizeMitigation(mitigation: MitigationPlan): MitigationPlan {
    return {
      ...mitigation,
      cost: mitigation.cost !== undefined && mitigation.cost !== null ? Number(mitigation.cost) : undefined
    };
  }

  private ensureSelectionAfterReload(): void {
    if (!this.risks.length) {
      this.selectedRisk = null;
      return;
    }

    if (this.selectedRisk) {
      const same = this.risks.find(r => r.id === this.selectedRisk!.id);
      this.selectedRisk = same ?? this.risks[0];
      this.loadMitigationsForSelectedRisk();
      return;
    }

    this.selectedRisk = this.risks[0];
    this.loadMitigationsForSelectedRisk();
  }

  private loadMitigationsForSelectedRisk(): void {
    if (!this.selectedRisk) return;

    const riskId = this.selectedRisk.id;
    this.riskService.getMitigationsByRiskId(riskId).subscribe({
      next: (plans) => {
        const normalized = (plans ?? []).map(p => this.normalizeMitigation(p));
        this.loadMitigationAiProfiles(normalized);
        this.selectedRisk = {
          ...this.selectedRisk!,
          mitigationPlans: normalized
        };
        if (this.mitigationFirst >= normalized.length) {
          this.mitigationFirst = 0;
        }
        this.refreshRiskInList(this.selectedRisk);
      },
      error: () => {
        this.mitigationAiProfiles.clear();
        // Keep currently displayed values when backend detail endpoint fails.
      }
    });
  }

  private loadUnassignedMitigations(): void {
    if (!this.selectedRisk) return;

    this.riskService.getAllMitigations().subscribe({
      next: (plans) => {
        const normalized = (plans ?? []).map(p => this.normalizeMitigation(p));
        const currentRiskPlans = new Set((this.selectedRisk?.mitigationPlans ?? []).map(p => p.id));

        this.unassignedMitigations = normalized.filter(plan => {
          const planRiskId = plan.riskId;
          if (planRiskId !== undefined && planRiskId !== null) {
            return planRiskId !== this.selectedRisk!.id;
          }
          return !currentRiskPlans.has(plan.id);
        });

        this.unassignedMitigationOptions = this.unassignedMitigations.map(plan => ({
          value: plan.id,
          label: `${plan.action} (${plan.status})`
        }));
      },
      error: (err) => {
        this.messageService.add({
          severity: 'error',
          summary: 'Load failed',
          detail: this.extractBackendErrorMessage(err, 'Unable to load available mitigation plans.')
        });
      }
    });
  }

  private loadSelectedRiskDetails(): void {
    if (!this.selectedRisk) return;

    const riskId = this.selectedRisk.id;
    this.riskService.getRiskDetails(riskId).subscribe({
      next: (risk) => {
        const normalized = this.normalizeRisk(risk, this.selectedRisk?.mitigationPlans ?? []);
        this.selectedRisk = normalized;
        this.refreshRiskInList(normalized);
      },
      error: () => {
        // Keep list item data when details endpoint fails.
      }
    });
  }

  private formatDateForInput(value?: string): string {
    if (!value) return '';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return '';
    return date.toISOString().split('T')[0];
  }

  private getTodayIsoDate(): string {
    return new Date().toISOString().split('T')[0];
  }

  private futureDateValidator(): ValidatorFn {
    return (control: AbstractControl): ValidationErrors | null => {
      const value = control.value;
      if (!value) return null;

      const selected = new Date(value);
      if (Number.isNaN(selected.getTime())) return null;

      const today = new Date();
      today.setHours(0, 0, 0, 0);
      selected.setHours(0, 0, 0, 0);

      return selected <= today ? { pastDate: true } : null;
    };
  }

  private isDateBeforeToday(value: string): boolean {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return false;
    date.setHours(0, 0, 0, 0);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return date.getTime() < today.getTime();
  }

  private setRiskSlaPastDateCreateError(enabled: boolean): void {
    const control = this.riskForm.get('slaDueDate');
    if (!control) return;

    const errors = { ...(control.errors ?? {}) };
    if (enabled) {
      errors['pastDateCreate'] = true;
      control.setErrors(errors);
      return;
    }

    if (!errors['pastDateCreate']) return;
    delete errors['pastDateCreate'];
    control.setErrors(Object.keys(errors).length ? errors : null);
  }

  private isRiskClosedLike(status: unknown): boolean {
    const normalized = String(status ?? '').toUpperCase();
    return normalized.includes('CLOSED') || normalized.includes('MITIGAT') || normalized.includes('ACCEPTED');
  }

  private initializeEnumOptions(): void {
    this.probabilityOptions = this.toEnumOptions<RiskProbability>([
      'LOW',
      'MEDIUM',
      'HIGH'
    ]);

    this.impactOptions = this.toEnumOptions<RiskImpact>([
      'NEGLIGIBLE',
      'MINOR',
      'MODERATE'
    ]);

    this.riskStatusOptions = this.toEnumOptions<RiskStatus>([
      'IDENTIFIED',
      'ANALYZED',
      'IN_PROGRESS',
      'MITIGATED',
      'ACCEPTED',
      'CLOSED'
    ]);

    this.riskCategoryOptions = [
      { label: 'Operational Risk', value: 'OPERATIONAL_RISK' },
      { label: 'Financial Risk', value: 'FINANCIAL_RISK' },
      { label: 'Technical Risk', value: 'TECHNICAL_RISK' },
      { label: 'Security Risk', value: 'SECURITY_RISK' },
      { label: 'Compliance Risk', value: 'COMPLIANCE_RISK' },
      { label: 'Strategic Risk', value: 'STRATEGIC_RISK' },
      { label: 'Project Risk', value: 'PROJECT_RISK' },
      { label: 'Environmental Risk', value: 'ENVIRONMENTAL_RISK' },
      { label: 'Legal Risk', value: 'LEGAL_RISK' },
      { label: 'Reputational Risk', value: 'REPUTATIONAL_RISK' }
    ];

    this.mitigationStatusOptions = this.toEnumOptions<MitigationPlanStatus>([
      'PLANNED',
      'IN_PROGRESS',
      'COMPLETED',
      'FAILED',
      'CANCELLED'
    ]);
  }

  private extractBackendErrorMessage(error: any, fallback: string): string {
    const payload = error?.error;

    if (payload?.errors && typeof payload.errors === 'object') {
      const first = Object.values(payload.errors)[0];
      if (typeof first === 'string' && first.trim()) return first;
    }

    if (typeof payload?.message === 'string' && payload.message.trim()) {
      return payload.message;
    }

    if (typeof error?.message === 'string' && error.message.trim()) {
      return error.message;
    }

    return fallback;
  }

  private refreshEnumOptionsFromData(): void {
    const probabilities = this.risks.map(r => (r.probability || '').toUpperCase()).filter(Boolean);
    const impacts = this.risks.map(r => (r.impact || '').toUpperCase()).filter(Boolean);
    const statuses = this.risks.map(r => (r.status || '').toUpperCase()).filter(Boolean);
    const categories = this.risks.map(r => (r.category || '').toUpperCase()).filter(Boolean);
    const mitigationStatuses = this.risks
      .flatMap(r => r.mitigationPlans ?? [])
      .map(plan => (plan.status || '').toUpperCase())
      .filter(Boolean);

    this.probabilityOptions = this.mergeEnumOptions(this.probabilityOptions, probabilities);
    this.impactOptions = this.mergeEnumOptions(this.impactOptions, impacts);
    this.riskStatusOptions = this.mergeEnumOptions(this.riskStatusOptions, statuses);
    this.riskCategoryOptions = this.mergeEnumOptions(this.riskCategoryOptions, categories);
    this.mitigationStatusOptions = this.mergeEnumOptions(this.mitigationStatusOptions, mitigationStatuses);
  }

  private mergeEnumOptions<T extends string>(
    current: Array<{ label: string; value: T }>,
    rawValues: string[]
  ): Array<{ label: string; value: T }> {
    const set = new Set<string>(current.map(opt => String(opt.value).toUpperCase()));
    rawValues.forEach(value => set.add(value));
    return this.toEnumOptions<T>(Array.from(set));
  }

  private toEnumOptions<T extends string>(values: string[]): Array<{ label: string; value: T }> {
    return values
      .filter(Boolean)
      .map(v => v.toUpperCase())
      .filter((value, index, arr) => arr.indexOf(value) === index)
      .map(v => ({ label: v, value: v as T }));
  }

  private countByRiskStatus(fragment: string): number {
    return this.risks.filter(r => (r.status || '').toUpperCase().includes(fragment)).length;
  }
}
