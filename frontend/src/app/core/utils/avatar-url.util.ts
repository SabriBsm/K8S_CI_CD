import { environment } from '../../../environments/environment';

export function resolveAvatarUrl(url?: string | null): string | null {
  if (!url) return null;
  if (url.startsWith('data:') || url.startsWith('http://') || url.startsWith('https://')) {
    return url;
  }

  const apiBase = environment.apiUrl.replace(/\/api\/?$/, '');
  if (url.startsWith('/avatars/')) {
    return `${apiBase}${url}`;
  }

  if (url.startsWith('avatars/')) {
    return `${apiBase}/${url}`;
  }

  return url;
}

