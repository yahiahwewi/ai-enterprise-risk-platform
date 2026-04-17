/**
 * certManager.js
 * Auto-generates a self-signed RSA-2048 certificate + private key for PDF signing.
 * Files are written once to /backend/certs/ and reused on every subsequent call.
 * Zero cost — uses node-forge, no OpenSSL, no CA.
 */
const forge = require('node-forge');
const fs    = require('fs');
const path  = require('path');

const CERTS_DIR  = path.resolve(__dirname, '../../certs');
const KEY_FILE   = path.join(CERTS_DIR, 'signing.key.pem');
const CERT_FILE  = path.join(CERTS_DIR, 'signing.cert.pem');

let _cache = null; // { privateKey, certificate, certPem }

function generateSelfSignedCert() {
  const keys = forge.pki.rsa.generateKeyPair(2048);
  const cert = forge.pki.createCertificate();

  cert.publicKey    = keys.publicKey;
  cert.serialNumber = '01';
  cert.validity.notBefore = new Date();
  cert.validity.notAfter  = new Date();
  cert.validity.notAfter.setFullYear(cert.validity.notBefore.getFullYear() + 10);

  const attrs = [
    { name: 'commonName',         value: 'Tac-Tic ERM Report Signer' },
    { name: 'organizationName',   value: 'Tac-Tic' },
    { name: 'countryName',        value: 'TN' },
  ];
  cert.setSubject(attrs);
  cert.setIssuer(attrs); // self-signed

  cert.setExtensions([
    { name: 'basicConstraints', cA: false },
    { name: 'keyUsage', digitalSignature: true, nonRepudiation: true },
  ]);

  cert.sign(keys.privateKey, forge.md.sha256.create());

  return {
    privateKey:  keys.privateKey,
    certificate: cert,
    certPem:     forge.pki.certificateToPem(cert),
    keyPem:      forge.pki.privateKeyToPem(keys.privateKey),
  };
}

function loadOrCreateCert() {
  if (_cache) return _cache;

  if (!fs.existsSync(CERTS_DIR)) {
    fs.mkdirSync(CERTS_DIR, { recursive: true });
  }

  if (fs.existsSync(KEY_FILE) && fs.existsSync(CERT_FILE)) {
    // Load existing
    const keyPem  = fs.readFileSync(KEY_FILE,  'utf8');
    const certPem = fs.readFileSync(CERT_FILE, 'utf8');
    _cache = {
      privateKey:  forge.pki.privateKeyFromPem(keyPem),
      certificate: forge.pki.certificateFromPem(certPem),
      certPem,
      keyPem,
    };
    console.log('[CERT] Loaded existing signing certificate');
  } else {
    // Generate and persist
    const result = generateSelfSignedCert();
    fs.writeFileSync(KEY_FILE,  result.keyPem,  'utf8');
    fs.writeFileSync(CERT_FILE, result.certPem, 'utf8');
    _cache = result;
    console.log('[CERT] Generated new self-signed signing certificate');
  }

  return _cache;
}

module.exports = { loadOrCreateCert };
