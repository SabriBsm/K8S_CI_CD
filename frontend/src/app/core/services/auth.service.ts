import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { BehaviorSubject, catchError, from, Observable, of, tap, throwError } from 'rxjs';
import { environment } from '../../../environments/environment';
import { AuthResponse, AuthUser, LoginRequest, RegisterRequest, UserRole } from '../models/auth.model';
import { StorageService } from './storage.service';
import { resolveAvatarUrl } from '../utils/avatar-url.util';
import { SessionUsageRequest, UserService } from './user.service';

// Mock users available when the backend is offline (dev mode)
const MOCK_USERS: Record<string, AuthUser & { password: string }> = {
  'admin@plansync.io': {
    id: 1, email: 'admin@plansync.io', firstName: 'Alice', lastName: 'Martin',
    role: 'ADMIN', password: 'admin123'
  },
  'pm@plansync.io': {
    id: 2, email: 'pm@plansync.io', firstName: 'Bob', lastName: 'Johnson',
    role: 'PROJECT_MANAGER', password: 'pm123456'
  },
  'dev@plansync.io': {
    id: 3, email: 'dev@plansync.io', firstName: 'Carol', lastName: 'Smith',
    role: 'PROJECT_MEMBER', password: 'dev123456'
  },
  'client@plansync.io': {
    id: 4, email: 'client@plansync.io', firstName: 'Emma', lastName: 'Wilson',
    role: 'CUSTOMER', password: 'client123'
  }
};

// Must match backend default JWT secret (or JWT_SECRET env var) so dev-mode mock tokens are accepted.
const DEV_JWT_SECRET_BASE64 = 'ZGV2LWNoYW5nZS1tZS0zMi1ieXRlcy1taW5pbXVtLXNlY3JldA==';

function toBase64Url(value: string | ArrayBuffer): string {
  const bytes = typeof value === 'string' ? new TextEncoder().encode(value) : new Uint8Array(value);
  let binary = '';
  bytes.forEach(byte => {
    binary += String.fromCharCode(byte);
  });
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
}

