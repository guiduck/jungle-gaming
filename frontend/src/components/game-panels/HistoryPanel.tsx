import type { ItemsResponse, RoundHistorySummary } from "../../types";
import { cents, multiplier } from "../../utils/formatters";

export function HistoryPanel({ history }: { history?: ItemsResponse<RoundHistorySummary> }) {
  const historyItems = history?.items ?? [];
  const hasHistory = historyItems.length > 0;

  return (
    <section className="panel bets history-panel" data-smoke="history-panel">
      <h2>Historico</h2>
      {hasHistory && (
        <ul>
          {historyItems.slice(0, 5).map((item) => (
            <li key={item.id}>
              <span>{item.id}</span>
              <strong>{multiplier(item.crashMultiplierBps)}</strong>
              <em>
                {item.acceptedBetCount} apostas / {cents(item.totalPayoutCents)}
              </em>
              <small>
                {item.cashedOutBetCount} saques, {item.lostBetCount} perdidas
              </small>
            </li>
          ))}
        </ul>
      )}
      {!hasHistory && <p>Nenhuma rodada concluida ainda.</p>}
    </section>
  );
}
