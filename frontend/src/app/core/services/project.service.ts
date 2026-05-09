import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

export interface Project {
  id: number;
  name: string;
  description: string;
  objectives: string;
  startDate: string;
  endDate: string;
  actualEndDate?: string;
  progress: number;
  status: 'PLANNED' | 'IN_PROGRESS' | 'COMPLETED' | 'ON_HOLD' | 'CANCELLED';
  visibility: 'PRIVATE' | 'PUBLIC';
  createdBy: string;
  projectManagerId?: string;
  customerId?: string | null;
  updatedAt: string;
  aiRecommendation?: string;
  budgetId?: number;
  members?: ProjectMember[];
}

export interface ProjectMember {
  id: number;
  projectId: number;
  userId: string;
  role: string;
  joinedDate: string;
  isActive: boolean;
}

export type ProjectDocumentType =
  | 'SPECIFICATIONS'
  | 'ARCHITECTURE'
  | 'DESIGN'
  | 'TEST_PLAN'
  | 'DOCUMENTATION'
  | 'RELEASE_NOTES'
  | 'OTHER';

export interface ProjectDocument {
  id: number;
  project?: Project;
  name: string;
  description?: string;
  fileUrl: string;
  type: ProjectDocumentType;
  version: string;
  uploadedBy: string;
  uploadedAt: string;
}

export interface ProjectNotification {
  id: number;
  project?: Project;
  userId: number | string;
  message: string;
  type: string;
  isRead: boolean;
  createdAt: string;
}

export interface ProjectDashboardStats {
  scope: 'GLOBAL' | 'USER';
  userId?: string | null;
  totalProjects: number;
  activeProjects: number;
  completedProjects: number;
  delayedProjects: number;
  averageProgress: number;
  completionRate: number;
  projectsByStatus: Record<string, number>;

  totalMembers: number;
  activeMembers: number;
  membersByRole: Record<string, number>;

  totalMilestones: number;
  plannedMilestones: number;
  inProgressMilestones: number;
  achievedMilestones: number;
  missedMilestones: number;
  cancelledMilestones: number;
  criticalMilestones: number;
  overdueMilestones: number;
  milestonesByStatus: Record<string, number>;

  totalMeetings: number;
  upcomingMeetings: number;
  pastMeetings: number;
  meetingsByStatus: Record<string, number>;

  totalDocuments: number;
  documentsByType: Record<string, number>;

  totalNotifications: number;
  unreadNotifications: number;
  notificationsByType: Record<string, number>;

  generatedAt: string;
}

export interface ProjectMilestoneRequest {
  title: string;
  description: string;
  dueDate: string;
  status: string;
  isCritical: boolean;
  actualCompletionDate?: string;
}

@Injectable({
  providedIn: 'root'
})
export class ProjectService {
  private apiUrl = `${environment.projectApiUrl}/projects`;
  private projectDocumentApiUrl = `${environment.projectApiUrl}/project-documents`;

  constructor(private http: HttpClient) {}

  /**
   * Get all projects
   */
  getAllProjects(): Observable<Project[]> {
    return this.http.get<Project[]>(this.apiUrl);
  }

  /**
   * Get a project by ID
   */
  getProjectById(id: number): Observable<Project> {
    return this.http.get<Project>(`${this.apiUrl}/${id}`);
  }

  /**
   * Get all active customers (users with role CUSTOMER)
   */
  getCustomers(): Observable<any[]> {
    return this.http.get<any[]>(`${this.apiUrl}/customers`);
  }

  /**
   * Create a new project
   */
  createProject(project: Partial<Project>): Observable<Project> {
    return this.http.post<Project>(this.apiUrl, project);
  }

