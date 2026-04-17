/**
 * signAndHash.js
 * Layer 1 — PKI digital signature (RSA-SHA256 over SHA-256 of the PDF)
 * Layer 2 — SHA-256 fingerprint stored in MongoDB
 *
 * Returns: { hash, signature, certCN, certPem, signedAt }
 */
const crypto = require('crypto');
const forge  = require('node-forge');
const { loadOrCreateCert } = require('./certManager');

/**
 * @param {Buffer} pdfBuffer - Raw PDF bytes
 * @returns {{ hash: string, signature: string, certCN: string, certPem: string, signedAt: Date }}
 */
function signPDF(pdfBuffer) {
  // Layer 2 — SHA-256 hash
  const hash = crypto.createHash('sha256').update(pdfBuffer).digest('hex');

  // Layer 1 — RSA-SHA256 signature over the hash
  const { privateKey, certPem, certificate } = loadOrCreateCert();

  const md = forge.md.sha256.create();
  md.update(Buffer.from(hash, 'hex').toString('binary'));
  const signatureBytes = privateKey.sign(md);
  const signature = forge.util.encode64(signatureBytes);

  const certCN = certificate.subject.getField('CN')?.value || 'Tac-Tic ERM';

  return {
    hash,
    signature,
    certCN,
    certPem,
    signedAt: new Date(),
  };
}

/**
 * Verify a PDF buffer against stored hash + signature.
 * @returns {{ hashMatch: boolean, signatureValid: boolean, details: object }}
 */
function verifyPDF(pdfBuffer, storedHash, storedSignature, storedCertPem) {
  // Re-compute hash
  const currentHash = crypto.createHash('sha256').update(pdfBuffer).digest('hex');
  const hashMatch   = currentHash === storedHash;

  let signatureValid = false;
  try {
    const cert      = forge.pki.certificateFromPem(storedCertPem);
    const md        = forge.md.sha256.create();
    md.update(Buffer.from(storedHash, 'hex').toString('binary'));
    const sigBytes  = forge.util.decode64(storedSignature);
    signatureValid  = cert.publicKey.verify(md.digest().bytes(), sigBytes);
  } catch {
    signatureValid = false;
  }

  return { hashMatch, signatureValid, currentHash };
}

module.exports = { signPDF, verifyPDF };
