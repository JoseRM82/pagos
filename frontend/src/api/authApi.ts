import { Capacitor } from '@capacitor/core';
import { API_URL } from './gastosApi';
import { getSessionToken, setSessionToken } from './sessionToken';

export type AuthUser = {
  email: string;
  name: string;
};

export function googleLoginUrl(client: 'web' | 'mobile' = 'web'): string {
  const q = client === 'mobile' ? '?client=mobile' : '';
  return `${API_URL}/auth/google${q}`;
}

function authHeaders(): HeadersInit {
  const token = getSessionToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
}

export const authApi = {
  me: async (): Promise<AuthUser | null> => {
    const res = await fetch(`${API_URL}/auth/me`, {
      credentials: 'include',
      headers: { ...authHeaders() },
    });
    if (res.status === 401) return null;
    if (!res.ok) return null;
    return res.json() as Promise<AuthUser>;
  },

  logout: async () => {
    setSessionToken(null);
    await fetch(`${API_URL}/auth/logout`, {
      method: 'POST',
      credentials: 'include',
      headers: { ...authHeaders() },
    });
  },

  /** Abre Google OAuth; en nativo usa el navegador del sistema + deep link. */
  startGoogleLogin: async () => {
    sessionStorage.removeItem('auth_denied_reason');
    if (Capacitor.isNativePlatform()) {
      const { Browser } = await import('@capacitor/browser');
      await Browser.open({ url: googleLoginUrl('mobile') });
      return;
    }
    window.location.href = googleLoginUrl('web');
  },
};
