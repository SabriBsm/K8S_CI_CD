import { Component, OnInit } from '@angular/core';
import { MessageService } from 'primeng/api';
import { environment } from '../../../environments/environment';
import { ManagerReviewDecision, TaskReview } from '../../core/models/task-review.model';
import { Task, TaskStatus } from '../../core/models/task.model';
import { ReviewService } from './review.service';

@Component({
  selector: 'app-manager-reviews',
  templateUrl: './manager-reviews.component.html',
  styleUrl: './manager-reviews.component.scss'
})
export class ManagerReviewsComponent implements OnInit {
  reviews: TaskReview[] = [];
  loading = true;
  decidingReviewId: number | null = null;

  private readonly fileBaseUrl = environment.taskApiUrl;

  constructor(
    private reviewService: ReviewService,
    private messageService: MessageService
  ) {}

  ngOnInit(): void {
    this.loadReviews();
  }

  trackByReviewId(_: number, review: TaskReview): number {
    return review.id;
  }

  decide(review: TaskReview, decision: ManagerReviewDecision): void {
    this.decidingReviewId = review.id;
    this.reviewService.decide(review.id, decision).subscribe({
      next: () => {
        this.reviews = this.reviews.filter((item) => item.id !== review.id);
        this.decidingReviewId = null;
        this.messageService.add({
          severity: 'success',
          summary: 'Decision applied',
          detail: `Task "${review.task.title}" was moved to ${this.getDecisionLabel(decision)}.`
        });
      },
      error: () => {
        this.decidingReviewId = null;
      }
    });
  }

  getSuggestionClass(suggestion: TaskStatus): string {
    switch (suggestion) {
      case 'DONE':
        return 'suggestion-done';
      case 'IN_PROGRESS':
        return 'suggestion-in-progress';
      default:
        return 'suggestion-todo';
    }
  }

  getSuggestionLabel(suggestion: TaskStatus): string {
    switch (suggestion) {
      case 'DONE':
        return 'Ready for approval';
      case 'IN_PROGRESS':
        return 'Needs more work';
      default:
        return 'Not aligned yet';
    }
  }

  getDecisionLabel(decision: ManagerReviewDecision): string {
    switch (decision) {
      case 'DONE':
        return 'Done';
      case 'IN_PROGRESS':
        return 'In Progress';
      default:
        return 'To Do';
    }
  }

  resolveRenduUrl(task: Task): string | null {
    if (!task.renduFileUrl) {
      return null;
    }

    return task.renduFileUrl.startsWith('http')
      ? task.renduFileUrl
      : `${this.fileBaseUrl}${task.renduFileUrl}`;
  }

  isPdf(task: Task): boolean {
    return (task.renduType || '').toLowerCase().includes('pdf');
  }

  isImage(task: Task): boolean {
    return (task.renduType || '').toLowerCase().startsWith('image/');
  }

  isText(task: Task): boolean {
    return (task.renduType || '').toLowerCase().startsWith('text/');
  }

  private loadReviews(): void {
    this.loading = true;
    this.reviewService.getPendingReviews().subscribe({
      next: (reviews) => {
        this.reviews = reviews;
        this.loading = false;
      },
      error: () => {
        this.reviews = [];
        this.loading = false;
      }
    });
  }
}
