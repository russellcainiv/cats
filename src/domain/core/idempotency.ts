/**
 * Command Idempotency and Receipt Tracking
 */

import { CommandReceipt, MAX_RECEIPTS_LOG_SIZE } from '../state';

export function findReceipt(receipts: readonly CommandReceipt[], commandId: string): CommandReceipt | undefined {
  return receipts.find((r) => r.commandId === commandId);
}

export function createReceipt(
  commandId: string,
  simMinute: number,
  actorId: string,
  type: string,
  success: boolean,
  payload: unknown
): CommandReceipt {
  // Simple deterministic hash of payload for verification
  const payloadStr = JSON.stringify(payload ?? {});
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
  const updated = [...receipts, receipt];
  if (updated.length > maxReceipts) {
    return updated.slice(updated.length - maxReceipts);
  }
  return updated;
}
