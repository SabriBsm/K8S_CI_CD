export type TicketStatus   = 'NEW' | 'IN_PROGRESS' | 'ON_HOLD' | 'RESOLVED' | 'CLOSED';
export type TicketPriority = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
export type TicketCategory = 'INCIDENT' | 'SERVICE_REQUEST' | 'BUG' | 'CHANGE_REQUEST';

export interface TicketSummary {
  id?: number;
  problemSummary: string;
  resolutionSteps: string;
  finalSolution: string;
  suggestedTags: string;
  generatedAt?: string;
  model?: string;
  tokensUsed?: number;
}

export interface Ticket {
  id?: number;
  reference: string;
  title: string;
  description?: string;
  status: TicketStatus;
  priority: TicketPriority;
  category: TicketCategory;
  submittedBy: string;
  assignedTo?: string;
  dueDate?: string;
  resolvedAt?: string;
  createdAt?: string;
  updatedAt?: string;
  responses?: TicketResponse[];
  summary?: TicketSummary;
}

export interface TicketResponse {
  id?: number;
  content: string;
  respondedBy: string;
  attachment?: string;
  createdAt?: string;
  updatedAt?: string;
}
