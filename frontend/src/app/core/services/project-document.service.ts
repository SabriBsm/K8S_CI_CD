import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { ProjectDocument, ProjectDocumentForm } from '../models/project-document.model';

@Injectable({ providedIn: 'root' })
export class ProjectDocumentService {
  private readonly apiUrl = `${environment.projectApiUrl}/project-documents`;

  constructor(private http: HttpClient) {}


  getByProject(projectId: number): Observable<ProjectDocument[]> {
    return this.http.get<ProjectDocument[]>(`${this.apiUrl}/project/${projectId}`);
  }

  create(projectId: number, document: ProjectDocumentForm): Observable<ProjectDocument> {
    return this.http.post<ProjectDocument>(this.apiUrl, {
      projectId,
      ...document
    });
  }

  update(id: number, projectId: number, document: ProjectDocumentForm): Observable<ProjectDocument> {
    return this.http.put<ProjectDocument>(`${this.apiUrl}/${id}`, {
      projectId,
      ...document
    });
  }

  delete(id: number): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${id}`);
  }
}

