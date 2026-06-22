import { BadRequestException } from "@nestjs/common";
import type { LeaderboardMetric } from "../application/ports/game-ports";

export function parseReadLimit(
  value: string | undefined,
  defaultValue: number,
  maxValue: number,
): number {
  if (value === undefined) {
    return defaultValue;
  }

  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed < 1 || parsed > maxValue) {
    throw new BadRequestException(`limit must be an integer between 1 and ${maxValue}`);
  }

  return parsed;
}

export function parseLeaderboardMetric(value: string | undefined): LeaderboardMetric {
  if (value === undefined || value === "payout") {
    return "payout";
  }

  if (value === "multiplier") {
    return "multiplier";
  }

  throw new BadRequestException("metric must be payout or multiplier");
}
