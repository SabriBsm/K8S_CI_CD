import { Injectable } from '@angular/core';
import { environment } from '../../../environments/environment';

@Injectable({ providedIn: 'root' })
export class StorageService {

  private isJwtLike(token: string | null): boolean {
    return !!token && token.split('.').length === 3;
  }

  private isNonEmptyToken(token: string | null): boolean {
    return !!token && token.trim().length > 0;
  }

  getToken(): string | null {
    const token = localStorage.getItem(environment.jwtTokenKey)
      ?? sessionStorage.getItem(environment.jwtTokenKey);

    if (!this.isJwtLike(token)) {
      if (token) {
        localStorage.removeItem(environment.jwtTokenKey);
        sessionStorage.removeItem(environment.jwtTokenKey);
      }
      return null;
    }

    return token;
  }

  setToken(token: string, rememberMe: boolean = false): void {
    if (rememberMe) {
      localStorage.setItem(environment.jwtTokenKey, token);
      sessionStorage.removeItem(environment.jwtTokenKey);
      return;
    }
    sessionStorage.setItem(environment.jwtTokenKey, token);
    localStorage.removeItem(environment.jwtTokenKey);
  }

  getRefreshToken(): string | null {
    const token = localStorage.getItem(environment.jwtRefreshKey)
      ?? sessionStorage.getItem(environment.jwtRefreshKey);

    // Refresh tokens are backend-defined and are not necessarily JWTs.
    if (!this.isNonEmptyToken(token)) {
      if (token) {
        localStorage.removeItem(environment.jwtRefreshKey);
        sessionStorage.removeItem(environment.jwtRefreshKey);
      }
      return null;
    }

    return token;
  }

  setRefreshToken(token: string, rememberMe: boolean = false): void {
    if (rememberMe) {
      localStorage.setItem(environment.jwtRefreshKey, token);
      sessionStorage.removeItem(environment.jwtRefreshKey);
      return;
    }
    sessionStorage.setItem(environment.jwtRefreshKey, token);
    localStorage.removeItem(environment.jwtRefreshKey);
  }

  clearTokens(): void {
    localStorage.removeItem(environment.jwtTokenKey);
    localStorage.removeItem(environment.jwtRefreshKey);
    sessionStorage.removeItem(environment.jwtTokenKey);
    sessionStorage.removeItem(environment.jwtRefreshKey);
  }

  get<T>(key: string): T | null {
    const item = localStorage.getItem(key) ?? sessionStorage.getItem(key);
    if (!item) return null;
    try { return JSON.parse(item) as T; } catch { return null; }
  }

  set<T>(key: string, value: T, rememberMe: boolean = false): void {
    const encoded = JSON.stringify(value);
    if (rememberMe) {
      localStorage.setItem(key, encoded);
      sessionStorage.removeItem(key);
      return;
    }
    sessionStorage.setItem(key, encoded);
    localStorage.removeItem(key);
  }

  remove(key: string): void {
    localStorage.removeItem(key);
    sessionStorage.removeItem(key);
  }
}
