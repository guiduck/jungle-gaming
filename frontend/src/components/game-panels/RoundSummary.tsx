import type { Round } from "../../types";
import { phaseLabel, revealedCrashPointLabel } from "./panel-formatters";

export interface RoundSummaryProps {
  isLoading: boolean;
  round?: Round;
}

export function RoundSummary({ isLoading, round }: RoundSummaryProps) {
  return (
    <section className="panel round-summary" data-smoke="round-phase">
      <h2>Rodada</h2>
      {isLoading ? <p>Carregando rodada...</p> : null}
      <dl>
        <dt>Rodada</dt>
        <dd>{round?.id}</dd>
        <dt>Fase</dt>
        <dd>{phaseLabel(round?.status)}</dd>
        <dt>Ponto de crash</dt>
        <dd>{revealedCrashPointLabel(round?.status, round?.crashMultiplierBps)}</dd>
      </dl>
    </section>
  );
}
