import { completeOcrDate, getTodayLocal } from './dateUtils';

export type ParseTransferFailure = 'unreadable' | 'not_a_transfer';

export type ParseTransferResult =
  | { ok: true; cantidad: number; fecha: string | null }
  | { ok: false; reason: ParseTransferFailure };

const MONTHS: Record<string, number> = {
  enero: 1,
  ene: 1,
  febrero: 2,
  feb: 2,
  marzo: 3,
  mar: 3,
  abril: 4,
  abr: 4,
  mayo: 5,
  may: 5,
  junio: 6,
  jun: 6,
  julio: 7,
  jul: 7,
  agosto: 8,
  ago: 8,
  septiembre: 9,
  setiembre: 9,
  sep: 9,
  sept: 9,
  set: 9,
  octubre: 10,
  oct: 10,
  noviembre: 11,
  nov: 11,
  diciembre: 12,
  dic: 12,
};

const MONTH_ALT = Object.keys(MONTHS)
  .sort((a, b) => b.length - a.length)
  .join('|');

const SEP = String.raw`[/.\-|]`;

/** ML Kit suele pegar palabras y usar guiones/barras unicode. */
export function normalizeOcrText(text: string): string {
  return text
    .replace(/\u00a0/g, ' ')
    .replace(/[\u2010-\u2015\u2212]/g, '-')
    .replace(/[\u2215\u2044\uFF0F]/g, '/')
    .replace(/[|\\]/g, '/')
    .replace(/([A-Za-zÁÉÍÓÚáéíóúñÑ])(\d)/g, '$1 $2')
    .replace(/(\d)([A-Za-zÁÉÍÓÚáéíóúñÑ])/g, '$1 $2');
}

const AMOUNT_KEYWORDS =
  /importe|monto|total|transferiste|enviaste|pagaste|recibiste|recibida|ingresaste|valor|cantidad|pesos|\bars\b/i;

const AMOUNT_TOKEN =
  /\$?\s*\d{1,3}(?:[.\s]\d{3})+(?:,\d{1,2})?|\$?\s*\d{1,10}[.,]\d{1,2}|\$\s*\d{1,10}|\d{1,10}/g;

function normalizeYear(year: number): number | null {
  if (year < 100) return 2000 + year;
  if (year < 1900 || year > 2100) return null;
  return year;
}

export function parseArNumber(raw: string): number | null {
  const s = raw.replace(/[$\s]/g, '');
  if (!s || !/\d/.test(s)) return null;
  const hasComma = s.includes(',');
  const hasDot = s.includes('.');
  let normalized: string;
  if (hasComma && hasDot) {
    if (s.lastIndexOf(',') > s.lastIndexOf('.')) {
      normalized = s.replace(/\./g, '').replace(',', '.');
    } else {
      normalized = s.replace(/,/g, '');
    }
  } else if (hasComma) {
    const frac = s.split(',')[1] ?? '';
    normalized = frac.length <= 2 ? s.replace(',', '.') : s.replace(/,/g, '');
  } else if (hasDot) {
    const parts = s.split('.');
    const last = parts[parts.length - 1] ?? '';
    const thousands =
      parts.length > 2 || (parts.length === 2 && last.length === 3 && parts[0].length <= 3);
    normalized = thousands ? s.replace(/\./g, '') : s;
  } else {
    normalized = s;
  }
  const n = Number(normalized);
  if (!Number.isFinite(n) || n < 0.01 || n > 99_999_999.99) return null;
  return Math.round(n * 100) / 100;
}

function looksLikeYear(n: number): boolean {
  return Number.isInteger(n) && n >= 1900 && n <= 2100;
}

