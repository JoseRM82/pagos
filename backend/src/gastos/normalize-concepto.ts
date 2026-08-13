export function normalizeConcepto(text: string | undefined | null): string {
  if (text === undefined || text === null) return 'Gasto';
  const collapsed = text.trim().replace(/\s+/g, ' ');
  if (!collapsed) return 'Gasto';
  const withoutAccents = collapsed
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
  const lower = withoutAccents.toLowerCase();
  return lower.charAt(0).toUpperCase() + lower.slice(1);
}
