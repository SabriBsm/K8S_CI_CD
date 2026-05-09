import { HttpContextToken, HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, throwError } from 'rxjs';
import { MessageService } from 'primeng/api';
import { StorageService } from '../services/storage.service';

let lastSessionWarningAt = 0;

export const SKIP_GLOBAL_ERROR_TOAST = new HttpContextToken<boolean>(() => false);

function isAuthEndpoint(url: string): boolean {
  return url.includes('/api/auth/login')
    || url.includes('/api/auth/register')
    || url.includes('/api/auth/refresh')
    || url.includes('/api/auth/forgot-password')
    || url.includes('/api/auth/reset-password');
}

function showSessionWarning(messageService: MessageService): void {
  const now = Date.now();
  if (now - lastSessionWarningAt < 3000) {
    return;
  }

  lastSessionWarningAt = now;
  messageService.add({
    severity: 'warn',
    summary: 'Session expiree',
    detail: 'Votre session a expire ou vous n etes pas authentifie. Veuillez vous reconnecter.',
    life: 4000
  });
}

export const errorInterceptor: HttpInterceptorFn = (req, next) => {
  const router = inject(Router);
  const storage = inject(StorageService);
  const messageService = inject(MessageService);

  return next(req).pipe(
    catchError((error: HttpErrorResponse) => {
      if (req.context.get(SKIP_GLOBAL_ERROR_TOAST)) {
        return throwError(() => error);
      }

      if (error.status === 401) {
        if (isAuthEndpoint(req.url)) {
          showSessionWarning(messageService);
          storage.clearTokens();
          router.navigate(['/auth/login']);
        }
      } else if (error.status === 403) {
        messageService.add({
          severity: 'error',
          summary: 'Access Denied',
          detail: 'You do not have permission to perform this action.',
          life: 4000
        });
      } else if (error.status >= 500) {
        messageService.add({
          severity: 'error',
          summary: 'Server Error',
          detail: 'An unexpected server error occurred. Please try again later.',
          life: 5000
        });
      }
      return throwError(() => error);
    })
  );
};
