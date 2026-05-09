import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

export interface AiGenerateRequest {
  ticketId?: number;
  title: string;
  description?: string;
  category: string;
  priority: string;
  status: string;
  submittedBy?: string;
  assignedTo?: string;
  previousResponses?: string[];
  additionalContext?: string;
}

export interface AiGenerateResponse {
  generatedText: string;
  model: string;
  tokensUsed: number;
}

@Injectable({ providedIn: 'root' })
export class AiService {
  private readonly api = environment.ticketApiUrl;

  constructor(private http: HttpClient) {}

  generateTicketResponse(request: AiGenerateRequest): Observable<AiGenerateResponse> {
    return this.http.post<AiGenerateResponse>(`${this.api}/ai/generate-response`, request);
  }
}
