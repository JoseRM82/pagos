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

export function getCurrentYear(): string {
  return String(new Date().getFullYear());
}

export function addYears(yyyy: string, delta: number): string {
  return String(Number(yyyy) + delta);
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

/** `month` es 1–12. */
export function daysInMonth(year: number, month: number): number {
  return new Date(year, month, 0).getDate();
}

export function padYmd(year: number, month: number, day: number): string {
  return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

export function parseYmd(value: string): { year: number; month: number; day: number } | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) return null;
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  if (month < 1 || month > 12 || day < 1 || day > daysInMonth(year, month)) {
    return null;
  }
  return { year, month, day };
}

export function formatYmdDisplay(value: string): string {
  const parsed = parseYmd(value);
  if (!parsed) return value;
  const d = new Date(parsed.year, parsed.month - 1, parsed.day);
  return d.toLocaleDateString('es-AR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
}

/** Completa día/año faltantes según las reglas de comprobantes. */
export function completeOcrDate(
  parts: { day?: number; month: number; year?: number },
  today = getTodayLocal(),
): string {
  const parsedToday = parseYmd(today) ?? { year: 2026, month: 1, day: 1 };
  const year = parts.year ?? parsedToday.year;
  const month = parts.month;
  let day = parts.day;
  if (day == null) {
    day =
      year === parsedToday.year && month === parsedToday.month ? parsedToday.day : 15;
  }
  const max = daysInMonth(year, month);
  return padYmd(year, month, Math.min(Math.max(day, 1), max));
}
