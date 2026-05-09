import { ChangeDetectorRef, Component, OnDestroy, OnInit } from '@angular/core';
import { forkJoin, of, Subject } from 'rxjs';
import { catchError, finalize, takeUntil } from 'rxjs/operators';
import { UserRole } from '../../core/models/auth.model';
import {
  BudgetRequest,
  ExpenseRequest,
  FinanceBudget,
  FinanceExpense,
  FinancialReport,
  FinanceProject,
  ReportAnalysisResponse
} from '../../core/models/finance.model';
import { AuthService } from '../../core/services/auth.service';
import { FinanceService } from '../../core/services/finance.service';
import { NotificationSyncService } from '../../core/services/notification-sync.service';

interface BudgetDraft {
  name: string;
  description: string;
  plannedAmount: number | null;
  allocatedAmount: number | null;
  startDate: string;
  endDate: string;
}

interface ExpenseDraft {
  title: string;
  description: string;
  amount: number | null;
  expenseDate: string;
  budgetId: number | null;
}

interface ProjectDraft {
  name: string;
  description: string;
  startDate: string;
  endDate: string;
}

@Component({
  selector: 'app-finance',
  templateUrl: './finance.component.html',
  styleUrl: './finance.component.scss'
})
export class FinanceComponent implements OnInit, OnDestroy {
  private static readonly MAX_PDF_SIZE_BYTES = 10 * 1024 * 1024;

  readonly title = 'Financial Management';
  readonly description = 'Budget planning, expense tracking, and financial reports comparing planned versus actual costs.';

  projects: FinanceProject[] = [];
  budgets: FinanceBudget[] = [];
  expenses: FinanceExpense[] = [];
  reports: FinancialReport[] = [];
  analyses: ReportAnalysisResponse[] = [];

  selectedProject: FinanceProject | null = null;
  selectedBudgetId: number | null = null;

  loading = false;
  loadingAnalyses = false;
  creatingProject = false;
  creatingBudget = false;
  creatingExpense = false;
  generatingReport = false;
  uploadingPdf = false;
  deletingBudgetId: number | null = null;
  deletingExpenseId: number | null = null;
  errorMessage = '';
  statusMessage = '';
  reportSearch = '';
  reportSummary = '';
  selectedPdfName = '';
  lastUpdated: Date | null = null;

  readonly budgetDraft: BudgetDraft = this.createEmptyBudgetDraft();
  readonly expenseDraft: ExpenseDraft = this.createEmptyExpenseDraft();
  readonly projectDraft: ProjectDraft = this.createEmptyProjectDraft();

  private readonly destroy$ = new Subject<void>();
  private userRole: UserRole | null = null;

