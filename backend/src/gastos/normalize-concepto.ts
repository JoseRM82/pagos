export function normalizeConcepto(
  text: string | undefined | null,
  fallback = 'Gasto',
): string {
  if (text === undefined || text === null) return fallback;
  const collapsed = text.trim().replace(/\s+/g, ' ');
  if (!collapsed) return fallback;
  const withoutAccents = collapsed
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
  const lower = withoutAccents.toLowerCase();
  return lower.charAt(0).toUpperCase() + lower.slice(1);
}
