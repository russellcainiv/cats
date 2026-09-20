/**
 * Command Idempotency and Receipt Tracking
 */

import { CommandReceipt, MAX_RECEIPTS_LOG_SIZE } from '../state';

export function findReceipt(receipts: readonly CommandReceipt[], commandId: string): CommandReceipt | undefined {
  return receipts.find((r) => r.commandId === commandId);
}

function canonicalizeJson(value: unknown): unknown {
  if (value === null || typeof value !== 'object') {
    return value;
  }
  if (Array.isArray(value)) {
    return value.map(canonicalizeJson);
  }
  const sortedKeys = Object.keys(value as Record<string, unknown>).sort();
  const result: Record<string, unknown> = {};
  for (const key of sortedKeys) {
    result[key] = canonicalizeJson((value as Record<string, unknown>)[key]);
  }
  return result;
}

export function createReceipt(
  commandId: string,
  simMinute: number,
  actorId: string,
  type: string,
  success: boolean,
  payload: unknown
): CommandReceipt {
  // Canonical deterministic hash of payload for verification (independent of JSON key order)
  const canonicalPayload = canonicalizeJson(payload ?? {});
  const payloadStr = JSON.stringify(canonicalPayload);
  let hashNum = 0;
  for (let i = 0; i < payloadStr.length; i++) {
    hashNum = (Math.imul(31, hashNum) + payloadStr.charCodeAt(i)) | 0;
  }
  const receiptChecksum = `chk_${(hashNum >>> 0).toString(16)}`;

  return {
    commandId,
    simMinute,
    actorId,
    type,
    success,
    receiptChecksum,
  };
}

export function appendReceipt(
  receipts: readonly CommandReceipt[],
  receipt: CommandReceipt,
  maxReceipts: number = MAX_RECEIPTS_LOG_SIZE
): CommandReceipt[] {
  const filtered = receipts.filter((r) => r.commandId !== receipt.commandId);
  const updated = [...filtered, receipt];
  if (updated.length > maxReceipts) {
    return updated.slice(updated.length - maxReceipts);
  }
  return updated;
}
