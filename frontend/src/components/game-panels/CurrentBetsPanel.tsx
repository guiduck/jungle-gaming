import { betOutcomeLabel } from "../../services/read-model-display";
import type { Round } from "../../types";
import { cents } from "../../utils/formatters";

export function CurrentBetsPanel({ round }: { round?: Round }) {
  const currentBets = round?.bets ?? [];
  const hasCurrentBets = currentBets.length > 0;
  const isBettingRound = round?.status === "betting";

  return (
    <section className="panel bets current-bets" data-smoke="current-bets">
      <h2>Apostas atuais</h2>
      {hasCurrentBets && (
        <ul>
          {currentBets.map((bet) => (
            <li key={bet.id}>
              <span>{bet.playerId}</span>
              <strong>{cents(bet.amountCents)}</strong>
              <em>{betOutcomeLabel(bet)}</em>
              {isBettingRound && (
                <small>{bet.ready ? "pronto" : "aguardando pronto"}</small>
              )}
            </li>
          ))}
        </ul>
      )}
      {!hasCurrentBets && <p>Nenhuma aposta ainda.</p>}
    </section>
  );
}
