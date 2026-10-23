import type { AuthUser } from '../types';

/**
 * Secure Authentication Storage Manager
 * Uses sessionStorage so that all credentials and tokens are automatically
 * destroyed when the browser tab or window is closed.
 * Also cleans legacy localStorage items to prevent stale token persistence.
 */
export const authStorage = {
  getAccessToken: (): string | null => {
    return sessionStorage.getItem('tm_access_token');
  },
  setAccessToken: (token: string) => {
    sessionStorage.setItem('tm_access_token', token);
    // Remove any stale localStorage copy
    localStorage.removeItem('tm_access_token');
  },
  getRefreshToken: (): string | null => {
    return sessionStorage.getItem('tm_refresh_token');
  },
  setRefreshToken: (token: string) => {
    sessionStorage.setItem('tm_refresh_token', token);
    localStorage.removeItem('tm_refresh_token');
  },
  getUser: (): AuthUser | null => {
    try {
      const saved = sessionStorage.getItem('tm_user');
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  },
  setUser: (user: AuthUser) => {
    sessionStorage.setItem('tm_user', JSON.stringify(user));
    localStorage.removeItem('tm_user');
  },
  clear: () => {
    sessionStorage.removeItem('tm_user');
    sessionStorage.removeItem('tm_access_token');
    sessionStorage.removeItem('tm_refresh_token');
    localStorage.removeItem('tm_user');
    localStorage.removeItem('tm_access_token');
    localStorage.removeItem('tm_refresh_token');
  },
};

/**
 * Enhanced fetch wrapper with Automatic Silent Refresh
 * When an access token expires (after 15 mins), it automatically calls /api/v1/auth/refresh
 * in the background using the long-lived refresh token, updates session, and retries
 * the request seamlessly without interrupting the staff during their shift.
 */
export async function authFetch(url: string, options: RequestInit = {}): Promise<Response> {
  const token = authStorage.getAccessToken();
  const headers = new Headers(options.headers || {});
  if (token && !headers.has('Authorization')) {
    headers.set('Authorization', `Bearer ${token}`);
  }

  let response = await fetch(url, { ...options, headers });

  // If 401 Unauthorized (token expired after 15 mins), trigger Silent Token Refresh
  if (response.status === 401) {
    const refreshToken = authStorage.getRefreshToken();
    if (refreshToken) {
      try {
        const refreshResponse = await fetch('/api/v1/auth/refresh', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ refreshToken }),
        });

        if (refreshResponse.ok) {
          const data = await refreshResponse.json();
          authStorage.setAccessToken(data.accessToken);
          authStorage.setRefreshToken(data.refreshToken);
          authStorage.setUser(data.user);

          // Retry the original request seamlessly with the newly issued access token
          headers.set('Authorization', `Bearer ${data.accessToken}`);
          response = await fetch(url, { ...options, headers });
        } else {
          // Both access & refresh tokens have expired (e.g. shift ended hours ago)
          authStorage.clear();
        }
      } catch {
        authStorage.clear();
      }
    }
  }

  return response;
}
