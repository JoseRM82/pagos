import { AuthService } from '../../src/auth/auth.service';
import { JwtService } from '@nestjs/jwt';

describe('AuthService.assertAllowedEmail', () => {
  const original = process.env.AUTH_ALLOWED_EMAIL;
  const service = new AuthService(new JwtService({ secret: 'test' }));

  afterEach(() => {
    process.env.AUTH_ALLOWED_EMAIL = original;
  });

  it('acepta el email permitido', () => {
    process.env.AUTH_ALLOWED_EMAIL = 'yo@gmail.com';
    expect(service.assertAllowedEmail('Yo@Gmail.com')).toBe('yo@gmail.com');
  });

  it('rechaza otro email', () => {
    process.env.AUTH_ALLOWED_EMAIL = 'yo@gmail.com';
    expect(() => service.assertAllowedEmail('otro@gmail.com')).toThrow();
  });
});
