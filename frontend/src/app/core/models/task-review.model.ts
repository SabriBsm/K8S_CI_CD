import { Task, TaskStatus } from './task.model';

export interface TaskReview {
  id: number;
  taskId: string;
  aiScore: number;
  aiSuggestion: TaskStatus;
  aiExplanation: string;
  reviewed: boolean;
  managerDecision?: TaskStatus | null;
  createdAt: string;
  task: Task;
}

export type ManagerReviewDecision = 'DONE' | 'IN_PROGRESS' | 'TODO';
