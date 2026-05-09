import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { ManagerReviewDecision, TaskReview } from '../../core/models/task-review.model';

@Injectable({ providedIn: 'root' })
export class ReviewService {
  private readonly apiUrl = `${environment.taskApiUrl}/reviews`;

  constructor(private http: HttpClient) {}

  getPendingReviews(): Observable<TaskReview[]> {
    return this.http.get<TaskReview[]>(`${this.apiUrl}/pending`);
  }

  decide(reviewId: number, decision: ManagerReviewDecision): Observable<TaskReview> {
    const params = new HttpParams().set('decision', decision);
    return this.http.post<TaskReview>(`${this.apiUrl}/${reviewId}/decision`, null, { params });
  }
}
