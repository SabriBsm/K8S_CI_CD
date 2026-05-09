import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../services/auth.service';
import { UserRole } from '../models/auth.model';

export const roleGuard: CanActivateFn = (route) => {
  const auth = inject(AuthService);
  const router = inject(Router);

  const allowedRoles: UserRole[] = route.data?.['roles'] ?? [];

  if (!auth.isAuthenticated()) {
    router.navigate(['/auth/login']);
    return false;
  }

  if (allowedRoles.length === 0 || auth.hasRole(allowedRoles)) return true;

  router.navigate(['/dashboard']);
  return false;
};
