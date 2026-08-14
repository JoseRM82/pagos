import { Capacitor, SystemBars } from '@capacitor/core';

const HIDE_DELAY_MS = 400;

/** Oculta barra de estado y de navegación. Reaparecen al deslizar desde un borde. */
export async function hideSystemBars(): Promise<() => void> {
  if (!Capacitor.isNativePlatform()) {
    return () => undefined;
  }

  let timer: ReturnType<typeof setTimeout> | undefined;
  const hide = (delay = 0) => {
    if (timer) clearTimeout(timer);
    timer = setTimeout(() => {
      void SystemBars.hide().catch(() => undefined);
    }, delay);
  };

  hide(0);

  const { App } = await import('@capacitor/app');
  const handle = await App.addListener('appStateChange', ({ isActive }) => {
    if (isActive) hide(HIDE_DELAY_MS);
  });
  return () => {
    if (timer) clearTimeout(timer);
    handle.remove();
  };
}
