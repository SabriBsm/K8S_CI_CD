export type UserRole =
  | 'ADMIN'
  | 'PROJECT_MANAGER'
  | 'PROJECT_MEMBER'
  | 'CUSTOMER'
  | 'MANAGER'
  | 'TEAM_MEMBER'
  | 'CLIENT'
  | 'ROLE_MANAGER'
  | 'ROLE_TEAM_MEMBER'
  | 'ROLE_CLIENT';

export interface LoginRequest {
  email: string;
  password: string;
}

export interface RegisterRequest {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  role?: UserRole;
}

export interface ForgotPasswordRequest {
  email: string;
}

export interface ResetPasswordRequest {
  newPassword: string;
  token: string;
}

export interface AuthResponse {
  accessToken: string;
  refreshToken: string;
  tokenType: string;
  expiresIn: number;
  user: AuthUser;
}

export interface AuthUser {
  id: number;
  email: string;
  firstName: string;
  lastName: string;
  role: UserRole;
  avatar?: string;
  avatarUrl?: string;
  phoneNumber?: string;
  jobTitle?: string;
  department?: string;
  lastLoginAt?: string;
  totalAppUsageSeconds?: number;
}