function extractCantidad(text: string): number | null {
  const compact = normalizeOcrText(text);
  const candidates: { value: number; score: number }[] = [];
  const re = new RegExp(AMOUNT_TOKEN.source, 'g');
  let match: RegExpExecArray | null;
  while ((match = re.exec(compact))) {
    const raw = match[0];
    const value = parseArNumber(raw);
    if (value == null) continue;
    if (looksLikeYear(value) && !raw.includes('$')) continue;
    const digits = raw.replace(/\D/g, '');
    if (digits.length >= 11) continue;

    const around = compact.slice(Math.max(0, match.index - 28), match.index + raw.length + 8);
    let score = 0;
    if (raw.includes('$')) score += 10;
    if (AMOUNT_KEYWORDS.test(around)) score += 8;
    if (/\d{1,3}([.\s]\d{3})+/.test(raw)) score += 5;
    if (/[.,]\d{1,2}\s*$/.test(raw.trim())) score += 3;
    if (digits.length >= 3 && digits.length <= 8) score += 2;
    if (digits.length <= 2 && !raw.includes('$')) score -= 4;

    const withCents = attachSplitCents(raw, value, compact, match.index);
    candidates.push({ value: withCents, score });
  }

  if (candidates.length === 0) return null;
  candidates.sort((a, b) => b.score - a.score || b.value - a.value);
  const best = candidates[0];
  if (!best || best.score < 5) return null;
  return best.value;
}

const DATE_AFTER_CENTS =
  /^\s*(?:[/-:]|de\b|ene|feb|mar|abr|may|jun|jul|ago|sep|set|oct|nov|dic)/i;

/** Apps que ponen los centavos en superíndice: "$ 663.205" + "81" → 663205.81 */
function attachSplitCents(
  raw: string,
  value: number,
  compact: string,
  index: number,
): number {
  if (/[.,]\d{1,2}\s*$/.test(raw.trim())) return value;
  if (!Number.isInteger(value)) return value;
  if (!raw.includes('$') && !/\d{1,3}(?:[.\s]\d{3})+/.test(raw)) return value;

  const after = compact.slice(index + raw.length, index + raw.length + 16);
  const sameLine = after.match(/^[ \t]*[.,]?(\d{2})(?!\d)/);
  if (sameLine) {
    const rest = after.slice(sameLine[0].length);
    if (DATE_AFTER_CENTS.test(rest)) return value;
    return Math.round((value + Number(sameLine[1]) / 100) * 100) / 100;
  }

  const nextLine = after.match(/^\s*\n[ \t]*(\d{2})[ \t]*(?:\n|$)/);
  if (!nextLine) return value;
  return Math.round((value + Number(nextLine[1]) / 100) * 100) / 100;
}

