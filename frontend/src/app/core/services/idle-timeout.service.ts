import { Injectable, NgZone, OnDestroy } from '@angular/core';
import { fromEvent, merge, Subscription } from 'rxjs';
import { throttleTime } from 'rxjs/operators';
import { AuthService } from './auth.service';

@Injectable({ providedIn: 'root' })
export class IdleTimeoutService implements OnDestroy {
  private readonly idleMs = 5 * 60 * 1000;
  private timer: any = null;
  private sub: Subscription | null = null;

  constructor(
    private auth: AuthService,
    private zone: NgZone
  ) {}

  start(): void {
    if (this.sub) return;

    this.zone.runOutsideAngular(() => {
      const activity$ = merge(
        fromEvent(document, 'mousemove'),
        fromEvent(document, 'mousedown'),
        fromEvent(document, 'keydown'),
        fromEvent(document, 'scroll'),
        fromEvent(document, 'touchstart')
      ).pipe(throttleTime(1000, undefined, { leading: true, trailing: true }));

      this.sub = activity$.subscribe(() => this.resetTimer());
      this.resetTimer();
    });
  }

  stop(): void {
    this.clearTimer();
    this.sub?.unsubscribe();
    this.sub = null;
  }

  ngOnDestroy(): void {
    this.stop();
  }

  private resetTimer(): void {
    this.clearTimer();
    this.timer = setTimeout(() => {
      // Run inside Angular so Router navigation works reliably.
      this.zone.run(() => {
        if (this.auth.isAuthenticated()) {
          this.auth.logout();
        }
      });
    }, this.idleMs);
  }

  private clearTimer(): void {
    if (this.timer) {
      clearTimeout(this.timer);
      this.timer = null;
    }
  }
}