  constructor(
    private readonly authService: AuthService,
    private readonly financeService: FinanceService,
    private readonly notificationSyncService: NotificationSyncService,
    private readonly cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    this.userRole = this.authService.getRole();
    this.loadFinanceData();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  get isClient(): boolean {
    return this.normalizedRole === 'CUSTOMER';
  }

  get isFinanceManager(): boolean {
    return this.normalizedRole === 'ADMIN' || this.normalizedRole === 'MANAGER' || this.normalizedRole === 'PROJECT_MANAGER';
  }

  get isEmployee(): boolean {
    return this.normalizedRole === 'PROJECT_MEMBER' || this.normalizedRole === 'TEAM_MEMBER' || this.normalizedRole === 'EMPLOYEE';
  }

  private get normalizedRole(): string {
    return String(this.userRole ?? '').replace(/^ROLE_/, '').toUpperCase();
  }

  get canManageFinanceEntries(): boolean {
    return this.isClient;
  }

  get canDeleteFinanceEntries(): boolean {
    return this.isClient;
  }

  get canGenerateReports(): boolean {
    return this.normalizedRole === 'ADMIN';
  }

  get canCreateProjects(): boolean {
    return this.isClient;
  }

  get canUploadDocuments(): boolean {
    return this.isClient;
  }

  get canExportFinanceData(): boolean {
    return this.isFinanceManager;
  }

  get scopeLabel(): string {
    return this.isClient ? 'Customer workspace' : this.isFinanceManager ? 'Manager workspace' : 'Finance workspace';
  }

  get roleLabel(): string {
    if (this.isFinanceManager) {
      return this.normalizedRole === 'ADMIN' ? 'Admin access' : 'Manager access';
    }

    if (this.isClient) {
      return 'Customer access';
    }

    if (this.isEmployee) {
      return 'Team Member access';
    }

    return 'Authenticated access';
  }

  get visibleBudgets(): FinanceBudget[] {
    const projectId = this.selectedProject?.id;
    if (!projectId) {
      return [];
    }

    return this.budgets.filter((budget) => budget.projectId === projectId);
  }

  get selectedBudget(): FinanceBudget | null {
    return this.visibleBudgets.find((budget) => budget.id === this.selectedBudgetId) ?? null;
  }

  get visibleExpenses(): FinanceExpense[] {
    const projectId = this.selectedProject?.id;
    if (!projectId) {
      return [];
    }

    return this.expenses.filter((expense) => {
      if (expense.projectId !== projectId) {
        return false;
      }

      if (!this.selectedBudgetId) {
        return true;
      }

      return expense.budgetId === this.selectedBudgetId;
    });
  }

  get filteredReports(): FinancialReport[] {
    const term = this.reportSearch.trim().toLowerCase();
    if (!term) {
      return this.reports;
    }

    return this.reports.filter((report) =>
      `${report.projectName} ${report.clientName} ${report.summary}`.toLowerCase().includes(term)
    );
  }

  get totalPlannedBudget(): number {
    return this.visibleBudgets.reduce((total, budget) => total + budget.plannedAmount, 0);
  }

  get totalAllocatedBudget(): number {
    return this.visibleBudgets.reduce((total, budget) => total + budget.allocatedAmount, 0);
  }

  get totalExpenses(): number {
    return this.visibleExpenses.reduce((total, expense) => total + expense.amount, 0);
  }

  get remainingBudget(): number {
    return this.totalAllocatedBudget - this.totalExpenses;
  }

  get latestAnalysis(): ReportAnalysisResponse | null {
    return this.analyses[0] ?? null;
  }

  refresh(): void {
    this.loadFinanceData();
  }

  selectProject(project: FinanceProject): void {
    if (this.selectedProject?.id === project.id) {
      return;
    }

    this.selectedProject = project;
    this.reportSummary = project.description || '';
    this.syncSelectionState(project.id, null);
    this.loadSelectedProjectFinance(project.id);
    this.loadProjectAnalyses(project.id);
    this.statusMessage = `Project ${project.name} selected.`;
    this.cdr.detectChanges();
  }

  selectBudget(budget: FinanceBudget): void {
    this.selectedBudgetId = budget.id;
    this.expenseDraft.budgetId = budget.id;
    this.statusMessage = `Showing ${this.visibleExpenses.length} expense(s) for ${budget.name}.`;
    this.cdr.detectChanges();
  }

  createProject(): void {
    if (!this.canCreateProjects || this.creatingProject) {
      return;
    }

    const payload = this.buildProjectRequest();
    if (!payload) {
      return;
    }

    this.creatingProject = true;
    this.errorMessage = '';

    this.financeService.createIntegratedProject(payload)
      .pipe(
        takeUntil(this.destroy$),
        finalize(() => {
          this.creatingProject = false;
          this.cdr.detectChanges();
        })
      )
      .subscribe({
        next: (project) => {
          this.projects = this.sortProjects([project, ...this.projects.filter((item) => item.id !== project.id)]);
          this.selectedProject = project;
          this.resetProjectDraft();
          this.loadFinanceData();
          this.statusMessage = `Project ${project.name} created successfully.`;
        },
        error: (error) => {
          console.error('[FinanceComponent] Failed to create project', error);
          this.errorMessage = this.extractErrorMessage(error, 'Unable to create the project.');
        }
      });
  }

  updateReportSearch(event: Event): void {
    this.reportSearch = (event.target as HTMLInputElement).value;
  }

  updateReportSummary(event: Event): void {
    this.reportSummary = (event.target as HTMLTextAreaElement).value;
  }

  createBudget(): void {
    if (!this.selectedProject || !this.canManageFinanceEntries || this.creatingBudget) {
      return;
    }

    const payload = this.buildBudgetRequest();
    if (!payload) {
      return;
    }

    this.creatingBudget = true;
    this.errorMessage = '';

    this.financeService.createBudget(payload)
      .pipe(
        takeUntil(this.destroy$),
        finalize(() => {
          this.creatingBudget = false;
          this.cdr.detectChanges();
        })
      )
      .subscribe({
        next: (budget) => {
          console.log('[FinanceComponent] Created budget response', budget);
          this.budgets = this.sortBudgets([budget, ...this.budgets.filter((item) => item.id !== budget.id)]);
          this.selectedBudgetId = budget.id;
          this.expenseDraft.budgetId = budget.id;
          this.resetBudgetDraft();
          this.lastUpdated = new Date();
          this.statusMessage = `Budget ${budget.name} created successfully.`;
          this.cdr.detectChanges();
        },
        error: (error) => {
          console.error('[FinanceComponent] Failed to create budget', error);
          this.errorMessage = this.extractErrorMessage(error, 'Unable to create the budget.');
        }
      });
  }

  createExpense(): void {
    if (!this.canManageFinanceEntries || this.creatingExpense) {
      return;
    }

    const payload = this.buildExpenseRequest();
    if (!payload) {
      return;
    }

    this.creatingExpense = true;
    this.errorMessage = '';

    this.financeService.createExpense(payload)
      .pipe(
        takeUntil(this.destroy$),
        finalize(() => {
          this.creatingExpense = false;
          this.cdr.detectChanges();
        })
      )
      .subscribe({
        next: (expense) => {
          console.log('[FinanceComponent] Created expense response', expense);
          this.expenses = this.sortExpenses([expense, ...this.expenses.filter((item) => item.id !== expense.id)]);
          this.selectedBudgetId = expense.budgetId;
          this.expenseDraft.title = '';
          this.expenseDraft.description = '';
          this.expenseDraft.amount = null;
          this.expenseDraft.expenseDate = this.todayInputValue();
          this.expenseDraft.budgetId = expense.budgetId;
          this.lastUpdated = new Date();
          this.statusMessage = `Expense ${expense.title} created successfully.`;
          this.cdr.detectChanges();
        },
        error: (error) => {
          console.error('[FinanceComponent] Failed to create expense', error);
          this.errorMessage = this.extractErrorMessage(error, 'Unable to create the expense.');
        }
      });
  }

  deleteBudget(budget: FinanceBudget, event?: Event): void {
    event?.stopPropagation();
    if (!this.canDeleteFinanceEntries || this.deletingBudgetId === budget.id) {
      return;
    }

    if (!window.confirm(`Delete budget "${budget.name}"?`)) {
      return;
    }

    this.deletingBudgetId = budget.id;
    this.errorMessage = '';

    this.financeService.deleteBudget(budget.id)
      .pipe(
        takeUntil(this.destroy$),
        finalize(() => {
          this.deletingBudgetId = null;
          this.cdr.detectChanges();
        })
      )
      .subscribe({
        next: () => {
          console.log('[FinanceComponent] Deleted budget', budget.id);
          this.budgets = this.budgets.filter((item) => item.id !== budget.id);
          this.expenses = this.expenses.filter((expense) => expense.budgetId !== budget.id);
          this.syncSelectionState(this.selectedProject?.id ?? null, this.selectedBudgetId === budget.id ? null : this.selectedBudgetId);
          this.lastUpdated = new Date();
          this.statusMessage = `Budget ${budget.name} deleted successfully.`;
          this.cdr.detectChanges();
        },
        error: (error) => {
          console.error('[FinanceComponent] Failed to delete budget', error);
          this.errorMessage = this.extractErrorMessage(error, 'Unable to delete the budget.');
        }
      });
  }

  deleteExpense(expense: FinanceExpense, event?: Event): void {
    event?.stopPropagation();
    if (!this.canDeleteFinanceEntries || this.deletingExpenseId === expense.id) {
      return;
    }

    if (!window.confirm(`Delete expense "${expense.title}"?`)) {
      return;
    }

    this.deletingExpenseId = expense.id;
    this.errorMessage = '';

    this.financeService.deleteExpense(expense.id)
      .pipe(
        takeUntil(this.destroy$),
        finalize(() => {
          this.deletingExpenseId = null;
          this.cdr.detectChanges();
        })
      )
      .subscribe({
        next: () => {
          console.log('[FinanceComponent] Deleted expense', expense.id);
          this.expenses = this.expenses.filter((item) => item.id !== expense.id);
          this.lastUpdated = new Date();
          this.statusMessage = `Expense ${expense.title} deleted successfully.`;
          this.cdr.detectChanges();
        },
        error: (error) => {
          console.error('[FinanceComponent] Failed to delete expense', error);
          this.errorMessage = this.extractErrorMessage(error, 'Unable to delete the expense.');
        }
      });
  }

  generateReport(): void {
    if (!this.selectedProject || !this.canGenerateReports || this.generatingReport) {
      return;
    }

    const summary = this.reportSummary.trim() || this.selectedProject.description || `Financial summary for ${this.selectedProject.name}`;
    this.generatingReport = true;
    this.errorMessage = '';

    this.financeService.generateReport(this.selectedProject.id, summary)
      .pipe(
        takeUntil(this.destroy$),
        finalize(() => {
          this.generatingReport = false;
          this.cdr.detectChanges();
        })
      )
      .subscribe({
        next: (report) => {
          console.log('[FinanceComponent] Generated report response', report);
          this.reports = this.sortReports([report, ...this.reports.filter((item) => item.id !== report.id)]);
          this.notificationSyncService.requestNotificationRefresh();
          this.lastUpdated = new Date();
          this.statusMessage = `Report generated successfully for ${report.projectName}.`;
          this.cdr.detectChanges();
        },
        error: (error) => {
          console.error('[FinanceComponent] Failed to generate report', error);
          this.errorMessage = this.extractErrorMessage(error, 'Unable to generate the financial report.');
        }
      });
  }

  downloadReport(report: FinancialReport): void {
    this.financeService.downloadReportPdf(report.id)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (blob) => {
          const url = window.URL.createObjectURL(blob);
          const link = document.createElement('a');
          link.href = url;
          link.download = `financial-report-${this.slugify(report.projectName)}.pdf`;
          link.click();
          link.remove();
          window.URL.revokeObjectURL(url);
        },
        error: (error) => {
          console.error('[FinanceComponent] Failed to download report', error);
          this.errorMessage = this.extractErrorMessage(error, 'Unable to download the report PDF.');
          this.cdr.detectChanges();
        }
      });
  }

  onPdfSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0] ?? null;

    if (!file || !this.selectedProject || this.uploadingPdf || !this.canUploadDocuments) {
      input.value = '';
      return;
    }

    const isPdf = file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf');
    if (!isPdf) {
      this.errorMessage = 'Only PDF financial documents are allowed.';
      input.value = '';
      this.cdr.detectChanges();
      return;
    }

    if (file.size > FinanceComponent.MAX_PDF_SIZE_BYTES) {
      this.errorMessage = 'PDF files must be 10 MB or smaller.';
      input.value = '';
      this.cdr.detectChanges();
      return;
    }

    this.selectedPdfName = file.name;
    this.uploadingPdf = true;
    this.errorMessage = '';

    this.financeService.uploadPdfAnalysis(this.selectedProject.id, file)
      .pipe(
        takeUntil(this.destroy$),
        finalize(() => {
          this.uploadingPdf = false;
          input.value = '';
          this.cdr.detectChanges();
        })
      )
      .subscribe({
        next: (analysis) => {
          console.log('[FinanceComponent] PDF analysis response', analysis);
          this.analyses = this.sortAnalyses([analysis, ...this.analyses.filter((item) => item.id !== analysis.id)]);
          this.lastUpdated = new Date();
          this.statusMessage = `AI analysis completed for ${file.name}.`;
          this.cdr.detectChanges();
        },
        error: (error) => {
          console.error('[FinanceComponent] Failed to upload PDF', error);
          this.errorMessage = this.extractErrorMessage(error, 'Unable to analyze the uploaded PDF.');
        }
      });
  }

  exportBudgets(): void {
    if (!this.canExportFinanceData) {
      return;
    }

    const rows = this.budgets.map((budget) => ({
      Project: budget.projectName,
      Budget: budget.name,
      PlannedAmount: budget.plannedAmount,
      AllocatedAmount: budget.allocatedAmount,
      StartDate: budget.startDate ?? '',
      EndDate: budget.endDate ?? '',
      Description: budget.description
    }));

    this.exportCsv(`finance-budgets-${this.todayInputValue()}.csv`, rows);
  }

  exportExpenses(): void {
    if (!this.canExportFinanceData) {
      return;
    }

    const rows = this.expenses.map((expense) => ({
      ProjectId: expense.projectId,
      Budget: expense.budgetName,
      Expense: expense.title,
      Amount: expense.amount,
      ExpenseDate: expense.expenseDate,
      Description: expense.description
    }));

    this.exportCsv(`finance-expenses-${this.todayInputValue()}.csv`, rows);
  }

  exportReports(): void {
    if (!this.canExportFinanceData) {
      return;
    }

    const rows = this.reports.map((report) => ({
      Project: report.projectName,
      Client: report.clientName,
      TotalBudget: report.totalBudget,
      TotalExpenses: report.totalExpenses,
      Variance: report.variance,
      GeneratedAt: report.generatedAt,
      Summary: report.summary
    }));

    this.exportCsv(`finance-reports-${this.todayInputValue()}.csv`, rows);
  }

  getBudgetUsagePercent(budget: FinanceBudget): number {
    const spent = this.expenses
      .filter((expense) => expense.budgetId === budget.id)
      .reduce((total, expense) => total + expense.amount, 0);

    if (!budget.allocatedAmount) {
      return 0;
    }

    return Math.min(100, Math.round((spent / budget.allocatedAmount) * 100));
  }

  getReportVarianceClass(report: FinancialReport): string {
    return report.variance < 0 ? 'negative' : '';
  }

  getAnalysisVariance(analysis: ReportAnalysisResponse): number | null {
    if (analysis.budget == null || analysis.expenses == null) {
      return null;
    }

    return analysis.budget - analysis.expenses;
  }

  isAnalysisAcceptable(status: ReportAnalysisResponse['status']): boolean {
    return status === 'ACCEPTABLE';
  }

  formatStatus(value: string | null | undefined): string {
    return String(value ?? '')
      .replace(/_/g, ' ')
      .trim()
      .toLowerCase()
      .replace(/\b\w/g, (letter) => letter.toUpperCase());
  }

  formatSource(value: string | null | undefined): string {
    const normalized = String(value ?? '').replace(/[-_]/g, ' ').trim();
    return normalized ? this.formatStatus(normalized) : 'Unknown source';
  }

  formatDate(value: string | null | undefined): string {
    if (!value) {
      return 'N/A';
    }

    const parsed = new Date(value);
    return Number.isNaN(parsed.getTime()) ? value : parsed.toLocaleDateString();
  }

  formatDateTime(value: string | null | undefined): string {
    if (!value) {
      return 'N/A';
    }

    const parsed = new Date(value);
    return Number.isNaN(parsed.getTime()) ? value : parsed.toLocaleString();
  }

  trackById(_index: number, item: { id: number | undefined }): number | undefined {
    return item.id;
  }

  private loadFinanceData(): void {
    this.loading = true;
    this.errorMessage = '';
    this.statusMessage = 'Loading finance data from the backend...';

    const previousProjectId = this.selectedProject?.id ?? null;
    const previousBudgetId = this.selectedBudgetId;

    forkJoin({
      projects: this.getProjectsRequest(),
      budgets: this.financeService.getAllBudgets().pipe(
        catchError((error) => {
          console.error('[FinanceComponent] Failed to load budgets', error);
          return of([] as FinanceBudget[]);
        })
      ),
      expenses: this.financeService.getAllExpenses().pipe(
        catchError((error) => {
          console.error('[FinanceComponent] Failed to load expenses', error);
          return of([] as FinanceExpense[]);
        })
      ),
      reports: this.financeService.getReports().pipe(
        catchError((error) => {
          console.error('[FinanceComponent] Failed to load reports', error);
          return of([] as FinancialReport[]);
        })
      )
    })
      .pipe(
        takeUntil(this.destroy$),
        finalize(() => {
          this.loading = false;
          this.cdr.detectChanges();
        })
      )
      .subscribe({
        next: ({ projects, budgets, expenses, reports }) => {
          console.log('[FinanceComponent] Projects response', projects);
          console.log('[FinanceComponent] Budgets response', budgets);
          console.log('[FinanceComponent] Expenses response', expenses);
          console.log('[FinanceComponent] Reports response', reports);

          this.projects = this.sortProjects(projects);
          this.budgets = this.sortBudgets(this.mergeBudgets(budgets, this.getNestedBudgets(projects)));
          this.expenses = this.sortExpenses(this.mergeExpenses(expenses, this.getNestedExpenses(projects)));
          this.reports = this.sortReports(reports);
          this.lastUpdated = new Date();

          this.syncSelectionState(previousProjectId, previousBudgetId);

          if (!this.selectedProject) {
            this.analyses = [];
            this.statusMessage = 'No finance projects were returned by the backend.';
            return;
          }

          this.loadProjectAnalyses(this.selectedProject.id);
          this.statusMessage = `Loaded ${this.projects.length} project(s), ${this.budgets.length} budget(s), ${this.expenses.length} expense(s), and ${this.reports.length} report(s).`;
        },
        error: (error) => {
          console.error('[FinanceComponent] Failed to load finance data', error);
          this.errorMessage = this.extractErrorMessage(error, 'Unable to load finance data from the backend.');
          this.statusMessage = '';
        }
      });
  }

  private loadProjectAnalyses(projectId: number): void {
    this.loadingAnalyses = true;

    this.financeService.getProjectAnalyses(projectId)
      .pipe(
        takeUntil(this.destroy$),
        finalize(() => {
          this.loadingAnalyses = false;
          this.cdr.detectChanges();
        }),
        catchError((error) => {
          console.error('[FinanceComponent] Failed to load analyses', error);
          this.errorMessage = this.extractErrorMessage(error, 'Unable to load AI finance analysis history.');
          return of([] as ReportAnalysisResponse[]);
        })
      )
      .subscribe((analyses) => {
        console.log('[FinanceComponent] Analyses response', analyses);
        this.analyses = this.sortAnalyses(analyses);
        this.cdr.detectChanges();
      });
  }

  private getProjectsRequest() {
    return (this.isClient ? this.financeService.getMyProjects() : this.financeService.getAllProjects()).pipe(
      catchError((error) => {
        console.error('[FinanceComponent] Failed to load projects', error);
        return of([] as FinanceProject[]);
      })
    );
  }

  private loadSelectedProjectFinance(projectId: number): void {
    forkJoin({
      project: this.financeService.getProject(projectId).pipe(
        catchError((error) => {
          console.error('[FinanceComponent] Failed to load selected project details', error);
          return of(null as FinanceProject | null);
        })
      ),
      budgets: this.financeService.getBudgetsByProject(projectId).pipe(
        catchError((error) => {
          console.error('[FinanceComponent] Failed to load selected project budgets', error);
          return of([] as FinanceBudget[]);
        })
      ),
      expenses: this.financeService.getExpensesByProject(projectId).pipe(
        catchError((error) => {
          console.error('[FinanceComponent] Failed to load selected project expenses', error);
          return of([] as FinanceExpense[]);
        })
      )
    })
      .pipe(takeUntil(this.destroy$))
      .subscribe(({ project, budgets, expenses }) => {
        if (project) {
          this.projects = this.sortProjects([project, ...this.projects.filter((item) => item.id !== project.id)]);
        }

        this.budgets = this.sortBudgets(this.mergeBudgets(this.budgets, budgets, project?.budgets ?? []));
        this.expenses = this.sortExpenses(this.mergeExpenses(this.expenses, expenses, project?.expenses ?? []));
        this.syncSelectionState(projectId, this.selectedBudgetId);
        this.lastUpdated = new Date();
        this.cdr.detectChanges();
      });
  }

  private syncSelectionState(preferredProjectId: number | null, preferredBudgetId: number | null): void {
    this.selectedProject = this.projects.find((project) => project.id === preferredProjectId) ?? this.projects[0] ?? null;

    if (!this.selectedProject) {
      this.selectedBudgetId = null;
      this.expenseDraft.budgetId = null;
      return;
    }

    if (!this.reportSummary.trim()) {
      this.reportSummary = this.selectedProject.description || '';
    }

    const visibleBudgets = this.budgets.filter((budget) => budget.projectId === this.selectedProject?.id);
    this.selectedBudgetId = visibleBudgets.find((budget) => budget.id === preferredBudgetId)?.id ?? visibleBudgets[0]?.id ?? null;
    this.expenseDraft.budgetId = this.selectedBudgetId;
  }

  private getNestedBudgets(projects: FinanceProject[]): FinanceBudget[] {
    return projects.flatMap((project) => project.budgets ?? []);
  }

  private getNestedExpenses(projects: FinanceProject[]): FinanceExpense[] {
    return projects.flatMap((project) => project.expenses ?? []);
  }

  private mergeBudgets(...collections: FinanceBudget[][]): FinanceBudget[] {
    const byId = new Map<number, FinanceBudget>();
    collections.flat().forEach((budget) => {
      if (budget.id) {
        byId.set(budget.id, budget);
      }
    });
    return Array.from(byId.values());
  }

  private mergeExpenses(...collections: FinanceExpense[][]): FinanceExpense[] {
    const byId = new Map<number, FinanceExpense>();
    collections.flat().forEach((expense) => {
      if (expense.id) {
        byId.set(expense.id, expense);
      }
    });
    return Array.from(byId.values());
  }

  private buildBudgetRequest(): BudgetRequest | null {
    if (!this.selectedProject) {
      this.errorMessage = 'Select a project before creating a budget.';
      return null;
    }

    const name = this.budgetDraft.name.trim();
    const plannedAmount = this.budgetDraft.plannedAmount ?? 0;
    const allocatedAmount = this.budgetDraft.allocatedAmount ?? 0;

    if (!name) {
      this.errorMessage = 'Budget name is required.';
      return null;
    }

    if (plannedAmount <= 0 || allocatedAmount <= 0) {
      this.errorMessage = 'Planned and allocated amounts must be greater than zero.';
      return null;
    }

    return {
      name,
      description: this.budgetDraft.description.trim(),
      plannedAmount,
      allocatedAmount,
      startDate: this.budgetDraft.startDate || null,
      endDate: this.budgetDraft.endDate || null,
      projectId: this.selectedProject.id
    };
  }

  private buildProjectRequest(): ProjectDraft & {
    objectives: string;
    status: string;
    visibility: string;
    progress: number;
  } | null {
    const name = this.projectDraft.name.trim();
    const startDate = this.projectDraft.startDate || this.todayInputValue();
    const endDate = this.projectDraft.endDate || this.addDaysInputValue(30);

    if (!name) {
      this.errorMessage = 'Project name is required.';
      return null;
    }

    if (new Date(endDate).getTime() < new Date(startDate).getTime()) {
      this.errorMessage = 'Project end date must be after the start date.';
      return null;
    }

    return {
      name,
      description: this.projectDraft.description.trim(),
      startDate,
      endDate,
      objectives: this.projectDraft.description.trim() || name,
      status: 'PLANNED',
      visibility: 'PRIVATE',
      progress: 0
    };
  }

  private buildExpenseRequest(): ExpenseRequest | null {
    const title = this.expenseDraft.title.trim();
    const amount = this.expenseDraft.amount ?? 0;
    const budgetId = this.expenseDraft.budgetId ?? this.selectedBudgetId;

    if (!title) {
      this.errorMessage = 'Expense title is required.';
      return null;
    }

    if (amount <= 0) {
      this.errorMessage = 'Expense amount must be greater than zero.';
      return null;
    }

    if (!budgetId) {
      this.errorMessage = 'Select a budget before creating an expense.';
      return null;
    }

    return {
      title,
      description: this.expenseDraft.description.trim(),
      amount,
      expenseDate: this.expenseDraft.expenseDate || this.todayInputValue(),
      budgetId
    };
  }

  private exportCsv(fileName: string, rows: Array<Record<string, string | number | null>>): void {
    if (!rows.length) {
      this.statusMessage = 'No finance data is available to export.';
      this.cdr.detectChanges();
      return;
    }

    const headers = Object.keys(rows[0]);
    const csv = [
      headers.join(','),
      ...rows.map((row) => headers.map((header) => this.escapeCsvValue(row[header])).join(','))
    ].join('\n');

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = fileName;
    link.click();
    link.remove();
    window.URL.revokeObjectURL(url);
    this.statusMessage = `${fileName} exported successfully.`;
    this.cdr.detectChanges();
  }

  private escapeCsvValue(value: string | number | null | undefined): string {
    const text = value == null ? '' : String(value);
    return `"${text.replace(/"/g, '""')}"`;
  }

  private sortProjects(projects: FinanceProject[]): FinanceProject[] {
    return [...projects].sort((left, right) => {
      const leftTime = new Date(left.createdAt).getTime();
      const rightTime = new Date(right.createdAt).getTime();
      return (Number.isNaN(rightTime) ? 0 : rightTime) - (Number.isNaN(leftTime) ? 0 : leftTime);
    });
  }

  private sortBudgets(budgets: FinanceBudget[]): FinanceBudget[] {
    return [...budgets].sort((left, right) => right.id - left.id);
  }

  private sortExpenses(expenses: FinanceExpense[]): FinanceExpense[] {
    return [...expenses].sort((left, right) => {
      const dateDiff = new Date(right.expenseDate).getTime() - new Date(left.expenseDate).getTime();
      return Number.isNaN(dateDiff) || dateDiff === 0 ? right.id - left.id : dateDiff;
    });
  }

  private sortReports(reports: FinancialReport[]): FinancialReport[] {
    return [...reports].sort((left, right) => {
      const leftTime = new Date(left.generatedAt).getTime();
      const rightTime = new Date(right.generatedAt).getTime();
      return (Number.isNaN(rightTime) ? 0 : rightTime) - (Number.isNaN(leftTime) ? 0 : leftTime);
    });
  }

  private sortAnalyses(analyses: ReportAnalysisResponse[]): ReportAnalysisResponse[] {
    return [...analyses].sort((left, right) => {
      const leftTime = left.analyzedAt ? new Date(left.analyzedAt).getTime() : 0;
      const rightTime = right.analyzedAt ? new Date(right.analyzedAt).getTime() : 0;
      return (Number.isNaN(rightTime) ? 0 : rightTime) - (Number.isNaN(leftTime) ? 0 : leftTime);
    });
  }

  private resetBudgetDraft(): void {
    this.budgetDraft.name = '';
    this.budgetDraft.description = '';
    this.budgetDraft.plannedAmount = null;
    this.budgetDraft.allocatedAmount = null;
    this.budgetDraft.startDate = '';
    this.budgetDraft.endDate = '';
  }

  private resetProjectDraft(): void {
    this.projectDraft.name = '';
    this.projectDraft.description = '';
    this.projectDraft.startDate = this.todayInputValue();
    this.projectDraft.endDate = this.addDaysInputValue(30);
  }

  private createEmptyProjectDraft(): ProjectDraft {
    return {
      name: '',
      description: '',
      startDate: this.todayInputValue(),
      endDate: this.addDaysInputValue(30)
    };
  }

  private createEmptyBudgetDraft(): BudgetDraft {
    return {
      name: '',
      description: '',
      plannedAmount: null,
      allocatedAmount: null,
      startDate: '',
      endDate: ''
    };
  }

  private createEmptyExpenseDraft(): ExpenseDraft {
    return {
      title: '',
      description: '',
      amount: null,
      expenseDate: this.todayInputValue(),
      budgetId: null
    };
  }

  private todayInputValue(): string {
    return new Date().toISOString().slice(0, 10);
  }

  private addDaysInputValue(days: number): string {
    const date = new Date();
    date.setDate(date.getDate() + days);
    return date.toISOString().slice(0, 10);
  }

  private slugify(value: string): string {
    return value
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '') || 'report';
  }

  private extractErrorMessage(error: unknown, fallback: string): string {
    if (typeof error === 'object' && error !== null) {
      const payload = error as {
        error?: { message?: string; error?: string };
        message?: string;
      };

      return payload.error?.message || payload.error?.error || payload.message || fallback;
    }

    return fallback;
  }
}
