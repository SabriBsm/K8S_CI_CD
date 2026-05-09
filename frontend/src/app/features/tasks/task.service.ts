import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, map } from 'rxjs';
import { environment } from '../../../environments/environment';
import {
  CreateTaskRequest,
  AiSuggestion,
  CalendarTask,
  Task,
  TaskPageResponse,
  TaskPriority,
  TaskPrioritySource,
  TaskStatus,
  TaskStatusUpdateRequest,
  UpdateTaskRequest
} from '../../core/models/task.model';
import { TaskReview } from '../../core/models/task-review.model';

export interface TaskProject {
  id: string;
  name: string;
  description: string;
  taskCount?: number;
  completedTaskCount?: number;
}

export interface TaskQueryParams {
  search?: string;
  status?: TaskStatus | '';
  sort?: string;
  page?: number;
  size?: number;
}

export interface DirectoryUser {
  id: string;
  username?: string;
  email?: string;
  firstName?: string;
  lastName?: string;
  name?: string;
  displayName: string;
  role: string;
}

export interface TaskPriorityPreviewResponse {
  priority: TaskPriority;
  source: TaskPrioritySource;
}

export interface ProjectSyncRequest {
  externalProjectId: string;
  name: string;
  description?: string;
}

export interface TaskManualAnalysisResponse {
  aiSuggestion: AiSuggestion;
  aiScore: number;
  aiConfidence: number;
  aiExplanation: string;
}

@Injectable({ providedIn: 'root' })
export class TaskService {
  private readonly baseUrl = environment.taskApiUrl;
  private readonly apiUrl = `${this.baseUrl}/projects`;
  private readonly taskApiUrl = `${this.baseUrl}/tasks`;
  private readonly calendarApiUrl = `${this.baseUrl}/calendar/tasks`;
  private readonly usersApiUrl = `${this.baseUrl}/users`;

  private readonly highPriorityKeywords = this.normalizeKeywords([
    'urgent', 'asap', 'immediately', 'now', 'critical', 'blocker', 'production issue',
    'prod issue', 'failure', 'crash', 'security', 'breach', 'attack', 'bug critical',
    'high priority', 'important urgent', 'fix now', 'downtime', 'system down', 'data loss',
    'error 500', 'cannot login', 'payment failed', 'critique', 'immediat', 'bloquant',
    'panne', 'attaque', 'erreur grave'
  ]);

  private readonly mediumPriorityKeywords = this.normalizeKeywords([
    'important', 'soon', 'next', 'moderate', 'review', 'improve', 'update', 'optimize',
    'enhancement', 'refactor', 'test', 'validate', 'adjust', 'medium priority',
    'should be done', 'follow up', 'prepare', 'investigate', 'analyze', 'a faire',
    'a traiter', 'amelioration', 'mise a jour', 'revision'
  ]);

  private readonly lowPriorityKeywords = this.normalizeKeywords([
    'low', 'later', 'optional', 'minor', 'nice to have', 'cosmetic', 'ui tweak', 'cleanup',
    'documentation', 'docs', 'comment', 'style', 'format', 'refinement', 'low priority',
    'not urgent', 'whenever', 'backlog', 'future idea', 'faible', 'optionnel',
    'plus tard', 'mineur', 'cosmetique'
  ]);

  constructor(private http: HttpClient) {}

  getProjects(): Observable<TaskProject[]> {
    return this.http.get<TaskProject[]>(this.apiUrl);
  }

  getProject(projectId: string): Observable<TaskProject> {
    return this.http.get<TaskProject>(`${this.apiUrl}/${projectId}`);
  }

  syncProject(payload: ProjectSyncRequest): Observable<TaskProject> {
    return this.http.post<TaskProject>(`${this.apiUrl}/sync`, payload);
  }

  getCalendarTasks(): Observable<CalendarTask[]> {
    return this.http.get<CalendarTask[]>(this.calendarApiUrl);
  }

  getTasksByProject(
    projectId: string,
    title = '',
    deadline = '',
    sortBy = 'createdAt',
    direction: 'asc' | 'desc' = 'desc'
  ): Observable<Task[]> {
    const normalizedTitle = title.trim();
    let params = new HttpParams()
      .set('title', normalizedTitle)
      .set('sortBy', sortBy)
      .set('direction', direction);

    if (deadline) {
      params = params.set('deadline', deadline);
    }

    return this.http.get<Task[]>(`${this.taskApiUrl}/by-project/${projectId}`, { params });
  }

