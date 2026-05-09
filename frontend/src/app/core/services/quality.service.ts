import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { map, Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { QualityProjectRef, QualityStandard, QualityStandardRequest } from '../../features/quality/models/quality.models';

@Injectable({ providedIn: 'root' })
export class QualityService {
  private readonly qualityApiUrl = `${environment.qualityApiUrl}/standards`;
  private readonly projectsApiUrl = `${environment.projectApiUrl}/projects`;

  constructor(private http: HttpClient) {}

  getStandards(): Observable<QualityStandard[]> {
    return this.http.get<QualityStandard[]>(this.qualityApiUrl);
  }

  createStandard(payload: QualityStandardRequest): Observable<QualityStandard> {
    return this.http.post<QualityStandard>(this.qualityApiUrl, payload);
  }

  updateStandard(id: number, payload: QualityStandardRequest): Observable<QualityStandard> {
    return this.http.put<QualityStandard>(`${this.qualityApiUrl}/${id}`, payload);
  }

  deleteStandard(id: number): Observable<void> {
    return this.http.delete<void>(`${this.qualityApiUrl}/${id}`);
  }

  getProjects(): Observable<QualityProjectRef[]> {
    return this.http.get<QualityProjectRef[] | { content?: QualityProjectRef[] }>(this.projectsApiUrl).pipe(
      map((response) => Array.isArray(response) ? response : response.content ?? []),
      map((projects) => projects
        .filter((project): project is QualityProjectRef => !!project?.id && !!project?.name)
        .map((project) => ({ id: project.id, name: project.name })))
    );
  }
}
