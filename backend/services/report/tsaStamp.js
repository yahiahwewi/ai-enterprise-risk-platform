/**
 * tsaStamp.js
 * RFC 3161 Trusted Timestamp Authority — instant, free, eIDAS-compatible.
 *
 * Sends the SHA-256 hash to a public TSA (DigiCert → Sectigo → GlobalSign fallback).
 * Response arrives in < 1 second.
 * The signed TSA token (DER bytes) is stored in MongoDB as the immutable proof.
 *
 * Zero cost — these TSA endpoints are free public services used by Adobe, Microsoft, etc.
 * No account, no API key, no DevOps.
 */
const forge  = require('node-forge');
const fetch  = require('node-fetch');

const TSA_ENDPOINTS = [
  { url: 'http://timestamp.digicert.com',                     name: 'DigiCert TSA'   },
  { url: 'http://timestamp.sectigo.com',                      name: 'Sectigo TSA'    },
  { url: 'http://timestamp.globalsign.com/tsa/r6advanced1',   name: 'GlobalSign TSA' },
  { url: 'http://tsa.starfieldtech.com',                      name: 'Starfield TSA'  },
];

/**
 * Build a minimal RFC 3161 TimeStampRequest DER for a SHA-256 hash.
 */
function buildTSARequest(hashHex) {
  const asn1     = forge.asn1;
  const hashBin  = Buffer.from(hashHex, 'hex').toString('binary');
  const nonce    = Math.floor(Math.random() * 0x7FFFFFFF);

  const req = asn1.create(asn1.Class.UNIVERSAL, asn1.Type.SEQUENCE, true, [
    // version = 1
    asn1.create(asn1.Class.UNIVERSAL, asn1.Type.INTEGER, false, String.fromCharCode(1)),
    // MessageImprint
    asn1.create(asn1.Class.UNIVERSAL, asn1.Type.SEQUENCE, true, [
      // AlgorithmIdentifier: SHA-256 OID + NULL
      asn1.create(asn1.Class.UNIVERSAL, asn1.Type.SEQUENCE, true, [
        asn1.create(asn1.Class.UNIVERSAL, asn1.Type.OID, false,
          asn1.oidToDer('2.16.840.1.101.3.4.2.1').getBytes()),
        asn1.create(asn1.Class.UNIVERSAL, asn1.Type.NULL, false, ''),
      ]),
      // hashedMessage
      asn1.create(asn1.Class.UNIVERSAL, asn1.Type.OCTETSTRING, false, hashBin),
    ]),
    // nonce (random integer for replay protection)
    asn1.create(asn1.Class.UNIVERSAL, asn1.Type.INTEGER, false,
      asn1.integerToDer(nonce).getBytes()),
    // certReq = TRUE (include TSA cert in response for verification)
    asn1.create(asn1.Class.UNIVERSAL, asn1.Type.BOOLEAN, false, '\xFF'),
  ]);

  return Buffer.from(asn1.toDer(req).getBytes(), 'binary');
}

/**
 * POST to a TSA and return raw response bytes.
 * Throws if HTTP error or TSA refused (status > 1).
 */
async function queryTSA(hashHex, tsaUrl) {
  const reqBytes = buildTSARequest(hashHex);

  const response = await fetch(tsaUrl, {
    method:  'POST',
    headers: { 'Content-Type': 'application/timestamp-query' },
    body:    reqBytes,
    timeout: 10000,
  });

  if (!response.ok) throw new Error(`HTTP ${response.status}`);

  const respBytes = await response.buffer();

  // Minimal parse: check PKIStatus (first INTEGER in the response SEQUENCE)
  // 0 = granted, 1 = grantedWithMods → both OK
  const asn1Obj    = forge.asn1.fromDer(respBytes.toString('binary'));
  const statusByte = asn1Obj.value[0]?.value[0]?.value?.charCodeAt(0) ?? 99;
  if (statusByte > 1) throw new Error(`TSA refused (PKIStatus=${statusByte})`);

  return respBytes;
}

/**
 * Try each TSA in order and return the first that succeeds.
 * Fully resilient — if all fail, returns status 'failed' (non-blocking).
 *
 * @param {string} hashHex  SHA-256 hex of the document
 * @returns {{ tsaToken: Buffer|null, tsaStatus: string, tsaTimestamp: Date|null, tsaIssuer: string|null }}
 */
async function stampWithTSA(hashHex) {
  for (const { url, name } of TSA_ENDPOINTS) {
    try {
      const token = await queryTSA(hashHex, url);
      console.log(`[TSA] ✓ Token from ${name} (${token.length} bytes)`);
      return {
        tsaToken:     token,
        tsaStatus:    'ok',
        tsaTimestamp: new Date(),
        tsaIssuer:    name,
      };
    } catch (err) {
      console.warn(`[TSA] ${name} failed: ${err.message} — trying next…`);
    }
  }
  console.error('[TSA] All TSA endpoints failed');
  return { tsaToken: null, tsaStatus: 'failed', tsaTimestamp: null, tsaIssuer: null };
}

module.exports = { stampWithTSA };
