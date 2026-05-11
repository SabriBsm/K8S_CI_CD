import { environment } from '../../../environments/environment';

export function resolveAvatarUrl(url?: string | null): string | null {
  if (!url) return null;

  const normalizedUrl = normalizeAvatarPath(url.trim());
  if (normalizedUrl.startsWith('data:') || normalizedUrl.startsWith('http://') || normalizedUrl.startsWith('https://')) {
    return normalizedUrl;
  }

  const apiBase = environment.apiUrl.replace(/\/api\/?$/, '');
  if (normalizedUrl.startsWith('/avatars/')) {
    return `${apiBase}${normalizedUrl}`;
  }

  if (normalizedUrl.startsWith('avatars/')) {
    return `${apiBase}/${normalizedUrl}`;
  }

  return normalizedUrl;
}

function normalizeAvatarPath(url: string): string {
  return url.replace(/\/avatars\/+avatars\//g, '/avatars/');
}

