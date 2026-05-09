import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { StorageService } from '../services/storage.service';
import { AuthService } from '../services/auth.service';

function isAuthEndpoint(url: string): boolean {
  return url.includes('/api/auth/login')
    || url.includes('/api/auth/register')
    || url.includes('/api/auth/refresh')
    || url.includes('/api/auth/forgot-password')
    || url.includes('/api/auth/reset-password');
}

export const jwtInterceptor: HttpInterceptorFn = (req, next) => {
  const storage = inject(StorageService);
  const authService = inject(AuthService);

  if (isAuthEndpoint(req.url)) {
    return next(req);
  }

  const token = storage.getToken();
  const currentUser = authService.getCurrentUser();

  let headers: any = {};

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  // Add X-User-Id header for backend identification
  if (currentUser && currentUser.id) {
    const userId = currentUser.id.toString();
    headers['X-User-Id'] = userId;
    headers['X-PlanSync-User-Id'] = userId;
  }

  if (currentUser?.email) {
    headers['X-PlanSync-User-Email'] = currentUser.email;
    if (!req.headers.has('X-Username')) {
      headers['X-Username'] = currentUser.email;
    }
  }

  if (currentUser?.role) {
    headers['X-PlanSync-User-Role'] = currentUser.role.toString();
    if (!req.headers.has('X-Roles')) {
      headers['X-Roles'] = currentUser.role.toString();
    }
  }

  if (Object.keys(headers).length > 0) {
    req = req.clone({
      setHeaders: headers
    });
  }

  return next(req);
};
