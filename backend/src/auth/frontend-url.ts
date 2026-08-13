export function frontendUrl(): string {
  const url = process.env.FRONTEND_URL?.trim();
  if (!url) {
    throw new Error('FRONTEND_URL no está definida');
  }
  return url.replace(/\/$/, '');
}

/** CORS_ORIGIN: una URL o varias separadas por coma. */
export function corsOrigins(): string | string[] {
  const raw = process.env.CORS_ORIGIN?.trim();
  if (!raw) {
    throw new Error('CORS_ORIGIN no está definida');
  }
  const list = raw
    .split(',')
    .map((o) => o.trim().replace(/\/$/, ''))
    .filter(Boolean);
  if (list.length === 0) {
    throw new Error('CORS_ORIGIN no está definida');
  }
  return list.length === 1 ? list[0] : list;
}
