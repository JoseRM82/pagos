import { Capacitor } from '@capacitor/core';
import { setSessionToken } from '../api/sessionToken';

export type DeepLinkAuthResult =
  | { ok: true }
  | { ok: false; denied: true; reason: string | null };

function parseAuthCallback(url: string): DeepLinkAuthResult | null {
  if (!url.includes('auth/callback') && !url.includes('://auth')) {
    return null;
  }
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return null;
  }
  const token = parsed.searchParams.get('token');
  if (token) {
    setSessionToken(token);
    return { ok: true };
  }
  if (parsed.searchParams.get('auth') === 'denied') {
    return {
      ok: false,
      denied: true,
      reason: parsed.searchParams.get('reason'),
    };
  }
  return null;
}

/** Escucha el retorno de Google OAuth vía deep link (solo nativo). */
export async function listenAuthDeepLink(
  onResult: (result: DeepLinkAuthResult) => void,
): Promise<() => void> {
  if (!Capacitor.isNativePlatform()) {
    return () => undefined;
  }

  const { App } = await import('@capacitor/app');
  const { Browser } = await import('@capacitor/browser');

  const handle = await App.addListener('appUrlOpen', async ({ url }) => {
    const result = parseAuthCallback(url);
    if (!result) return;
    try {
      await Browser.close();
    } catch {
      /* ya cerrado */
    }
    onResult(result);
  });

  return () => {
    void handle.remove();
  };
}
