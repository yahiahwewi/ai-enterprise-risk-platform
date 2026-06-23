const { signPDF, verifyPDF } = require('../services/report/signAndHash');

// Real RSA-2048 + SHA-256 round-trip tests for the report-signing layer.
// Uses the actual node-forge crypto (certManager auto-generates a self-signed
// cert under backend/certs on first call), so these are end-to-end, not mocked.
describe('signPDF', () => {
  const pdf = Buffer.from('%PDF-1.7 fake report body for signing tests');
  let result;

  beforeAll(() => {
    result = signPDF(pdf);
  });

  it('returns a 64-char hex SHA-256 hash', () => {
    expect(result.hash).toMatch(/^[a-f0-9]{64}$/);
  });

  it('returns a non-empty base64 signature', () => {
    expect(typeof result.signature).toBe('string');
    expect(result.signature.length).toBeGreaterThan(0);
    // base64 charset only
    expect(result.signature).toMatch(/^[A-Za-z0-9+/=]+$/);
  });

  it('returns the signer certificate (PEM) and CN', () => {
    expect(result.certPem).toContain('-----BEGIN CERTIFICATE-----');
    expect(result.certCN).toBeTruthy();
  });

  it('stamps a signedAt Date', () => {
    expect(result.signedAt).toBeInstanceOf(Date);
  });

  it('produces a deterministic hash for identical input', () => {
    const again = signPDF(pdf);
    expect(again.hash).toBe(result.hash);
  });
});

describe('verifyPDF', () => {
  const pdf = Buffer.from('%PDF-1.7 original authentic content');
  let signed;

  beforeAll(() => {
    signed = signPDF(pdf);
  });

  it('validates an untampered PDF (hash + signature)', () => {
    const v = verifyPDF(pdf, signed.hash, signed.signature, signed.certPem);
    expect(v.hashMatch).toBe(true);
    expect(v.signatureValid).toBe(true);
  });

  it('detects a tampered PDF body via hash mismatch', () => {
    const tampered = Buffer.from('%PDF-1.7 MALICIOUSLY altered content');
    const v = verifyPDF(tampered, signed.hash, signed.signature, signed.certPem);
    expect(v.hashMatch).toBe(false);
    expect(v.currentHash).not.toBe(signed.hash);
  });

  it('rejects a corrupted signature', () => {
    const badSig = signed.signature.slice(0, -8) + 'AAAAAAAA';
    const v = verifyPDF(pdf, signed.hash, badSig, signed.certPem);
    expect(v.signatureValid).toBe(false);
  });

  it('rejects when the stored hash was altered (signature no longer matches)', () => {
    const altObj = `${signed.hash.slice(0, -1)}${signed.hash.endsWith('a') ? 'b' : 'a'}`;
    const v = verifyPDF(pdf, altObj, signed.signature, signed.certPem);
    expect(v.signatureValid).toBe(false);
  });

  it('returns signatureValid=false instead of throwing on a malformed cert', () => {
    const v = verifyPDF(pdf, signed.hash, signed.signature, 'not-a-real-pem');
    expect(v.signatureValid).toBe(false);
  });
});
