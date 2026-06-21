export const AUTO_CASHOUT_MIN_BPS = 11000;
export const AUTO_CASHOUT_MAX_BPS = 1000000;

export function formatMultiplierBps(multiplierBps: number): string {
  return `${(multiplierBps / 10000).toFixed(2)}x`;
}

export function parseMultiplierInputToBps(value: string): number | null {
  const normalized = value.trim().replace(/x$/i, "");
  if (!normalized) {
    return null;
  }

  const multiplier = Number(normalized);
  if (!Number.isFinite(multiplier)) {
    return null;
  }

  const basisPoints = Math.round(multiplier * 10000);
  if (
    !Number.isInteger(basisPoints) ||
    basisPoints < AUTO_CASHOUT_MIN_BPS ||
    basisPoints > AUTO_CASHOUT_MAX_BPS
  ) {
    return null;
  }

  return basisPoints;
}
