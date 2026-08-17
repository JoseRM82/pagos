import { normalizeOcrText, parseArNumber } from './parseTransferOcr';

export type ParseShelfLabelFailure = 'unreadable' | 'no_name';

export type ParseShelfLabelResult =
  | { ok: true; nombre: string; precios: number[] }
  | { ok: false; reason: ParseShelfLabelFailure };

const CURRENCY_PRICE =
  /(?:R\s*\$|\$)\s*(?:UN\s*)?\d{1,3}(?:[.\s]\d{3})*(?:,\d{1,2})?|\d{1,3}(?:[.\s]\d{3})+(?:,\d{1,2})/gi;

function parseShelfPrice(raw: string): number | null {
  const cleaned = raw
    .replace(/R\s*\$/gi, '$')
    .replace(/\bUN\b/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  return parseArNumber(cleaned);
}

const UNIT_LINE =
  /\bx\s*und\b|\bx\s*unidad\b|\bun\s*\.?\b|\bprecio\s*x\b|\bx\s*kg\b|\bc\/\s*\d/i;

const BARCODE_ONLY = /^\d{8,14}$/;

const INTERNAL_CODE = /^\d{4,6}$/;

function lineHasCurrency(line: string): boolean {
  return /(?:R\s*\$|\$)/.test(line);
}

function filterBulkTotals(prices: number[]): number[] {
  if (prices.length <= 2) return prices;
  const sorted = [...prices].sort((a, b) => a - b);
  return sorted.filter((price) => {
    return !sorted.some((other) => {
      if (other >= price) return false;
      const ratio = price / other;
      return ratio >= 2 && Math.abs(ratio - Math.round(ratio)) < 0.02;
    });
  });
}

function extractPricesFromLine(line: string): number[] {
  if (UNIT_LINE.test(line) && !lineHasCurrency(line)) return [];

  const found: number[] = [];
  const re = new RegExp(CURRENCY_PRICE.source, 'gi');
  let match: RegExpExecArray | null;
  while ((match = re.exec(line))) {
    const value = parseShelfPrice(match[0]);
    if (value == null) continue;
    if (!found.some((p) => Math.abs(p - value) < 0.001)) {
      found.push(value);
    }
  }
  return found;
}

function isPriceOnlyLine(line: string): boolean {
  const stripped = line
    .replace(/(?:R\s*\$|\$)\s*[\d.,\s]+/gi, '')
    .replace(/\d+[.,]\d+/g, '')
    .trim();
  return stripped.length < 2 && (lineHasCurrency(line) || /\d+[.,]\d+/.test(line));
}

function extractProductName(lines: string[], priceLineIndexes: Set<number>): string {
  const parts: string[] = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const compact = line.replace(/\s/g, '');

    if (BARCODE_ONLY.test(compact)) continue;
    if (INTERNAL_CODE.test(line.trim())) continue;
    if (isPriceOnlyLine(line)) continue;
    if (priceLineIndexes.has(i) && !/[A-Za-zÁÉÍÓÚáéíóúñÑ]{3,}/.test(line)) continue;

    let candidate = line
      .replace(/(?:R\s*\$|\$)\s*[\d.,\s]+/gi, '')
      .trim();
    if (!candidate) candidate = line.trim();
    if (/^\d+$/.test(candidate.replace(/\s/g, ''))) continue;
    if (UNIT_LINE.test(candidate) && candidate.length < 12) continue;
    if (/^(varejo|atacado|leve|pague)$/i.test(candidate)) continue;

    parts.push(candidate);
    if (parts.join(' ').length >= 8) break;
  }

  return parts.join(' ').replace(/\s+/g, ' ').trim();
}

export function parseShelfLabelOcr(text: string): ParseShelfLabelResult {
  const normalized = normalizeOcrText(text);
  if (!normalized.trim()) {
    return { ok: false, reason: 'unreadable' };
  }

  const lines = normalized
    .split(/\n+/)
    .map((line) => line.trim())
    .filter(Boolean);

  const priceLineIndexes = new Set<number>();
  const allPrices: number[] = [];

  for (let i = 0; i < lines.length; i++) {
    const prices = extractPricesFromLine(lines[i]);
    if (prices.length > 0) {
      priceLineIndexes.add(i);
      for (const price of prices) {
        if (!allPrices.some((p) => Math.abs(p - price) < 0.001)) {
          allPrices.push(price);
        }
      }
    }
  }

  allPrices.sort((a, b) => b - a);
  const filtered = filterBulkTotals(allPrices);
  filtered.sort((a, b) => a - b);
  const precios = filtered.slice(0, 2);

  const nombre = extractProductName(lines, priceLineIndexes);
  if (!nombre) {
    return { ok: false, reason: 'no_name' };
  }

  return { ok: true, nombre, precios };
}