function fromBase64(base64: string): Uint8Array {
  const normalized = base64.replace(/-/g, '+').replace(/_/g, '/');
  const binary = atob(normalized);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

async function signDevJwt(claims: Record<string, unknown>, expiresInSeconds: number): Promise<string> {
  const header = { alg: 'HS256', typ: 'JWT' };
  const now = Math.floor(Date.now() / 1000);
  const payload = {
    iss: 'plansync',
    iat: now,
    exp: now + expiresInSeconds,
    ...claims
  };

  const encodedHeader = toBase64Url(JSON.stringify(header));
  const encodedPayload = toBase64Url(JSON.stringify(payload));
  const unsignedToken = `${encodedHeader}.${encodedPayload}`;

  const secretKey = await crypto.subtle.importKey(
    'raw',
    fromBase64(DEV_JWT_SECRET_BASE64),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
  const signature = await crypto.subtle.sign('HMAC', secretKey, new TextEncoder().encode(unsignedToken));
  return `${unsignedToken}.${toBase64Url(signature)}`;
}

async function buildMockResponse(user: AuthUser): Promise<AuthResponse> {
  const nowIso = new Date().toISOString();
  const accessToken = await signDevJwt(
    {
      sub: String(user.id),
      typ: 'access',
      email: user.email,
      username: `${user.firstName ?? ''} ${user.lastName ?? ''}`.trim() || user.email,
      roles: [user.role]
    },
    3600
  );
  const refreshToken = await signDevJwt(
    {
      sub: String(user.id),
      typ: 'refresh',
      email: user.email,
      username: `${user.firstName ?? ''} ${user.lastName ?? ''}`.trim() || user.email,
      roles: [user.role]
    },
    30 * 24 * 60 * 60
  );

  return {
    accessToken,
    refreshToken,
    tokenType: 'Bearer',
    expiresIn: 3600,
    user: {
      ...user,
      lastLoginAt: nowIso,
      totalAppUsageSeconds: user.totalAppUsageSeconds ?? 0
    }
  };
}

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly apiUrl = `${environment.apiUrl}/auth`;
  private readonly usersApiUrl = `${environment.apiUrl}/users`;
  private readonly CURRENT_USER_KEY = 'plansync_current_user';
  private readonly CURRENT_SESSION_START_KEY = 'plansync_session_started_at';

  private currentUserSubject = new BehaviorSubject<AuthUser | null>(null);
  currentUser$ = this.currentUserSubject.asObservable();

  constructor(
    private http: HttpClient,
    private router: Router,
    private storage: StorageService,
    private userService: UserService
  ) {
    const stored = this.storage.get<AuthUser>(this.CURRENT_USER_KEY);
    if (stored && this.storage.getToken()) {
      this.currentUserSubject.next(this.normalizeAuthUser(stored));
      if (!this.getSessionStartMs()) {
        this.setSessionStart(Date.now(), this.isRememberMeMode());
      }
    }
  }

  login(request: LoginRequest, rememberMe: boolean): Observable<AuthResponse> {
    return this.http.post<AuthResponse>(`${this.apiUrl}/login`, request).pipe(
      tap(res => this.handleAuthResponse(res, rememberMe)),
      catchError((err: any) => {
        // Backend offline -> try mock credentials (dev mode)
        if (err?.status === 0) {
          const mock = MOCK_USERS[request.email];
          if (mock && mock.password === request.password) {
            const { password, ...user } = mock;
            return from(buildMockResponse(user)).pipe(
              tap(res => this.handleAuthResponse(res, rememberMe))
            );
          }
          return throwError(() => new Error('Backend offline'));
        }

        // Propagate real backend error (400/401/500...) so UI can show the real reason.
        return throwError(() => err);
      })
    );
  }

  register(request: RegisterRequest): Observable<AuthResponse> {
    return this.http.post<AuthResponse>(`${this.apiUrl}/register`, request).pipe(
      tap(res => this.handleAuthResponse(res, false)),
      catchError(() => {
        // Backend offline → auto-register as mock user
        const user: AuthUser = {
          id:        Math.floor(Math.random() * 900) + 100,
          email:     request.email,
          firstName: request.firstName,
          lastName:  request.lastName,
          role:      request.role ?? 'PROJECT_MEMBER'
        };
        return from(buildMockResponse(user)).pipe(
          tap(res => this.handleAuthResponse(res, false))
        );
      })
    );
  }

  forgotPassword(email: string): Observable<void> {
    return this.http.post<void>(`${this.apiUrl}/forgot-password`, { email });
  }

  resetPassword(request: { newPassword: string; token: string }): Observable<void> {
    return this.http.post<void>(`${this.apiUrl}/reset-password`, request);
  }

  refresh(): Observable<AuthResponse> {
    const refreshToken = this.storage.getRefreshToken();
    if (!refreshToken) {
      return throwError(() => new Error('Missing refresh token'));
    }

    return this.http.post<AuthResponse>(`${this.apiUrl}/refresh`, { refreshToken }).pipe(
      // If refresh token is present in localStorage, keep persisting it (remember-me mode).
      tap(res => this.handleAuthResponse(res, localStorage.getItem(environment.jwtRefreshKey) != null))
    );
  }

  logout(): void {
    const currentUser = this.currentUserSubject.value;
    const sessionDurationSeconds = this.getSessionDurationSeconds();

    if (currentUser?.id && sessionDurationSeconds > 0) {
      const request: SessionUsageRequest = { sessionDurationSeconds };
      this.userService.recordSessionUsage(currentUser.id, request).pipe(
        catchError(() => from(Promise.resolve(null)))
      ).subscribe();
    }

    this.storage.clearTokens();
    this.storage.remove(this.CURRENT_USER_KEY);
    this.storage.remove(this.CURRENT_SESSION_START_KEY);
    this.currentUserSubject.next(null);
    this.router.navigate(['/auth/login']);
  }

  isAuthenticated(): boolean {
    return !!this.storage.getToken() && !!this.currentUserSubject.value;
  }

  getCurrentUser(): AuthUser | null {
    return this.currentUserSubject.value;
  }

  updateCurrentUser(partial: Partial<AuthUser>): void {
    const current = this.currentUserSubject.value;
    if (!current) return;
    const updated = this.normalizeAuthUser({ ...current, ...partial });
    this.currentUserSubject.next(updated);
    const rememberMe = localStorage.getItem(environment.jwtTokenKey) != null;
    this.storage.set(this.CURRENT_USER_KEY, updated, rememberMe);
  }

  changePassword(userId: number, request: { oldPassword: string; newPassword: string }): Observable<void> {
    return this.http.post<void>(`${this.usersApiUrl}/${userId}/change-password`, request);
  }

  getRole(): UserRole | null {
    return this.currentUserSubject.value?.role ?? null;
  }

  hasRole(roles: UserRole[]): boolean {
    const role = this.getRole();
    return role ? roles.includes(role) : false;
  }

  private handleAuthResponse(res: AuthResponse, rememberMe: boolean = false): void {
    this.storage.setToken(res.accessToken, rememberMe);
    if (res.refreshToken) this.storage.setRefreshToken(res.refreshToken, rememberMe);
    const normalizedUser = this.normalizeAuthUser(res.user);
    this.storage.set(this.CURRENT_USER_KEY, normalizedUser, rememberMe);
    if (!this.getSessionStartMs()) {
      this.setSessionStart(Date.now(), rememberMe);
    }
    this.currentUserSubject.next(normalizedUser);
  }

  private normalizeAuthUser(user: AuthUser): AuthUser {
    return {
      ...user,
      avatarUrl: resolveAvatarUrl(user.avatarUrl ?? user.avatar) ?? undefined
    };
  }

  private getSessionStartMs(): number | null {
    const value = this.storage.get<number>(this.CURRENT_SESSION_START_KEY);
    return typeof value === 'number' ? value : null;
  }

  private setSessionStart(timestamp: number, rememberMe: boolean = false): void {
    this.storage.set(this.CURRENT_SESSION_START_KEY, timestamp, rememberMe);
  }

  private getSessionDurationSeconds(): number {
    const startedAt = this.getSessionStartMs();
    if (!startedAt) return 0;
    return Math.max(0, Math.floor((Date.now() - startedAt) / 1000));
  }

  private isRememberMeMode(): boolean {
    return localStorage.getItem(environment.jwtTokenKey) != null;
  }
}
