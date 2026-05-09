export interface FinanceProject {
  id: number;
  name: string;
  description: string;
  status: 'PLANNED' | 'IN_PROGRESS' | 'ON_HOLD' | 'COMPLETED';
  createdAt: string;
  clientId: number;
  clientName: string;
  ownerId?: string;
  budgets?: FinanceBudget[];
  expenses?: FinanceExpense[];
}

export interface FinanceBudget {
  id: number;
  name: string;
  description: string;
  plannedAmount: number;
  allocatedAmount: number;
  startDate: string | null;
  endDate: string | null;
  projectId: number;
  projectName: string;
  createdBy?: string;
}

export interface FinanceExpense {
  id: number;
  title: string;
  description: string;
  amount: number;
  expenseDate: string;
  budgetId: number;
  budgetName: string;
  projectId: number;
  createdBy?: string;
}

export type FinanceAnalysisStatus = 'ACCEPTABLE' | 'NOT ACCEPTABLE' | 'NON ACCEPTABLE' | null;

export interface FinancialReport {
  id: number;
  generatedAt: string;
  totalBudget: number;
  totalExpenses: number;
  variance: number;
  summary: string;
  projectId: number;
  projectName: string;
  clientName: string;
}

export interface FinancialPredictionRequest {
  budget: number;
  expenses: number;
}

export interface FinancialPredictionResult {
  status: Exclude<FinanceAnalysisStatus, null>;
  variance: number;
  score: number;
  recommendations: string[];
}

export interface AiChatRequest {
  message: string;
  budget?: number | null;
  expenses?: number | null;
}

export interface AiChatResponse {
  reply: string;
  status: FinanceAnalysisStatus;
  variance: number | null;
  recommendations: string[];
  source: 'gemini' | 'fallback' | string;
}

export interface ReportAnalysisResponse {
  id?: number;
  fileName: string | null;
  budget: number | null;
  expenses: number | null;
  status: FinanceAnalysisStatus;
  summary: string;
  analysis: string;
  risks: string[];
  recommendations: string[];
  source: 'gemini' | 'fallback' | string;
  analyzedAt?: string | null;
  projectId?: number | null;
  projectName?: string | null;
}

export interface AiDashboard {
  totalProjects: number;
  acceptableProjects: number;
  notAcceptableProjects: number;
  averageBudget: number;
  averageExpenses: number;
  riskRate: number;
}

export interface AppNotification {
  id: number;
  title: string;
  message: string;
  type: 'PROJECT_STATUS_UPDATED' | 'REPORT_GENERATED' | string;
  read: boolean;
  createdAt: string;
  projectId: number | null;
  projectName: string | null;
}

export interface ProjectRequest {
  name: string;
  description: string;
}

export interface BudgetRequest {
  name: string;
  description: string;
  plannedAmount: number;
  allocatedAmount: number;
  startDate: string | null;
  endDate: string | null;
  projectId: number;
}

export interface ExpenseRequest {
  title: string;
  description: string;
  amount: number;
  expenseDate: string;
  budgetId: number;
}

export interface FinanceMonthlyExpensePoint {
  month: string;
  year: number;
  monthNumber: number;
  amount: number;
}

export interface FinanceRiskFactorBreakdown {
  budgetOverflow: number;
  taskDelayRatio: number;
  deadlinePressure: number;
  expenseGrowth: number;
}

export interface FinanceRiskAnalysis {
  riskScore: number;
  riskLevel: 'LOW' | 'MEDIUM' | 'HIGH' | string;
  factors: FinanceRiskFactorBreakdown;
}

export interface FinanceGlobalStats {
  totalBudget: number;
  totalExpenses: number;
  remainingBudget: number;
  spentPercentage: number;
  monthlyExpenses: FinanceMonthlyExpensePoint[];
}

export interface FinanceProjectStats {
  projectId: number;
  projectName: string;
  budget: number;
  expenses: number;
  remainingBudget: number;
  spentPercentage: number;
  overspending: boolean;
  expenseTrend: FinanceMonthlyExpensePoint[];
  totalTasks: number;
  completedTasks: number;
  lateTasks: number;
  upcomingDeadlines: number;
  risk: FinanceRiskAnalysis;
  insights: string[];
}

export interface FinanceDashboardProject {
  projectId: number;
  projectName: string;
  budget: number;
  expenses: number;
  remainingBudget: number;
  spentPercentage: number;
  overspending: boolean;
  riskScore: number;
  riskLevel: 'LOW' | 'MEDIUM' | 'HIGH' | string;
  expenseTrend: FinanceMonthlyExpensePoint[];
  insights: string[];
}

export interface FinanceDashboardResponse {
  globalStats: FinanceGlobalStats;
  projects: FinanceDashboardProject[];
}
