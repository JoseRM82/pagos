export function getTodayLocal(): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export function getCurrentMonth(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

export function addMonths(yyyyMm: string, delta: number): string {
  const [y, m] = yyyyMm.split('-').map(Number);
  const d = new Date(y, m - 1 + delta, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

export function formatMonthYear(yyyyMm: string): string {
  const [y, m] = yyyyMm.split('-').map(Number);
  const label = new Date(y, m - 1, 1).toLocaleDateString('es-AR', {
    month: 'long',
    year: 'numeric',
  });
  return label.charAt(0).toUpperCase() + label.slice(1);
}

export function buildMonthWindow(endMonth: string, count = 12): string[] {
  const months: string[] = [];
  for (let i = count - 1; i >= 0; i -= 1) {
    months.push(addMonths(endMonth, -i));
  }
  return months;
}

export function maxMonth(a: string, b: string): string {
  return a >= b ? a : b;
}

export function buildYearWindow(consolidado: { anio: string }[]): string[] {
  if (consolidado.length === 0) return [];
  const years = consolidado.map((c) => Number(c.anio));
  const min = Math.min(...years);
  const max = Math.max(...years);
  const result: string[] = [];
  for (let y = min; y <= max; y += 1) result.push(String(y));
  return result;
}
