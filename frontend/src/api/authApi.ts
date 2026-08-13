import { API_URL } from './gastosApi';

export type AuthUser = {
  email: string;
  name: string;
};

export function googleLoginUrl(): string {
  return `${API_URL}/auth/google`;
}

export const authApi = {
  me: async (): Promise<AuthUser | null> => {
    const res = await fetch(`${API_URL}/auth/me`, { credentials: 'include' });
    if (res.status === 401) return null;
    if (!res.ok) return null;
    return res.json() as Promise<AuthUser>;
  },

  logout: () =>
    fetch(`${API_URL}/auth/logout`, {
      method: 'POST',
      credentials: 'include',
    }),
};
