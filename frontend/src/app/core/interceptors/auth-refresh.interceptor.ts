import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, finalize, switchMap, throwError, shareReplay } from 'rxjs';
import { AuthService } from '../services/auth.service';
import { StorageService } from '../services/storage.service';

let refreshInFlight$:
  | import('rxjs').Observable<import('../models/auth.model').AuthResponse>
  | null = null;

function isAuthEndpoint(url: string): boolean {
  return url.includes('/api/auth/login')
    || url.includes('/api/auth/register')
    || url.includes('/api/auth/refresh')
    || url.includes('/api/auth/forgot-password')
    || url.includes('/api/auth/reset-password');
}

export const authRefreshInterceptor: HttpInterceptorFn = (req, next) => {
  const auth = inject(AuthService);
  const storage = inject(StorageService);
  const router = inject(Router);

  return next(req).pipe(
    catchError((err: HttpErrorResponse) => {
      if (err.status !== 401) return throwError(() => err);

      // Avoid infinite loops and keep auth endpoints simple.
      if (isAuthEndpoint(req.url)) return throwError(() => err);

      const refreshToken = storage.getRefreshToken();
      if (!refreshToken) {
        return throwError(() => err);
      }

      if (!refreshInFlight$) {
        refreshInFlight$ = auth.refresh().pipe(
          shareReplay(1),
          finalize(() => {
            refreshInFlight$ = null;
          })
        );
      }

      return refreshInFlight$.pipe(
        switchMap(() => {
          const token = storage.getToken();
          const currentUser = auth.getCurrentUser();
          const headers: Record<string, string> = {};

          if (token) {
            headers['Authorization'] = `Bearer ${token}`;
          }

          // Keep user context on retried requests (required by several backend endpoints).
          if (currentUser?.id) {
            headers['X-User-Id'] = currentUser.id.toString();
          }

          const retryReq = Object.keys(headers).length > 0 ? req.clone({ setHeaders: headers }) : req;
          return next(retryReq);
        }),
        catchError((refreshErr) => {
          auth.logout();
          // Ensure we're on login even if logout navigation was blocked.
          router.navigate(['/auth/login']);
          return throwError(() => refreshErr);
        })
      );
    })
  );
};
