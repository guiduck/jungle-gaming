import { BadRequestException } from "@nestjs/common";
import { describe, expect, test } from "bun:test";
import { parseLeaderboardMetric, parseReadLimit } from "../../../src/presentation/read-query-params";

describe("read query params", () => {
  test("parses leaderboard metrics", () => {
    expect(parseLeaderboardMetric(undefined)).toBe("payout");
    expect(parseLeaderboardMetric("payout")).toBe("payout");
    expect(parseLeaderboardMetric("multiplier")).toBe("multiplier");
    expect(() => parseLeaderboardMetric("volume")).toThrow(BadRequestException);
  });

  test("parses bounded limits", () => {
    expect(parseReadLimit(undefined, 20, 50)).toBe(20);
    expect(parseReadLimit("1", 20, 50)).toBe(1);
    expect(parseReadLimit("50", 20, 50)).toBe(50);
    expect(() => parseReadLimit("0", 20, 50)).toThrow(BadRequestException);
    expect(() => parseReadLimit("51", 20, 50)).toThrow(BadRequestException);
    expect(() => parseReadLimit("1.5", 20, 50)).toThrow(BadRequestException);
  });
});
