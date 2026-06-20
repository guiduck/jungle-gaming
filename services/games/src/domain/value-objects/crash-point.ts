import { DomainError } from "../errors/domain-error";

export class CrashPoint {
  private constructor(public readonly multiplierBps: number) {}

  static fromBasisPoints(multiplierBps: number): CrashPoint {
    if (!Number.isInteger(multiplierBps) || multiplierBps < 10000) {
      throw new DomainError("Crash point must be at least 1.00x");
    }

    return new CrashPoint(multiplierBps);
  }
}
