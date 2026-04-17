/**
 * invoiceIntegrity.js
 * Computes and verifies the SHA-256 fingerprint of an invoice's key content fields.
 * Allows detecting whether an invoice was edited after its initial creation.
 */
const crypto = require('crypto');

// Fields that define the "identity" of an invoice.
// Status, workflowStatus, notes, etc. are intentionally excluded —
// those can legitimately change (mark as paid, approve...).
const INTEGRITY_FIELDS = ['clientName', 'amount', 'issueDate', 'dueDate', 'description', 'reference', 'category'];

/**
 * Build a deterministic snapshot object from an invoice.
 */
function buildSnapshot(invoice) {
  const snap = {};
  for (const f of INTEGRITY_FIELDS) {
    let v = invoice[f];
    // Normalise dates to ISO string so formatting differences don't cause false positives
    if (v instanceof Date) v = v.toISOString();
    else if (v && typeof v === 'string' && !isNaN(Date.parse(v)) && f.toLowerCase().includes('date')) v = new Date(v).toISOString();
    snap[f] = v ?? '';
  }
  return snap;
}

/**
 * Compute SHA-256 hash of the snapshot.
 */
function computeHash(invoice) {
  const snapshot = buildSnapshot(invoice);
  return {
    hash: crypto.createHash('sha256').update(JSON.stringify(snapshot)).digest('hex'),
    snapshot,
  };
}

/**
 * Compare current invoice state against its stored hash.
 * @returns {{ intact: boolean, storedHash: string, currentHash: string, changedFields: string[], snapshot: object, currentSnapshot: object }}
 */
function checkIntegrity(invoice) {
  if (!invoice.integrityHash) {
    return { intact: null, reason: 'no_hash', storedHash: null, currentHash: null, changedFields: [], snapshot: null };
  }

  const { hash: currentHash, snapshot: currentSnapshot } = computeHash(invoice);
  const intact = currentHash === invoice.integrityHash;

  // Find which fields changed (for display)
  const changedFields = [];
  if (!intact && invoice.integritySnapshot) {
    for (const f of INTEGRITY_FIELDS) {
      const orig = String(invoice.integritySnapshot[f] ?? '');
      const curr = String(currentSnapshot[f] ?? '');
      if (orig !== curr) changedFields.push(f);
    }
  }

  return {
    intact,
    storedHash:      invoice.integrityHash,
    currentHash,
    hashedAt:        invoice.integrityHashedAt,
    changedFields,
    snapshot:        invoice.integritySnapshot || null,
    currentSnapshot,
  };
}

module.exports = { computeHash, checkIntegrity, INTEGRITY_FIELDS, buildSnapshot };
