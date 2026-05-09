import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { map, Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { User, CreateUserRequest, UpdateUserRequest, UserPageResponse } from '../models/user.model';
import { resolveAvatarUrl } from '../utils/avatar-url.util';

export interface NotifyUserRequest {
  temporaryPassword: string;
}

export interface SessionUsageRequest {
  sessionDurationSeconds: number;
}

export interface UsageRankEntry {
  userId: number;
  username: string;
  firstName: string;
  lastName: string;
  email: string;
  role: string;
  displayName: string;
  totalSeconds: number;
  totalMinutes: number;
  totalHours: number;
}

export interface UsagePeriodRanking {
  scope: 'GLOBAL';
  totalUsers: number;
  totalSeconds: number;
  totalMinutes: number;
  totalHours: number;
  users: UsageRankEntry[];
}

export interface UsageDashboard {
  generatedAt: string;
  scope: 'GLOBAL';
  totalUsers: number;
  totalSeconds: number;
  totalMinutes: number;
  totalHours: number;
  globalRanking: UsagePeriodRanking;
  topUser?: UsageRankEntry | null;
}

@Injectable({ providedIn: 'root' })
export class UserService {
  private readonly apiUrl = `${environment.apiUrl}/users`;

  constructor(private http: HttpClient) {}

  getUsers(page = 0, size = 10, search = ''): Observable<UserPageResponse> {
    let params = new HttpParams().set('page', page).set('size', size);
    if (search) params = params.set('search', search);
    return this.http.get<UserPageResponse>(this.apiUrl, { params }).pipe(
      map(response => this.normalizePage(response))
    );
  }

  /**
   * Get all users as a simple list (not paginated)
   */
  getAllUsersList(): Observable<User[]> {
    return this.http.get<User[]>(`${this.apiUrl}/all`).pipe(
      map(users => users.map(user => this.normalizeUser(user)))
    );
  }

  getUserById(id: number): Observable<User> {
    return this.http.get<User>(`${this.apiUrl}/${id}`).pipe(
      map(user => this.normalizeUser(user))
    );
  }

  createUser(request: CreateUserRequest): Observable<User> {
    return this.http.post<User>(this.apiUrl, request).pipe(
      map(user => this.normalizeUser(user))
    );
  }

  updateUser(id: number, request: UpdateUserRequest): Observable<User> {
    return this.http.put<User>(`${this.apiUrl}/${id}`, request).pipe(
      map(user => this.normalizeUser(user))
    );
  }

  notifyUser(id: number, request: NotifyUserRequest): Observable<void> {
    return this.http.post<void>(`${this.apiUrl}/${id}/notify`, request);
  }

  recordSessionUsage(id: number, request: SessionUsageRequest): Observable<User> {
    return this.http.post<User>(`${this.apiUrl}/${id}/session-usage`, request).pipe(
      map(user => this.normalizeUser(user))
    );
  }

  getUsageDashboard(timezone = 'Africa/Tunis', limit = 10): Observable<UsageDashboard> {
    const params = new HttpParams()
      .set('timezone', timezone)
      .set('limit', limit);

    return this.http.get<UsageDashboard>(`${this.apiUrl}/analytics/usage`, { params });
  }

  deleteUser(id: number): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${id}`);
  }

  uploadAvatar(id: number, file: File): Observable<User> {
    const form = new FormData();
    form.append('avatar', file);
    return this.http.post<User>(`${this.apiUrl}/${id}/avatar`, form).pipe(
      map(user => this.normalizeUser(user))
    );
  }

  private normalizePage(response: UserPageResponse): UserPageResponse {
    return {
      ...response,
      content: response.content.map(user => this.normalizeUser(user))
    };
  }

  private normalizeUser<T extends { avatarUrl?: string; avatar?: string }>(user: T): T {
    return {
      ...user,
      avatarUrl: resolveAvatarUrl(user.avatarUrl ?? user.avatar) ?? undefined
    };
  }
}
