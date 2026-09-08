/**
 * Attendance must not be markable if the phone's own date/time is wrong (e.g. someone trying to
 * game "late" detection by winding their clock back, or a phone with a dead battery that reset to
 * 1970). Rather than requiring a dedicated "what time is it" endpoint, every API response already
 * carries a standard HTTP `Date` header - we compare that against the device's own `Date.now()`
 * to estimate clock skew, and treat a large skew as "the phone's time is wrong".
 */

let skewMs = 0;
let hasSynced = false;

const MAX_ALLOWED_SKEW_MS = 3 * 60 * 1000; // 3 minutes of drift is tolerated (NTP jitter, etc.)

/** Called from the axios response interceptor for every successful response. */
export function recordServerDate(dateHeaderValue: unknown): void {
  if (typeof dateHeaderValue !== 'string' || !dateHeaderValue) return;
  const serverMs = new Date(dateHeaderValue).getTime();
  if (Number.isNaN(serverMs)) return;
  skewMs = serverMs - Date.now();
  hasSynced = true;
}

export function hasClockSync(): boolean {
  return hasSynced;
}

/** True only once we've actually compared against a server response and the drift is too large -
 * before the first successful response, this always reports false so we never falsely block. */
export function isDeviceClockWrong(): boolean {
  return hasSynced && Math.abs(skewMs) > MAX_ALLOWED_SKEW_MS;
}

export function getClockSkewMs(): number {
  return skewMs;
}
