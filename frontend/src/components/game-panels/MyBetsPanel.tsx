import { betOutcomeLabel } from "../../services/read-model-display";
import type { ItemsResponse, PlayerBetHistoryEntry } from "../../types";
import { cents, multiplier } from "../../utils/formatters";

export function MyBetsPanel({ myBets }: { myBets?: ItemsResponse<PlayerBetHistoryEntry> }) {
  const myBetItems = myBets?.items ?? [];
  const hasMyBets = myBetItems.length > 0;

  return (
    <section className="panel bets my-bets-panel" data-smoke="my-bets-panel">
      <h2>Minhas apostas</h2>
      {hasMyBets && (
        <ul>
          {myBetItems.map((item) => (
            <li key={`${item.roundId}:${item.betId}`}>
              <span>{item.roundId}</span>
              <strong>{cents(item.amountCents)}</strong>
              <em>{betOutcomeLabel(item)}</em>
              <small>
                {multiplier(item.crashMultiplierBps)}
                {item.payoutCents ? ` / ${cents(item.payoutCents)}` : ""}
              </small>
            </li>
          ))}
        </ul>
      )}
      {!hasMyBets && <p>Nenhuma aposta do jogador ainda.</p>}
    </section>
  );
}
