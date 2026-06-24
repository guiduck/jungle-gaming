import { shortPlayerId } from "../../services/read-model-display";
import type { LeaderboardResponse } from "../../types";
import { cashoutTriggerLabel, cents, multiplier } from "../../utils/formatters";

export function LeaderboardPanel({ leaderboard }: { leaderboard?: LeaderboardResponse }) {
  const leaderboardItems = leaderboard?.items ?? [];
  const hasLeaderboardItems = leaderboardItems.length > 0;

  return (
    <section className="panel bets leaderboard-panel" data-smoke="leaderboard-panel">
      <h2>Ranking</h2>
      {hasLeaderboardItems && (
        <ul>
          {leaderboardItems.map((entry) => (
            <li key={`${entry.roundId}:${entry.betId}`}>
              <span>#{entry.rank} {shortPlayerId(entry.playerId)}</span>
              <strong>{cents(entry.payoutCents)}</strong>
              <em>{multiplier(entry.cashoutMultiplierBps)}</em>
              <small>{cashoutTriggerLabel(entry.cashoutTrigger)} / {entry.roundId}</small>
            </li>
          ))}
        </ul>
      )}
      {!hasLeaderboardItems && <p>Nenhum saque vencedor ainda.</p>}
    </section>
  );
}