function extractFecha(text: string, today: string): string | null {
  const compact = normalizeOcrText(text);
  const found: { value: string; score: number }[] = [];

  const push = (
    day: number | undefined,
    month: number,
    year: number | undefined,
    extraScore = 0,
  ) => {
    if (month < 1 || month > 12) return;
    if (day != null && (day < 1 || day > 31)) return;
    const y = year == null ? undefined : normalizeYear(year);
    if (year != null && y == null) return;
    found.push({
      value: completeOcrDate({ day, month, year: y ?? undefined }, today),
      score: extraScore + (day != null ? 2 : 0) + (year != null ? 1 : 0),
    });
  };

  const iso = compact.matchAll(/\b(20\d{2})-(\d{2})-(\d{2})\b/g);
  for (const m of iso) {
    push(Number(m[3]), Number(m[2]), Number(m[1]));
  }

  const numericFull = compact.matchAll(
    new RegExp(String.raw`(?<!\d)(\d{1,2})${SEP}(\d{1,2})${SEP}(\d{2,4})(?!\d)`, 'g'),
  );
  for (const m of numericFull) {
    push(Number(m[1]), Number(m[2]), Number(m[3]));
  }

  const namedFull = compact.matchAll(
    new RegExp(
      String.raw`(?<!\d)(\d{1,2})\s+de\s+(${MONTH_ALT})(?:\s+de)?\s+(\d{2,4})(?!\d)`,
      'gi',
    ),
  );
  for (const m of namedFull) {
    const month = MONTHS[m[2].toLowerCase()];
    if (month) push(Number(m[1]), month, Number(m[3]));
  }

  const namedSlashFull = compact.matchAll(
    new RegExp(
      String.raw`(?<!\d)(\d{1,2})\s*${SEP}\s*(${MONTH_ALT})\.?\s*${SEP}\s*(\d{4})(?!\d)`,
      'gi',
    ),
  );
  for (const m of namedSlashFull) {
    const month = MONTHS[m[2].toLowerCase()];
    if (month) push(Number(m[1]), month, Number(m[3]));
  }

  const namedSpaceFull = compact.matchAll(
    new RegExp(
      String.raw`(?<!\d)(\d{1,2})\s+(${MONTH_ALT})\.?\s+(\d{4})(?!\d)`,
      'gi',
    ),
  );
  for (const m of namedSpaceFull) {
    const month = MONTHS[m[2].toLowerCase()];
    if (month) push(Number(m[1]), month, Number(m[3]));
  }

  // 4/may - 13:04 | 4 may 13:04 | 4/may13:04 (tras normalizar)
  const namedWithTime = compact.matchAll(
    new RegExp(
      String.raw`(?<!\d)(\d{1,2})\s*${SEP}?\s*(${MONTH_ALT})\.?\s*-?\s*\d{1,2}[:.]\d{2}`,
      'gi',
    ),
  );
  for (const m of namedWithTime) {
    const month = MONTHS[m[2].toLowerCase()];
    if (month) push(Number(m[1]), month, undefined, 5);
  }

  const namedSlashDayMonth = compact.matchAll(
    new RegExp(
      String.raw`(?<!\d)(\d{1,2})\s*${SEP}\s*(${MONTH_ALT})\.?(?![a-zñ])`,
      'gi',
    ),
  );
  for (const m of namedSlashDayMonth) {
    const month = MONTHS[m[2].toLowerCase()];
    if (month) push(Number(m[1]), month, undefined);
  }

  const namedDayMonth = compact.matchAll(
    new RegExp(
      String.raw`(?<!\d)(\d{1,2})\s+de\s+(${MONTH_ALT})\.?(?![a-zñ])`,
      'gi',
    ),
  );
  for (const m of namedDayMonth) {
    const month = MONTHS[m[2].toLowerCase()];
    if (month) push(Number(m[1]), month, undefined);
  }

  const namedSpaceDayMonth = compact.matchAll(
    new RegExp(
      String.raw`(?<!\d)(\d{1,2})\s+(${MONTH_ALT})\.?(?![a-zñ])`,
      'gi',
    ),
  );
  for (const m of namedSpaceDayMonth) {
    const month = MONTHS[m[2].toLowerCase()];
    if (month) push(Number(m[1]), month, undefined);
  }

  const monthYear = compact.matchAll(
    new RegExp(
      String.raw`(?<![a-zñ])(${MONTH_ALT})\s+(?:de\s+)?(\d{4})(?!\d)`,
      'gi',
    ),
  );
  for (const m of monthYear) {
    const month = MONTHS[m[1].toLowerCase()];
    if (month) push(undefined, month, Number(m[2]));
  }

  const numericMonthYear = compact.matchAll(
    new RegExp(String.raw`(?<!\d)(\d{1,2})${SEP}(20\d{2})(?!\d)`, 'g'),
  );
  for (const m of numericMonthYear) {
    push(undefined, Number(m[1]), Number(m[2]));
  }

  const numericDayMonth = compact.matchAll(
    new RegExp(String.raw`(?<!\d)(\d{1,2})${SEP}(\d{1,2})(?!\d)`, 'g'),
  );
  for (const m of numericDayMonth) {
    const day = Number(m[1]);
    const month = Number(m[2]);
    if (month > 12 && day <= 12) push(month, day, undefined);
    else push(day, month, undefined);
  }

  if (found.length > 0) {
    found.sort((a, b) => b.score - a.score);
    return found[0].value;
  }

  if (/\bhoy\b/i.test(compact)) return today;
  const yesterday = new Date(`${today}T12:00:00`);
  yesterday.setDate(yesterday.getDate() - 1);
  if (/\bayer\b/i.test(compact)) {
    return completeOcrDate(
      {
        day: yesterday.getDate(),
        month: yesterday.getMonth() + 1,
        year: yesterday.getFullYear(),
      },
      today,
    );
  }

  return null;
}

export function parseTransferOcr(text: string, today = getTodayLocal()): ParseTransferResult {
  const trimmed = normalizeOcrText(text).trim();
  if (trimmed.length < 4 || !/\d/.test(trimmed)) {
    return { ok: false, reason: 'unreadable' };
  }

  const cantidad = extractCantidad(trimmed);
  if (cantidad == null) {
    return { ok: false, reason: 'not_a_transfer' };
  }

  return {
    ok: true,
    cantidad,
    fecha: extractFecha(trimmed, today),
  };
}
