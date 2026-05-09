// risk.model.ts - Version corrigée
export type RiskProbability = string;
export type RiskImpact = string;
export type RiskStatus = string;
export type RiskCategory = string;
export type MitigationPlanStatus = string;

export interface MitigationPlan {
  id: number;
  action: string;
  status: MitigationPlanStatus;
  dueDate?: string;
  cost?: number;
  initialRiskScore?: number | null;
  finalRiskScore?: number | null;
  effectivenessPercentage?: number | null;
  effective?: boolean | null;
  effectivenessCalculatedAt?: string | null;
  riskId?: number | null;
  riskTitle?: string;
}

export interface Risk {
  id: number;
  title: string;
  description: string;
  probability: RiskProbability;
  impact: RiskImpact;
  status: RiskStatus;
  category: RiskCategory;
  owner?: string;
  slaDueDate?: string;
  projectId?: number | null;
  projectName?: string;
  mitigationPlans?: MitigationPlan[];
  createdBy?: string;
  createdById?: number;
  createdByName?: string;
  createdByUsername?: string;
}

export interface ProjectOption {
  id: number;
  name: string;
}

export interface CreateRiskRequest {
  title: string;
  description: string;
  probability: RiskProbability;
  impact: RiskImpact;
  status: RiskStatus;
  category: RiskCategory;
  owner?: string;
  slaDueDate: string;
  projectId?: number | null;
}

export interface UpdateRiskRequest extends Partial<CreateRiskRequest> {}

export interface CreateMitigationPlanRequest {
  action: string;
  status: MitigationPlanStatus;
  dueDate?: string;
  cost?: number;
  // Supprimez riskId d'ici car il sera ajouté dans le service
}

export interface UpdateMitigationPlanRequest extends Partial<CreateMitigationPlanRequest> {}

export interface MitigationEffectivenessEvaluationRequest {
  finalProbability: RiskProbability;
  finalImpact: RiskImpact;
  note?: string;
}

export interface MitigationITRule {
  category: string;
  owner: string;
  priority: string;
  signal: string;
  keywords: string[];
  actions: string[];
}

export interface AiMitigationContext {
  mitigationId: number;
  action: string;
  status: string;
  dueDate?: string;
}

export interface AiMitigationDetectionRequest {
  riskTitle?: string;
  riskDescription?: string;
  riskStatus?: string;
  riskProbability?: string;
  riskImpact?: string;
  mitigations: AiMitigationContext[];
}

export interface AiMitigationDetectionResult {
  mitigationId?: number;
  category?: string;
  owner?: string;
  priority?: string;
  signal?: string;
  reason?: string;
  actions?: string[];
}

export interface NotificationRule {
  key: string;
  label: string;
  enabled: boolean;
  daysBefore: number;
  severity: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW' | string;
  escalate: boolean;
  channels: string[];
}

export interface RiskAlertsSummary {
  dueIn3Days: number;
  dueIn1Day: number;
  overdue: number;
  criticalOpen: number;
}

export interface DashboardStats {
  totalRisks: number;
  risksByStatus: Record<string, number>;
  risksByImpact: Record<string, number>;
  risksByProbability: Record<string, number>;
  totalMitigations: number;
  mitigationsByStatus: Record<string, number>;
  averageMitigationCost: number;
  overdueMitigations: number;
  effectiveMitigations: number;
  ineffectiveMitigations: number;
  averageMitigationEffectiveness: number;
  mitigationEffectivenessRate: number;
}

export interface RiskHistory {
  id: number;
  previousStatus?: string | null;
  newStatus?: string | null;
  previousProbability?: string | null;
  newProbability?: string | null;
  previousImpact?: string | null;
  newImpact?: string | null;
  note?: string | null;
  changedAt?: string | null;
  changedBy?: string | null;
}
