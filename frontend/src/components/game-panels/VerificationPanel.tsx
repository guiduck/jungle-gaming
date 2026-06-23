import type { CompletedRound } from "../../types";

export function VerificationPanel({ verification }: { verification?: CompletedRound }) {
  return (
    <section className="panel verify" data-smoke="verification-panel">
      <h2>Verificacao</h2>
      {verification ? (
        <dl>
          <dt>Rodada</dt>
          <dd>{verification.id}</dd>
          <dt>Hash da seed</dt>
          <dd>{verification.serverSeedHash}</dd>
          <dt>Seed</dt>
          <dd>{verification.serverSeed}</dd>
          <dt>Nonce</dt>
          <dd>{verification.nonce}</dd>
          <dt>Formula</dt>
          <dd>
            {verification.formula.commitmentAlgorithm} / {verification.formula.crashAlgorithm}
          </dd>
        </dl>
      ) : (
        <p>Complete uma rodada para revelar os dados de verificacao.</p>
      )}
    </section>
  );
}
