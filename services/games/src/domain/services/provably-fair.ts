import { createHash, createHmac } from "crypto";
import { CrashPoint } from "../value-objects/crash-point";

const DEFAULT_HOUSE_EDGE_BPS = 100;
const HMAC_SAMPLE_HEX_CHARS = 13;
const HMAC_SAMPLE_MAX = 0xfffffffffffff;
const MIN_CRASH_MULTIPLIER_BPS = 10000;
export const MAX_CRASH_MULTIPLIER_BPS = 140000;

export interface ProvablyFairRound {
  serverSeed: string;
  serverSeedHash: string;
  nonce: string;
  crashPoint: CrashPoint;
  houseEdgeBps: number;
}

export class ProvablyFair {
  static hashSeed(serverSeed: string): string {
    return createHash("sha256").update(serverSeed).digest("hex");
  }

  static createRound(
    serverSeed: string,
    nonce: string,
    houseEdgeBps = DEFAULT_HOUSE_EDGE_BPS,
  ): ProvablyFairRound {
    return {
      serverSeed,
      serverSeedHash: ProvablyFair.hashSeed(serverSeed),
      nonce,
      crashPoint: ProvablyFair.calculateCrashPoint(serverSeed, nonce, houseEdgeBps),
      houseEdgeBps,
    };
  }

  static calculateCrashPoint(
    serverSeed: string,
    nonce: string,
    houseEdgeBps = DEFAULT_HOUSE_EDGE_BPS,
  ): CrashPoint {
    const digest = createHmac("sha256", serverSeed).update(nonce).digest("hex");
    const sample = Number.parseInt(digest.slice(0, HMAC_SAMPLE_HEX_CHARS), 16);
    const ratio = sample / HMAC_SAMPLE_MAX;
    const edge = (10000 - houseEdgeBps) / 10000;
    const multiplier = Math.max(1, edge / Math.max(0.000001, 1 - ratio));
    const uncappedCrashPointBps = Math.max(MIN_CRASH_MULTIPLIER_BPS, Math.floor(multiplier * 10000));
    return CrashPoint.fromBasisPoints(ProvablyFair.applyCrashPointCeiling(uncappedCrashPointBps, digest));
  }

  static verify(
    serverSeed: string,
    expectedHash: string,
    nonce: string,
    expectedCrashPointBps: number,
    houseEdgeBps = DEFAULT_HOUSE_EDGE_BPS,
  ): boolean {
    return (
      ProvablyFair.hashSeed(serverSeed) === expectedHash &&
      ProvablyFair.calculateCrashPoint(serverSeed, nonce, houseEdgeBps).multiplierBps ===
        expectedCrashPointBps
    );
  }

  private static applyCrashPointCeiling(uncappedCrashPointBps: number, digest: string): number {
    if (uncappedCrashPointBps <= MAX_CRASH_MULTIPLIER_BPS) {
      return uncappedCrashPointBps;
    }

    const ceilingSampleStart = HMAC_SAMPLE_HEX_CHARS;
    const ceilingSample = Number.parseInt(
      digest.slice(ceilingSampleStart, ceilingSampleStart + HMAC_SAMPLE_HEX_CHARS),
      16,
    );
    const ceilingRatio = ceilingSample / HMAC_SAMPLE_MAX;
    const boundedRangeBps = MAX_CRASH_MULTIPLIER_BPS - MIN_CRASH_MULTIPLIER_BPS;
    const boundedCrashPointBps =
      MIN_CRASH_MULTIPLIER_BPS + Math.floor(ceilingRatio * boundedRangeBps);

    return Math.min(MAX_CRASH_MULTIPLIER_BPS - 1, boundedCrashPointBps);
  }
}
