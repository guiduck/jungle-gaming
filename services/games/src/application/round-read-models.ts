import type { BetSnapshot, RoundSnapshot } from "../domain";
import type {
  CompletedRoundRecord,
  LeaderboardEntry,
  LeaderboardMetric,
  PlayerBetHistoryEntry,
  RoundHistorySummary,
  RoundNotableBet,
} from "./ports/game-ports";

export interface CompletedRoundSnapshot {
  round: RoundSnapshot;
  completed: CompletedRoundRecord;
  settledAt?: string;
}

export function toRoundHistorySummary(input: CompletedRoundSnapshot): RoundHistorySummary {
  const bets = input.round.bets;
  const cashedOutBets = bets.filter((bet) => bet.status === "cashed_out");

  return {
    id: input.round.id,
    crashMultiplierBps: input.completed.crashMultiplierBps,
    crashedAt: input.completed.crashedAt,
    settledAt: input.settledAt,
    acceptedBetCount: bets.length,
    cashedOutBetCount: cashedOutBets.length,
    lostBetCount: bets.filter((bet) => bet.status === "lost").length,
    totalWageredCents: sum(bets.map((bet) => bet.amountCents)),
    totalPayoutCents: sum(cashedOutBets.map((bet) => bet.payoutCents ?? 0)),
    verificationAvailable: Boolean(input.completed.serverSeed),
    notableBets: toNotableBets(cashedOutBets),
  };
}

export function toLeaderboard(
  inputs: CompletedRoundSnapshot[],
  limit: number,
  metric: LeaderboardMetric,
): LeaderboardEntry[] {
  return inputs
    .flatMap(({ round, completed }) =>
      round.bets
        .filter((bet) =>
          bet.status === "cashed_out" &&
          bet.payoutCents !== undefined &&
          bet.cashoutMultiplierBps !== undefined
        )
        .map((bet) => ({
          rank: 0,
          playerId: bet.playerId,
          roundId: round.id,
          betId: bet.id,
          amountCents: bet.amountCents,
          payoutCents: bet.payoutCents ?? 0,
          cashoutMultiplierBps: bet.cashoutMultiplierBps ?? 0,
          cashoutTrigger: bet.cashoutTrigger,
          autoCashoutMultiplierBps: bet.autoCashoutMultiplierBps,
          crashMultiplierBps: completed.crashMultiplierBps,
          crashedAt: completed.crashedAt,
        })),
    )
    .sort((left, right) => compareLeaderboard(left, right, metric))
    .slice(0, limit)
    .map((entry, index) => ({ ...entry, rank: index + 1 }));
}

export function toPlayerBetHistory(
  rounds: Array<{ round: RoundSnapshot; completed?: CompletedRoundRecord }>,
  playerId: string,
  limit: number,
): PlayerBetHistoryEntry[] {
  return rounds
    .flatMap(({ round, completed }) =>
      round.bets
        .filter((bet) => bet.playerId === playerId)
        .map((bet) => ({
          roundId: round.id,
          betId: bet.id,
          amountCents: bet.amountCents,
          status: bet.status,
          crashMultiplierBps: completed?.crashMultiplierBps ?? round.crashMultiplierBps,
          autoCashoutMultiplierBps: bet.autoCashoutMultiplierBps,
          cashoutMultiplierBps: bet.cashoutMultiplierBps,
          payoutCents: bet.payoutCents,
          cashoutTrigger: bet.cashoutTrigger,
          crashedAt: completed?.crashedAt,
        })),
    )
    .slice(0, limit);
}

function toNotableBets(bets: BetSnapshot[]): RoundNotableBet[] {
  return [...bets]
    .sort((left, right) =>
      (right.payoutCents ?? 0) - (left.payoutCents ?? 0) ||
      (right.cashoutMultiplierBps ?? 0) - (left.cashoutMultiplierBps ?? 0) ||
      left.id.localeCompare(right.id)
    )
    .slice(0, 3)
    .map((bet) => ({
      betId: bet.id,
      playerId: bet.playerId,
      amountCents: bet.amountCents,
      status: bet.status,
      cashoutMultiplierBps: bet.cashoutMultiplierBps,
      payoutCents: bet.payoutCents,
      autoCashoutMultiplierBps: bet.autoCashoutMultiplierBps,
      cashoutTrigger: bet.cashoutTrigger,
    }));
}

function compareLeaderboard(
  left: LeaderboardEntry,
  right: LeaderboardEntry,
  metric: LeaderboardMetric,
): number {
  if (metric === "multiplier") {
    return (
      right.cashoutMultiplierBps - left.cashoutMultiplierBps ||
      right.payoutCents - left.payoutCents ||
      Date.parse(right.crashedAt) - Date.parse(left.crashedAt) ||
      left.betId.localeCompare(right.betId)
    );
  }

  return (
    right.payoutCents - left.payoutCents ||
    right.cashoutMultiplierBps - left.cashoutMultiplierBps ||
    Date.parse(right.crashedAt) - Date.parse(left.crashedAt) ||
    left.betId.localeCompare(right.betId)
  );
}

function sum(values: number[]): number {
  return values.reduce((total, value) => total + value, 0);
}
