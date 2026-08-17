import { Capacitor } from '@capacitor/core';
import { parseTransferOcr } from '../utils/parseTransferOcr';
import { readOcrFromCamera, readOcrFromGallery } from './readOcrImage';

export type ReadComprobanteResult =
  | { ok: true; cantidad: number; fecha: string | null }
  | { ok: false; reason: 'cancelled' | 'app_error' | 'unreadable' | 'not_a_transfer' };

export async function readComprobanteFromGallery(): Promise<ReadComprobanteResult> {
  if (!Capacitor.isNativePlatform()) {
    return { ok: false, reason: 'app_error' };
  }

  const ocr = await readOcrFromGallery();
  if (!ocr.ok) {
    if (ocr.reason === 'cancelled') return { ok: false, reason: 'cancelled' };
    if (ocr.reason === 'unreadable') return { ok: false, reason: 'unreadable' };
    return { ok: false, reason: 'app_error' };
  }
  return parseTransferOcr(ocr.text);
}

export async function readComprobanteFromCamera(): Promise<ReadComprobanteResult> {
  if (!Capacitor.isNativePlatform()) {
    return { ok: false, reason: 'app_error' };
  }

  const ocr = await readOcrFromCamera();
  if (!ocr.ok) {
    if (ocr.reason === 'cancelled') return { ok: false, reason: 'cancelled' };
    if (ocr.reason === 'unreadable') return { ok: false, reason: 'unreadable' };
    return { ok: false, reason: 'app_error' };
  }
  return parseTransferOcr(ocr.text);
}
