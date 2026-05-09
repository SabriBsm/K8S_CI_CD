import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { environment } from '../../../environments/environment';

export enum MilestoneStatus {
  PENDING = 'PENDING',
  IN_PROGRESS = 'IN_PROGRESS',
  ACHIEVED = 'ACHIEVED',
  MISSED = 'MISSED',
  CANCELLED = 'CANCELLED'
}

export interface Milestone {
  id: number;
  projectId: number;
  title: string;
  description: string;
  dueDate: string;
  completionDate?: string;
  actualCompletionDate?: string;
  status: MilestoneStatus;
  isCritical: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface MilestoneRequest {
  projectId: number;
  title: string;
  description: string;
  dueDate: string;
  status: MilestoneStatus;
  isCritical: boolean;
  actualCompletionDate?: string;
}

type ApiMilestoneRequest = Omit<MilestoneRequest, 'status'> & {
  status: string;
};

@Injectable({
  providedIn: 'root'
})
export class MilestoneService {
  private apiUrl = `${environment.projectApiUrl}/milestones`;

  constructor(private http: HttpClient) {}

  getAll(): Observable<Milestone[]> {
    return this.http.get<Milestone[]>(this.apiUrl).pipe(map(milestones => this.normalizeMilestones(milestones)));
  }

  getById(id: number): Observable<Milestone> {
    return this.http.get<Milestone>(`${this.apiUrl}/${id}`).pipe(map(milestone => this.normalizeMilestone(milestone)));
  }

  getByProject(projectId: number): Observable<Milestone[]> {
    return this.http.get<Milestone[]>(`${this.apiUrl}/project/${projectId}`).pipe(map(milestones => this.normalizeMilestones(milestones)));
  }

  create(milestone: MilestoneRequest): Observable<Milestone> {
    return this.http.post<Milestone>(this.apiUrl, this.toApiRequest(milestone)).pipe(map(saved => this.normalizeMilestone(saved)));
  }

  update(id: number, milestone: MilestoneRequest): Observable<Milestone> {
    return this.http.put<Milestone>(`${this.apiUrl}/${id}`, this.toApiRequest(milestone)).pipe(map(updated => this.normalizeMilestone(updated)));
  }

  delete(id: number): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${id}`);
  }

  markAsAchieved(id: number, actualCompletionDate: string): Observable<Milestone> {
    return this.http.put<Milestone>(`${this.apiUrl}/${id}/achieved`, null, {
      params: { actualCompletionDate }
    }).pipe(map(milestone => this.normalizeMilestone(milestone)));
  }

  updateStatus(id: number, status: MilestoneStatus): Observable<Milestone> {
    return this.http.put<Milestone>(`${this.apiUrl}/${id}/status/${this.toApiStatus(status)}`, null).pipe(map(milestone => this.normalizeMilestone(milestone)));
  }

  private toApiRequest(milestone: MilestoneRequest): ApiMilestoneRequest {
    return {
      ...milestone,
      status: this.toApiStatus(milestone.status),
      actualCompletionDate: milestone.actualCompletionDate
    };
  }

  private normalizeMilestones(milestones: Milestone[] | null | undefined): Milestone[] {
    return (milestones || []).map(milestone => this.normalizeMilestone(milestone));
  }

  private normalizeMilestone(milestone: Milestone | null | undefined): Milestone {
    if (!milestone) {
      return milestone as unknown as Milestone;
    }

    const actualCompletionDate = milestone.actualCompletionDate || milestone.completionDate;
    return {
      ...milestone,
      status: this.fromApiStatus(milestone.status),
      completionDate: actualCompletionDate,
      actualCompletionDate
    };
  }

  private toApiStatus(status?: MilestoneStatus | string): MilestoneStatus | string {
    switch (status) {
      case MilestoneStatus.PENDING:
      case MilestoneStatus.IN_PROGRESS:
      case MilestoneStatus.ACHIEVED:
      case MilestoneStatus.MISSED:
      case MilestoneStatus.CANCELLED:
        return status;
      case 'PLANNED':
        return MilestoneStatus.PENDING;
      case 'COMPLETED':
        return MilestoneStatus.ACHIEVED;
      case 'DELAYED':
        return MilestoneStatus.MISSED;
      default:
        return status || MilestoneStatus.PENDING;
    }
  }

  private fromApiStatus(status?: string): MilestoneStatus {
    switch (status) {
      case 'PENDING':
      case 'PLANNED':
        return MilestoneStatus.PENDING;
      case 'IN_PROGRESS':
        return MilestoneStatus.IN_PROGRESS;
      case 'ACHIEVED':
      case 'COMPLETED':
        return MilestoneStatus.ACHIEVED;
      case 'MISSED':
      case 'DELAYED':
        return MilestoneStatus.MISSED;
      case 'CANCELLED':
        return MilestoneStatus.CANCELLED;
      default:
        return (status as MilestoneStatus) || MilestoneStatus.PENDING;
    }
  }
}
