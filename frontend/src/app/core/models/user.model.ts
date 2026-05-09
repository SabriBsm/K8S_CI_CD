import { UserRole } from './auth.model';

export type UserStatus = 'ACTIVE' | 'INACTIVE' | 'PENDING' | 'SUSPENDED';

export interface User {
  id: number;
  firstName: string;
  lastName: string;
  email: string;
  role: UserRole;
  status: UserStatus;
  avatarUrl?: string;
  avatar?: string;
  phoneNumber?: string;
  phone?: string;
  department?: string;
  jobTitle?: string;
  createdAt: string;
  updatedAt: string;
  lastLoginAt?: string;
  totalAppUsageSeconds?: number;
}

export interface CreateUserRequest {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  role: UserRole;
  department?: string;
  jobTitle?: string;
  phoneNumber?: string;
}

export interface UpdateUserRequest {
  firstName?: string;
  lastName?: string;
  avatarUrl?: string;
  phoneNumber?: string;
  status?: UserStatus;
  role?: UserRole;
  department?: string;
  jobTitle?: string;
  timezone?: string;
  language?: string;
  mfaEnabled?: boolean;
}

export interface UserPageResponse {
  content: User[];
  totalElements: number;
  totalPages: number;
  size: number;
  number: number;
}
