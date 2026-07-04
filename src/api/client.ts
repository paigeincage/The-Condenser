import { getToken, clearStoredAuth } from '../stores/auth';

const BASE = import.meta.env.VITE_API_URL || (import.meta.env.PROD ? '' : 'http://localhost:3001');

function authHeader(): Record<string, string> {
  const token = getToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
}

/**
 * A 401 with a token present means the session expired or the token is invalid:
 * clear it and send the user to /login. A 401 with no token (e.g. a failed login
 * attempt) is just an error for the caller to display.
 */
function handleUnauthorized(hadToken: boolean): void {
  if (hadToken && !window.location.pathname.startsWith('/login')) {
    clearStoredAuth();
    window.location.assign('/login');
  }
}

export async function api<T>(path: string, options?: RequestInit): Promise<T> {
  const hadToken = !!getToken();
  const res = await fetch(`${BASE}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...authHeader(),
      ...options?.headers,
    },
  });
  if (res.status === 401) handleUnauthorized(hadToken);
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(err.error || `API error ${res.status}`);
  }
  return res.json();
}

export async function apiUpload<T>(path: string, formData: FormData): Promise<T> {
  const hadToken = !!getToken();
  const res = await fetch(`${BASE}${path}`, {
    method: 'POST',
    headers: { ...authHeader() },
    body: formData,
  });
  if (res.status === 401) handleUnauthorized(hadToken);
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(err.error || `Upload error ${res.status}`);
  }
  return res.json();
}
