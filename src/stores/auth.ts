import { create } from 'zustand';

export interface AuthUser {
  id: string;
  email: string;
  name: string;
  phone?: string;
  company?: string;
}

const TOKEN_KEY = 'condenser_token';
const USER_KEY = 'condenser_user';

/** Read the JWT directly from storage. Safe outside React (used by the API client). */
export function getToken(): string | null {
  try {
    return localStorage.getItem(TOKEN_KEY);
  } catch {
    return null;
  }
}

export function clearStoredAuth(): void {
  try {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
  } catch {
    /* storage unavailable — nothing to clear */
  }
}

function loadStoredUser(): AuthUser | null {
  try {
    const raw = localStorage.getItem(USER_KEY);
    return raw ? (JSON.parse(raw) as AuthUser) : null;
  } catch {
    return null;
  }
}

interface AuthState {
  token: string | null;
  user: AuthUser | null;
  setAuth: (token: string, user: AuthUser) => void;
  clearAuth: () => void;
}

export const useAuth = create<AuthState>((set) => ({
  token: getToken(),
  user: loadStoredUser(),
  setAuth: (token, user) => {
    try {
      localStorage.setItem(TOKEN_KEY, token);
      localStorage.setItem(USER_KEY, JSON.stringify(user));
    } catch {
      /* storage unavailable — session-only auth */
    }
    set({ token, user });
  },
  clearAuth: () => {
    clearStoredAuth();
    set({ token: null, user: null });
  },
}));
