import { Capacitor } from '@capacitor/core';
import { parseTransferOcr } from '../utils/parseTransferOcr';

export type ReadComprobanteResult =
  | { ok: true; cantidad: number; fecha: string | null }
  | { ok: false; reason: 'cancelled' | 'app_error' | 'unreadable' | 'not_a_transfer' };

function isUserCancel(err: unknown): boolean {
  const e = err as { message?: string; code?: string };
  const msg = `${e?.message ?? err ?? ''}`.toLowerCase();
  const code = `${e?.code ?? ''}`.toLowerCase();
  return (
    msg.includes('cancel') ||
    msg.includes('dismiss') ||
    msg.includes('user cancelled') ||
    code.includes('cancel')
  );
}

function mediaPath(item: { uri?: string; path?: string }): string | undefined {
  const raw = item.uri || item.path;
  if (!raw) return undefined;
  if (
    raw.startsWith('file:') ||
    raw.startsWith('content:') ||
    raw.startsWith('http:') ||
    raw.startsWith('https:')
  ) {
    return raw;
  }
  return `file://${raw}`;
}

function wait(ms: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

async function recognizeFromPath(path: string): Promise<ReadComprobanteResult> {
  const { Script, TextRecognition } = await import(
    '@capacitor-mlkit/text-recognition'
  );
  const result = await TextRecognition.processImage({
    path,
    script: Script.Latin,
  });
  return parseTransferOcr(flattenOcrText(result));
}

function flattenOcrText(result: {
  text?: string;
  blocks?: {
    text?: string;
    lines?: { text?: string; elements?: { text?: string }[] }[];
  }[];
}): string {
  const parts: string[] = [];
  if (result.text) parts.push(result.text);
  for (const block of result.blocks ?? []) {
    for (const line of block.lines ?? []) {
      const elems = (line.elements ?? [])
        .map((el) => el.text?.trim())
        .filter(Boolean);
      parts.push(elems.length > 0 ? elems.join(' ') : (line.text ?? ''));
    }
    if (block.text) parts.push(block.text);
  }
  return parts.filter(Boolean).join('\n');
}

export async function readComprobanteFromGallery(): Promise<ReadComprobanteResult> {
  if (!Capacitor.isNativePlatform()) {
    return { ok: false, reason: 'app_error' };
  }

  try {
    const { Camera, MediaTypeSelection } = await import('@capacitor/camera');

    const { results } = await Camera.chooseFromGallery({
      limit: 1,
      mediaType: MediaTypeSelection.Photo,
    });
    await wait(500);
    const photo = results?.[0];
    const path = photo ? mediaPath(photo) : undefined;
    if (!path) {
      return { ok: false, reason: 'app_error' };
    }

    return await recognizeFromPath(path);
  } catch (err) {
    if (isUserCancel(err)) return { ok: false, reason: 'cancelled' };
    return { ok: false, reason: 'app_error' };
  }
}

export async function readComprobanteFromCamera(): Promise<ReadComprobanteResult> {
  if (!Capacitor.isNativePlatform()) {
    return { ok: false, reason: 'app_error' };
  }

  try {
    const { Camera } = await import('@capacitor/camera');

    const perms = await Camera.requestPermissions({ permissions: ['camera'] });
    if (perms.camera !== 'granted' && perms.camera !== 'limited') {
      return { ok: false, reason: 'app_error' };
    }

    const photo = await Camera.takePhoto({
      quality: 90,
      correctOrientation: true,
      saveToGallery: false,
    });
    await wait(500);
    const path = mediaPath({ uri: photo.uri });
    if (!path) {
      return { ok: false, reason: 'app_error' };
    }

    return await recognizeFromPath(path);
  } catch (err) {
    if (isUserCancel(err)) return { ok: false, reason: 'cancelled' };
    return { ok: false, reason: 'app_error' };
  }
}
