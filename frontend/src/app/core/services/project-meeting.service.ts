import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

export interface ProjectMeeting {
  id: number;
  projectId: number;
  project?: {
    id: number;
    name?: string;
  };
  title: string;
  description: string;
  meetingDate: string;
  startTime: string;
  endTime: string;
  location: string; // 'ONLINE' or physical address
  meetingLink?: string;
  createdBy: string;
  status: 'SCHEDULED' | 'COMPLETED' | 'CANCELLED';
  createdAt?: string;
  updatedAt?: string;
}

export interface ProjectMeetingRequest {
  projectId: number;
  title: string;
  description: string;
  meetingDate: string;
  startTime: string;
  endTime: string;
  location: string;
  meetingLink?: string;
  createdBy: string;
  status: string;
}

@Injectable({
  providedIn: 'root'
})
export class ProjectMeetingService {
  private apiUrl = `${environment.projectApiUrl}/project-meetings`;

  constructor(private http: HttpClient) {}

  getAll(): Observable<ProjectMeeting[]> {
    return this.http.get<ProjectMeeting[]>(this.apiUrl);
  }

  getById(id: number): Observable<ProjectMeeting> {
    return this.http.get<ProjectMeeting>(`${this.apiUrl}/${id}`);
  }

  getByProject(projectId: number): Observable<ProjectMeeting[]> {
    return this.http.get<ProjectMeeting[]>(`${this.apiUrl}/project/${projectId}`);
  }

  getUpcomingByProject(projectId: number): Observable<ProjectMeeting[]> {
    return this.http.get<ProjectMeeting[]>(`${this.apiUrl}/project/${projectId}/upcoming`);
  }

  getPastByProject(projectId: number): Observable<ProjectMeeting[]> {
    return this.http.get<ProjectMeeting[]>(`${this.apiUrl}/project/${projectId}/past`);
  }

  create(meeting: ProjectMeetingRequest): Observable<ProjectMeeting> {
    return this.http.post<ProjectMeeting>(this.apiUrl, meeting);
  }

  update(id: number, meeting: ProjectMeetingRequest): Observable<ProjectMeeting> {
    return this.http.put<ProjectMeeting>(`${this.apiUrl}/${id}`, meeting);
  }

  delete(id: number): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${id}`);
  }
}
