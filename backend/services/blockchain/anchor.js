/**
 * anchor.js
 * Layer 4 — OpenTimestamps Bitcoin anchoring (free, no DevOps, no wallet).
 *
 * Submits the SHA-256 hash to the public OTS calendar servers.
 * Returns the serialized .ots proof bytes (Buffer) to store in MongoDB.
 *
 * The proof starts as "pending" (Bitcoin not yet mined).
 * Call upgradestamp() later (e.g., after 1 hour) to get the confirmed proof.
 */
const OpenTimestamps = require('javascript-opentimestamps');

/**
 * Submit hash to OTS calendar. Returns { otsBytes: Buffer, status: 'pending' }.
 * @param {string} hashHex - SHA-256 hex string of the document
 */
async function stampHash(hashHex) {
  try {
    const hashBytes = Buffer.from(hashHex, 'hex');

    // Create a DetachedTimestampFile for a raw SHA-256 hash
    const detached = OpenTimestamps.DetachedTimestampFile.fromHash(
      new OpenTimestamps.Ops.OpSHA256(),
      hashBytes
    );

    // Submit to public calendar servers (alice, bob, finney)
    await OpenTimestamps.stamp(detached);

    const otsBytes = Buffer.from(detached.serializeToBytes());
    console.log(
      `[OTS] Timestamp submitted for hash ${hashHex.slice(0, 16)}… (${otsBytes.length} bytes)`
    );
    return { otsBytes, status: 'pending' };
  } catch (err) {
    console.error('[OTS] Stamp failed (non-critical):', err.message);
    return { otsBytes: null, status: 'unavailable' };
  }
}

/**
 * Upgrade an existing .ots proof to include Bitcoin block proof.
 * @param {Buffer} otsBytes - previously stored proof bytes
 * @returns {{ otsBytes: Buffer, status: 'confirmed'|'pending'|'unavailable' }}
 */
async function upgradeStamp(otsBytes) {
  try {
    const detached = OpenTimestamps.DetachedTimestampFile.deserialize(
      new OpenTimestamps.Context.StreamDeserializationContext(otsBytes)
    );

    const changed = await OpenTimestamps.upgrade(detached);
    const newBytes = Buffer.from(detached.serializeToBytes());

    if (changed) {
      console.log('[OTS] Timestamp upgraded — Bitcoin confirmation received');
      return { otsBytes: newBytes, status: 'confirmed' };
    } else {
      console.log('[OTS] Timestamp not yet confirmed on Bitcoin');
      return { otsBytes: newBytes, status: 'pending' };
    }
  } catch (err) {
    console.error('[OTS] Upgrade failed (non-critical):', err.message);
    return { otsBytes, status: 'pending' };
  }
}

module.exports = { stampHash, upgradeStamp };
