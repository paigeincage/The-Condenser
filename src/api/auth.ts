import { api } from './client';
import type { AuthUser } from '../stores/auth';

export interface AuthResponse {
  token: string;
  user: AuthUser;
}

export function login(email: string, password: string) {
  return api<AuthResponse>('/api/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  });
}

export function register(data: { email: string; password: string; name: string; phone?: string; company?: string }) {
  return api<AuthResponse>('/api/auth/register', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export function me() {
  return api<{ user: AuthUser }>('/api/auth/me');
}
