import { createHash, createHmac } from "crypto";
import { CrashPoint } from "../value-objects/crash-point";

const DEFAULT_HOUSE_EDGE_BPS = 100;

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
    const sample = Number.parseInt(digest.slice(0, 13), 16);
    const ratio = sample / 0x1fffffffffffff;
    const edge = (10000 - houseEdgeBps) / 10000;
    const multiplier = Math.max(1, edge / Math.max(0.000001, 1 - ratio));
    return CrashPoint.fromBasisPoints(Math.max(10000, Math.floor(multiplier * 10000)));
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
}
