import { parseShelfLabelOcr } from '../utils/parseShelfLabelOcr';
import { readOcrFromCamera, readOcrFromGallery } from './readOcrImage';

export type ReadShelfLabelResult =
  | { ok: true; nombre: string; precios: number[] }
  | {
      ok: false;
      reason: 'cancelled' | 'app_error' | 'unreadable' | 'no_name';
    };

function mapParseFailure(
  reason: 'unreadable' | 'no_name',
): ReadShelfLabelResult {
  return { ok: false, reason };
}

async function parseOcrText(text: string): Promise<ReadShelfLabelResult> {
  const parsed = parseShelfLabelOcr(text);
  if (!parsed.ok) {
    return mapParseFailure(parsed.reason);
  }
  return parsed;
}

export async function readShelfLabelFromGallery(): Promise<ReadShelfLabelResult> {
  const ocr = await readOcrFromGallery();
  if (!ocr.ok) {
    if (ocr.reason === 'cancelled') return { ok: false, reason: 'cancelled' };
    if (ocr.reason === 'unreadable') return { ok: false, reason: 'unreadable' };
    return { ok: false, reason: 'app_error' };
  }
  return parseOcrText(ocr.text);
}

export async function readShelfLabelFromCamera(): Promise<ReadShelfLabelResult> {
  const ocr = await readOcrFromCamera();
  if (!ocr.ok) {
    if (ocr.reason === 'cancelled') return { ok: false, reason: 'cancelled' };
    if (ocr.reason === 'unreadable') return { ok: false, reason: 'unreadable' };
    return { ok: false, reason: 'app_error' };
  }
  return parseOcrText(ocr.text);
}
