import { corsOrigins, mobileRedirectUrl } from '../../src/auth/frontend-url';

describe('frontend-url', () => {
  const originalCors = process.env.CORS_ORIGIN;
  const originalMobile = process.env.MOBILE_REDIRECT_URL;

  afterEach(() => {
    process.env.CORS_ORIGIN = originalCors;
    process.env.MOBILE_REDIRECT_URL = originalMobile;
  });

  it('incluye orígenes de Capacitor en CORS', () => {
    process.env.CORS_ORIGIN = 'https://pagos-peach-zeta.vercel.app';
    const origins = corsOrigins();
    expect(Array.isArray(origins) ? origins : [origins]).toEqual(
      expect.arrayContaining([
        'https://pagos-peach-zeta.vercel.app',
        'https://localhost',
        'capacitor://localhost',
      ]),
    );
  });

  it('usa deep link por defecto para móvil', () => {
    delete process.env.MOBILE_REDIRECT_URL;
    expect(mobileRedirectUrl()).toBe('com.pagos.calculo://auth/callback');
  });
});
