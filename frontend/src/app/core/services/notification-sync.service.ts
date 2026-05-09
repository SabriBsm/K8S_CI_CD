import { Injectable } from '@angular/core';
import { Subject } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class NotificationSyncService {
  private readonly refreshSubject = new Subject<void>();

  readonly notificationsChanged$ = this.refreshSubject.asObservable();

  requestNotificationRefresh(): void {
    this.refreshSubject.next();
  }
}
