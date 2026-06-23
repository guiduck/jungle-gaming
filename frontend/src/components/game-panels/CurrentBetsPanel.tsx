import { betOutcomeLabel } from "../../services/read-model-display";
import type { Round } from "../../types";
import { cents } from "./panel-formatters";

export function CurrentBetsPanel({ round }: { round?: Round }) {
  return (
    <section className="panel bets current-bets" data-smoke="current-bets">
      <h2>Apostas atuais</h2>
      {round?.bets.length ? (
        <ul>
          {round.bets.map((bet) => (
            <li key={bet.id}>
              <span>{bet.playerId}</span>
              <strong>{cents(bet.amountCents)}</strong>
              <em>{betOutcomeLabel(bet)}</em>
              {round.status === "betting" ? (
                <small>{bet.ready ? "pronto" : "aguardando pronto"}</small>
              ) : null}
            </li>
          ))}
        </ul>
      ) : (
        <p>Nenhuma aposta ainda.</p>
      )}
    </section>
  );
}
