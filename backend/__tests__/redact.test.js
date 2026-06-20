const { redactSensitive, isSensitiveKey } = require('../utils/redact');

describe('isSensitiveKey', () => {
  it('flags exact sensitive keys', () => {
    expect(isSensitiveKey('password')).toBe(true);
    expect(isSensitiveKey('token')).toBe(true);
    expect(isSensitiveKey('otp')).toBe(true);
  });

  it('flags keys that contain a sensitive substring, case-insensitively', () => {
    expect(isSensitiveKey('userPassword')).toBe(true);
    expect(isSensitiveKey('JWT_SECRET')).toBe(true);
    expect(isSensitiveKey('Authorization')).toBe(true);
    expect(isSensitiveKey('apiKey')).toBe(true);
  });

  it('does not flag safe keys', () => {
    expect(isSensitiveKey('email')).toBe(false);
    expect(isSensitiveKey('amount')).toBe(false);
    expect(isSensitiveKey('userId')).toBe(false);
  });
});

describe('redactSensitive', () => {
  it('redacts top-level sensitive fields', () => {
    const out = redactSensitive({ email: 'a@b.com', password: 'hunter2' });
    expect(out).toEqual({ email: 'a@b.com', password: '[REDACTED]' });
  });

  it('redacts nested sensitive fields', () => {
    const out = redactSensitive({
      user: { name: 'Yahya', credentials: { jwt: 'eyJhbGci...' } },
    });
    expect(out.user.name).toBe('Yahya');
    expect(out.user.credentials.jwt).toBe('[REDACTED]');
  });

  it('walks arrays of objects', () => {
    const out = redactSensitive([{ otp: '123456' }, { otp: '654321' }]);
    expect(out[0].otp).toBe('[REDACTED]');
    expect(out[1].otp).toBe('[REDACTED]');
  });

  it('leaves primitives untouched', () => {
    expect(redactSensitive('hello')).toBe('hello');
    expect(redactSensitive(42)).toBe(42);
    expect(redactSensitive(null)).toBe(null);
  });

  it('does not mutate the original object', () => {
    const original = { password: 'secret' };
    redactSensitive(original);
    expect(original.password).toBe('secret');
  });
});