  getTasks(projectId: string, query: TaskQueryParams): Observable<TaskPageResponse> {
    let params = new HttpParams()
      .set('page', query.page ?? 0)
      .set('size', query.size ?? 12);

    if (query.search) {
      params = params.set('search', query.search);
    }
    if (query.status) {
      params = params.set('status', query.status);
    }
    if (query.sort) {
      params = params.set('sort', query.sort);
    }

    return this.http.get<TaskPageResponse>(`${this.apiUrl}/${projectId}/tasks`, { params });
  }

  createTask(projectId: string, payload: CreateTaskRequest): Observable<Task> {
    return this.http.post<Task>(`${this.apiUrl}/${projectId}/tasks`, payload);
  }

  previewPriority(projectId: string, description: string): Observable<TaskPriorityPreviewResponse> {
    return this.http.post<TaskPriorityPreviewResponse>(
      `${this.apiUrl}/${projectId}/tasks/priority-preview`,
      { description }
    );
  }

  detectLocalPriority(description: string): TaskPriorityPreviewResponse | null {
    const normalizedDescription = this.normalizeForMatching(description);
    if (!normalizedDescription) {
      return null;
    }

    if (this.containsAnyKeyword(normalizedDescription, this.highPriorityKeywords)) {
      return { priority: 'HIGH', source: 'KEYWORD' };
    }

    if (this.containsAnyKeyword(normalizedDescription, this.mediumPriorityKeywords)) {
      return { priority: 'MEDIUM', source: 'KEYWORD' };
    }

    if (this.containsAnyKeyword(normalizedDescription, this.lowPriorityKeywords)) {
      return { priority: 'LOW', source: 'KEYWORD' };
    }

    return null;
  }

  updateTask(projectId: string, taskId: string, payload: UpdateTaskRequest): Observable<Task> {
    return this.http.put<Task>(`${this.apiUrl}/${projectId}/tasks/${taskId}`, payload);
  }

  deleteTask(projectId: string, taskId: string): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${projectId}/tasks/${taskId}`);
  }

  assignTask(projectId: string, taskId: string, userId: string): Observable<Task> {
    return this.http.put<Task>(`${this.apiUrl}/${projectId}/tasks/${taskId}/assign/${userId}`, {});
  }

  updateTaskStatus(projectId: string, taskId: string, payload: TaskStatusUpdateRequest): Observable<Task> {
    return this.http.put<Task>(`${this.apiUrl}/${projectId}/tasks/${taskId}/status`, payload);
  }

  uploadRendu(taskId: string, file: File): Observable<Task> {
    const formData = new FormData();
    formData.append('file', file);
    return this.http.post<Task>(`${this.taskApiUrl}/${taskId}/upload-rendu`, formData);
  }

  analyzeTask(taskId: string): Observable<TaskReview> {
    return this.http.post<TaskReview>(`${this.taskApiUrl}/${taskId}/analyze`, {});
  }

  analyzeManual(taskId: string): Observable<TaskManualAnalysisResponse> {
    return this.http.post<TaskManualAnalysisResponse>(`${this.taskApiUrl}/${taskId}/analyze-manual`, {});
  }

  getProjectMembers(): Observable<DirectoryUser[]> {
    return this.http.get<DirectoryUser[]>(`${this.usersApiUrl}/team-members`).pipe(
      map((users) => users
        .map((user) => ({
          ...user,
          id: String(user.id),
          displayName: this.resolveDisplayName(user)
        }))
      )
    );
  }

  private resolveDisplayName(user: DirectoryUser): string {
    const firstName = user.firstName?.trim() ?? '';
    const lastName = user.lastName?.trim() ?? '';
    const fullName = `${firstName} ${lastName}`.trim();
    return fullName
      || user.displayName
      || user.name
      || user.username
      || user.email
      || `User ${user.id}`;
  }

  private normalizeKeywords(keywords: string[]): string[] {
    return [...new Set(keywords.map((keyword) => this.normalizeForMatching(keyword)).filter(Boolean))];
  }

  private containsAnyKeyword(normalizedDescription: string, keywords: string[]): boolean {
    return keywords.some((keyword) => this.containsKeyword(normalizedDescription, keyword));
  }

  private containsKeyword(normalizedDescription: string, keyword: string): boolean {
    if (!keyword) {
      return false;
    }

    if (keyword.includes(' ')) {
      return normalizedDescription.includes(keyword);
    }

    return (` ${normalizedDescription} `).includes(` ${keyword} `);
  }

  private normalizeForMatching(value: string): string {
    return value
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .replace(/[^\p{L}\p{N}]+/gu, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  }
}
