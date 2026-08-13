export function frontendUrl(): string {
  const url = process.env.FRONTEND_URL?.trim();
  if (!url) {
    throw new Error('FRONTEND_URL no está definida');
  }
  return url.replace(/\/$/, '');
}

/** Deep link de la app Capacitor tras login Google (móvil). */
export function mobileRedirectUrl(): string {
  const url = process.env.MOBILE_REDIRECT_URL?.trim();
  if (url) return url.replace(/\/$/, '');
  return 'com.pagos.calculo://auth/callback';
}

const CAPACITOR_ORIGINS = [
  'https://localhost',
  'capacitor://localhost',
  'http://localhost',
];

/** CORS_ORIGIN: una URL o varias separadas por coma. */
export function corsOrigins(): string | string[] {
  const raw = process.env.CORS_ORIGIN?.trim();
  if (!raw) {
    throw new Error('CORS_ORIGIN no está definida');
  }
  const list = [
    ...raw
      .split(',')
      .map((o) => o.trim().replace(/\/$/, ''))
      .filter(Boolean),
    ...CAPACITOR_ORIGINS,
  ];
  const unique = [...new Set(list)];
  if (unique.length === 0) {
    throw new Error('CORS_ORIGIN no está definida');
  }
  return unique.length === 1 ? unique[0] : unique;
}
