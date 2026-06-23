import { randomBytes } from "crypto";

const DEMO_SEED = "jungle-smoke-seed-2026";
const DEMO_NONCE = "smoke-round";

export function serverSeedForRound(roundId: string): string {
  if (isDemoDeterministicRoundsEnabled()) {
    return process.env.DEMO_ROUND_SERVER_SEED || DEMO_SEED;
  }

  return randomBytes(32).toString("hex");
}

export function legacyPredictableServerSeedForRound(roundId: string): string {
  return `server-seed-${roundId}`;
}

export function nonceForRound(roundId: string): string {
  if (isDemoDeterministicRoundsEnabled()) {
    return process.env.DEMO_ROUND_NONCE || DEMO_NONCE;
  }

  return roundId;
}

export function isDemoDeterministicRoundsEnabled(): boolean {
  return process.env.DEMO_DETERMINISTIC_ROUNDS === "true";
}