  createProjectMilestone(projectId: number, milestone: ProjectMilestoneRequest): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/${projectId}/milestones`, milestone);
  }

  /**
   * Update a project
   */
  updateProject(id: number, project: Partial<Project>): Observable<Project> {
    return this.http.put<Project>(`${this.apiUrl}/${id}`, project);
  }

  /**
   * Delete a project
   */
  deleteProject(id: number): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${id}`);
  }

  /**
   * Get projects by status
   */
  getProjectsByStatus(status: string): Observable<Project[]> {
    return this.http.get<Project[]>(`${this.apiUrl}/status/${status}`);
  }

  /**
   * Get projects by user (where user is creator, manager, or member)
   */
  getProjectsByUser(userId: string): Observable<Project[]> {
    return this.http.get<Project[]>(`${this.apiUrl}/user/${userId}`);
  }

  /**
   * Search projects by name and status
   */
  searchProjects(name?: string, status?: string, userId?: string): Observable<Project[]> {
    let queryParams = '';
    if (name) queryParams += `?name=${encodeURIComponent(name)}`;
    if (status) queryParams += (queryParams ? '&' : '?') + `status=${status}`;
    if (userId) queryParams += (queryParams ? '&' : '?') + `userId=${encodeURIComponent(userId)}`;
    return this.http.get<Project[]>(`${this.apiUrl}/search${queryParams}`);
  }

  /**
   * Advanced search with multiple filters
   */
  advancedSearchProjects(filters: any, userId?: string): Observable<Project[]> {
    let queryParams = new URLSearchParams();
    const normalizedCustomer = this.normalizeQueryValue(filters?.customer);
    const normalizedCreatedBy = this.normalizeQueryValue(filters?.createdBy);
    const normalizedSort = this.normalizeAdvancedSort(filters?.sortBy, filters?.sortDirection);

    if (this.normalizeQueryValue(filters?.name)) queryParams.append('name', this.normalizeQueryValue(filters?.name)!);
    if (this.normalizeQueryValue(filters?.status)) queryParams.append('status', this.normalizeQueryValue(filters?.status)!);
    if (this.normalizeQueryValue(filters?.description)) queryParams.append('description', this.normalizeQueryValue(filters?.description)!);
    if (normalizedCustomer) queryParams.append('customer', normalizedCustomer);
    if (normalizedCreatedBy) queryParams.append('createdBy', normalizedCreatedBy);
    if (filters.minProgress !== undefined && filters.minProgress !== null) queryParams.append('minProgress', filters.minProgress);
    if (filters.maxProgress !== undefined && filters.maxProgress !== null) queryParams.append('maxProgress', filters.maxProgress);
    if (filters.startDateFrom) queryParams.append('startDateFrom', this.formatDateForBackend(filters.startDateFrom));
    if (filters.startDateTo) queryParams.append('startDateTo', this.formatDateForBackend(filters.startDateTo));
    if (filters.delayedOnly) queryParams.append('delayedOnly', 'true');
    queryParams.append('sortBy', normalizedSort.sortBy);
    queryParams.append('sortDirection', normalizedSort.sortDirection);
    if (userId) queryParams.append('userId', userId);

    const params = queryParams.toString() ? `?${queryParams.toString()}` : '';
    return this.http.get<Project[]>(`${this.apiUrl}/search/advanced${params}`);
  }

  /**
   * Format date for backend (YYYY-MM-DD)
   */
  private formatDateForBackend(date: any): string {
    if (typeof date === 'string') return date;
    if (date instanceof Date) {
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');
      return `${year}-${month}-${day}`;
    }
    return '';
  }

  private normalizeQueryValue(value: any): string | null {
    if (value == null) {
      return null;
    }

    if (typeof value === 'string') {
      const trimmed = value.trim();
      return trimmed || null;
    }

    if (typeof value === 'object') {
      const candidate = value.id ?? value.username ?? value.email ?? value.fullName ?? '';
      const normalized = String(candidate).trim();
      return normalized || null;
    }

    const normalized = String(value).trim();
    return normalized || null;
  }

  private normalizeAdvancedSort(sortBy: any, sortDirection: any): { sortBy: string; sortDirection: 'ASC' | 'DESC' } {
    const requestedSort = (sortBy || 'CREATED_DATE').toString().trim().toUpperCase();
    const requestedDirection = (sortDirection || 'DESC').toString().trim().toUpperCase() === 'ASC' ? 'ASC' : 'DESC';

    switch (requestedSort) {
      case 'CREATED_DATE_ASC':
        return { sortBy: 'CREATED_DATE', sortDirection: 'ASC' };
      case 'NAME_DESC':
        return { sortBy: 'NAME', sortDirection: 'DESC' };
      case 'START_DATE_DESC':
        return { sortBy: 'START_DATE', sortDirection: 'DESC' };
      case 'PROGRESS_ASC':
        return { sortBy: 'PROGRESS', sortDirection: 'ASC' };
      case 'UPDATED_DATE':
        return { sortBy: 'CREATED_DATE', sortDirection: requestedDirection };
      case 'NAME':
      case 'PROGRESS':
      case 'STATUS':
      case 'START_DATE':
      case 'END_DATE':
      case 'CREATED_DATE':
        return { sortBy: requestedSort, sortDirection: requestedDirection };
      default:
        return { sortBy: 'CREATED_DATE', sortDirection: requestedDirection };
    }
  }

  /**
   * Get projects where user is manager
   */
  getMyManagedProjects(): Observable<Project[]> {
    return this.http.get<Project[]>(`${this.apiUrl}/my-projects`);
  }

  /**
   * Get delayed projects
   */
  getDelayedProjects(): Observable<Project[]> {
    return this.http.get<Project[]>(`${this.apiUrl}/delayed`);
  }

  /**
   * Get average progress
   */
  getAverageProgress(): Observable<number> {
    return this.http.get<number>(`${this.apiUrl}/stats/average-progress`);
  }

  getDashboardStats(userId?: string, period: string = '30D'): Observable<ProjectDashboardStats> {
    const params = new URLSearchParams();
    if (userId) params.set('userId', userId);
    if (period) params.set('period', period);
    const query = params.toString();
    const url = query ? `${this.apiUrl}/dashboard?${query}` : `${this.apiUrl}/dashboard`;
    return this.http.get<ProjectDashboardStats>(url);
  }

  // ============================================
  // PROJECT MEMBERS
  // ============================================

  /**
   * Add a user to a project by user id
   */
  addProjectMember(projectId: number, userEmail: string): Observable<any> {
    return this.http.post(`${this.apiUrl}/members`, {
      projectId,
      userEmail
    });
  }

  /**
   * Remove a user from a project
   */
  removeProjectMember(projectId: number, userId: string): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/members?projectId=${projectId}&userId=${userId}`);
  }

  /**
   * Get project members
   */
  getProjectMembers(projectId: number): Observable<any[]> {
    return this.http.get<any[]>(`${this.apiUrl}/members/project/${projectId}`);
  }

  /**
   * Get user project memberships
   */
  getUserProjectsMembership(userId: string): Observable<any[]> {
    return this.http.get<any[]>(`${this.apiUrl}/members/user/${userId}`);
  }

  /**
   * Assign a project manager
   */
  assignProjectManager(projectId: number, userId: string): Observable<void> {
    return this.http.put<void>(`${this.apiUrl}/members/project-manager/${projectId}/${userId}`, {});
  }

  /**
   * Update a member's role
   */
  updateMemberRole(projectId: number, userId: string, newRole: string): Observable<any> {
    return this.http.put<any>(`${this.apiUrl}/members/role?projectId=${projectId}&userId=${userId}&newRole=${newRole}`, {});
  }

  // ============================================
  // PROJECT DOCUMENTS
  // ============================================

  getProjectDocuments(projectId: number): Observable<ProjectDocument[]> {
    return this.http.get<ProjectDocument[]>(`${this.projectDocumentApiUrl}/project/${projectId}`);
  }

  createProjectDocument(document: Partial<ProjectDocument> & { projectId: number }): Observable<ProjectDocument> {
    return this.http.post<ProjectDocument>(this.projectDocumentApiUrl, document);
  }

  updateProjectDocument(id: number, document: Partial<ProjectDocument> & { projectId?: number }): Observable<ProjectDocument> {
    return this.http.put<ProjectDocument>(`${this.projectDocumentApiUrl}/${id}`, document);
  }

  deleteProjectDocument(id: number): Observable<void> {
    return this.http.delete<void>(`${this.projectDocumentApiUrl}/${id}`);
  }

  // ============================================
  // PROJECT NOTIFICATIONS & AI
  // ============================================

  getProjectNotifications(projectId: number): Observable<any[]> {
    return this.http.get<any[]>(`${environment.projectApiUrl}/project-notifications/project/${projectId}`);
  }

  getUnreadNotificationsByUser(userId: number | string): Observable<ProjectNotification[]> {
    return this.http.get<ProjectNotification[]>(`${environment.projectApiUrl}/project-notifications/user/${userId}/unread`);
  }

  getNotificationsByUser(userId: number | string): Observable<ProjectNotification[]> {
    return this.http.get<ProjectNotification[]>(`${environment.projectApiUrl}/project-notifications/user/${userId}`);
  }

  markNotificationAsRead(notificationId: number): Observable<void> {
    return this.http.put<void>(`${environment.projectApiUrl}/project-notifications/${notificationId}/mark-read`, {});
  }

  markAllNotificationsAsReadByUser(userId: number | string): Observable<void> {
    return this.http.put<void>(`${environment.projectApiUrl}/project-notifications/user/${userId}/mark-all-read`, {});
  }

  notifyProjectNotificationByEmail(notificationId: number): Observable<void> {
    return this.http.post<void>(`${environment.projectApiUrl}/project-notifications/${notificationId}/notify-email`, {});
  }

  getProjectSummary(projectId: number): Observable<string> {
    return this.http.get(`${environment.projectApiUrl}/projects/${projectId}/summary`, { responseType: 'text' });
  }
}
