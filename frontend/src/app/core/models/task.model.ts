export type TaskStatus = 'TODO' | 'IN_PROGRESS' | 'DONE';
export type AiSuggestion = TaskStatus | 'UNKNOWN';
export type TaskPriority = 'HIGH' | 'MEDIUM' | 'LOW';
export type TaskPrioritySource = 'KEYWORD' | 'AI' | 'FALLBACK' | 'MANUAL';

export interface Task {
  id: string;
  title: string;
  description?: string;
  status: TaskStatus;
  priority: TaskPriority;
  deadline?: string;
  renduFileUrl?: string;
  renduType?: string;
  aiSuggestion?: AiSuggestion;
  aiScore?: number;
  aiConfidence?: number;
  aiExplanation?: string;
  position: number;
  projectId: string;
  projectName?: string;
  assigneeId?: string;
  assigneeName?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CalendarProject {
  id: string;
  name: string;
  color: string;
}

export interface CalendarTask {
  id: string;
  title: string;
  startDate?: string;
  createdAt?: string;
  deadline?: string;
  status: TaskStatus;
  project: CalendarProject;
}

export interface CreateTaskRequest {
  title: string;
  description?: string;
  deadline?: string | null;
  status?: TaskStatus;
  position?: number;
  priority?: TaskPriority;
  projectId: string;
  assigneeId?: string | null;
}

export interface UpdateTaskRequest {
  title: string;
  description?: string;
  deadline?: string | null;
  status: TaskStatus;
  position?: number;
  projectId: string;
  assigneeId?: string | null;
  priority?: TaskPriority;
}

export interface TaskStatusUpdateRequest {
  status: TaskStatus;
  position?: number;
}

export interface TaskPageResponse {
  content: Task[];
  totalElements: number;
  totalPages: number;
  size: number;
  number: number;
}
