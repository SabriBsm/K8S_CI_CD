import { Injectable } from '@angular/core';
import { AuthService } from './auth.service';
import { UserRole } from '../models/auth.model';

type TaskRole = UserRole
  | 'MANAGER'
  | 'TEAM_MEMBER'
  | 'CLIENT'
  | 'ROLE_MANAGER'
  | 'ROLE_TEAM_MEMBER'
  | 'ROLE_CLIENT'
  | 'EMPLOYEE'
  | 'ROLE_EMPLOYEE'
  | null
  | undefined;

@Injectable({ providedIn: 'root' })
export class RoleHelperService {
  constructor(private authService: AuthService) {}

  isManager(role: TaskRole = this.authService.getRole()): boolean {
    return role === 'ADMIN' || role === 'PROJECT_MANAGER' || role === 'MANAGER';
  }

  isTeamMember(role: TaskRole = this.authService.getRole()): boolean {
    return role === 'PROJECT_MEMBER'
      || role === 'TEAM_MEMBER'
      || role === 'ROLE_TEAM_MEMBER'
      || role === 'EMPLOYEE'
      || role === 'ROLE_EMPLOYEE';
  }

  isEmployee(role: TaskRole = this.authService.getRole()): boolean {
    return this.isTeamMember(role);
  }

  isClient(role: TaskRole = this.authService.getRole()): boolean {
    return role === 'CUSTOMER' || role === 'CLIENT';
  }

  getRoleLabel(role: TaskRole = this.authService.getRole()): string {
    if (this.isManager(role)) {
      return 'Manager';
    }
    if (this.isEmployee(role)) {
      return 'Team Member';
    }
    if (this.isClient(role)) {
      return 'Client';
    }
    return 'User';
  }
}
