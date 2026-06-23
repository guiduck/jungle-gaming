import type { FormEvent } from "react";
import type { AutoBetStrategy } from "../../services/auto-bet";
import type { Bet, Round } from "../../types";
import { cashoutStateLabel, cents, errorMessage, multiplier } from "./panel-formatters";

export interface BettingControlsProps {
  amountCents: number;
  autoBetAccumulatedLossCents: number;
  autoBetCurrentAmountCents: number;
  autoBetEnabled: boolean;
  autoBetStopLossCents: number;
  autoBetStrategy: AutoBetStrategy;
  autoCashoutEnabled: boolean;
  autoCashoutMultiplierBps: number | null | undefined;
  autoCashoutTarget: string;
  authoritativeMultiplierBps: number;
  cashoutState: string;
  hasAcceptedBet: boolean;
  myBet?: Bet;
  myBetNeedsReady: boolean;
  placeBetError: unknown;
  placeBetPending: boolean;
  readyError: unknown;
  readyPending: boolean;
  round?: Round;
  onAmountChange: (value: number) => void;
  onAutoBetEnabledChange: (enabled: boolean) => void;
  onAutoBetStopLossChange: (value: number) => void;
  onAutoBetStrategyChange: (strategy: AutoBetStrategy) => void;
  onAutoCashoutEnabledChange: (enabled: boolean) => void;
  onAutoCashoutTargetChange: (value: string) => void;
  onBetSubmit: (event: FormEvent) => void;
  onCashout: () => void;
  onReady: () => void;
}

export function BettingControls({
  amountCents,
  autoBetAccumulatedLossCents,
  autoBetCurrentAmountCents,
  autoBetEnabled,
  autoBetStopLossCents,
  autoBetStrategy,
  autoCashoutEnabled,
  autoCashoutMultiplierBps,
  autoCashoutTarget,
  authoritativeMultiplierBps,
  cashoutState,
  hasAcceptedBet,
  myBet,
  myBetNeedsReady,
  placeBetError,
  placeBetPending,
  readyError,
  readyPending,
  round,
  onAmountChange,
  onAutoBetEnabledChange,
  onAutoBetStopLossChange,
  onAutoBetStrategyChange,
  onAutoCashoutEnabledChange,
  onAutoCashoutTargetChange,
  onBetSubmit,
  onCashout,
  onReady,
}: BettingControlsProps) {
  const betDisabled =
    round?.status !== "betting" ||
    hasAcceptedBet ||
    placeBetPending ||
    (autoCashoutEnabled && autoCashoutMultiplierBps === null);
  const cashoutDisabled = round?.status !== "running" || !myBet || myBet.status !== "pending";
  const payoutLabel = myBet
    ? cents(Math.floor((myBet.amountCents * authoritativeMultiplierBps) / 10000))
    : "";

  return (
    <section className="panel controls" data-smoke="betting-controls">
      <h2>Aposta</h2>
      <form onSubmit={onBetSubmit}>
        <label>
          Valor
          <input
            min={100}
            max={100000}
            step={100}
            type="number"
            value={amountCents}
            onChange={(event) => onAmountChange(Number(event.target.value))}
          />
        </label>
        <label className="check-row">
          <input
            type="checkbox"
            checked={autoCashoutEnabled}
            disabled={hasAcceptedBet}
            onChange={(event) => onAutoCashoutEnabledChange(event.target.checked)}
          />
          Saque automatico
        </label>
        {autoCashoutEnabled ? (
          <label>
            Alvo
            <input
              min={1.1}
              max={100}
              step={0.05}
              type="number"
              value={autoCashoutTarget}
              disabled={hasAcceptedBet}
              onChange={(event) => onAutoCashoutTargetChange(event.target.value)}
            />
          </label>
        ) : null}
        <button disabled={betDisabled}>
          {placeBetPending ? "Confirmando..." : hasAcceptedBet ? "Aposta ativa" : "Apostar"}
        </button>
      </form>
      <div className="auto-bet-box">
        <label className="check-row">
          <input
            type="checkbox"
            checked={autoBetEnabled}
            onChange={(event) => onAutoBetEnabledChange(event.target.checked)}
          />
          Auto bet
        </label>
        {autoBetEnabled ? (
          <div className="auto-bet-grid">
            <label>
              Estrategia
              <select
                value={autoBetStrategy}
                onChange={(event) =>
                  onAutoBetStrategyChange(event.target.value as AutoBetStrategy)
                }
              >
                <option value="fixed">Valor fixo</option>
                <option value="martingale">Martingale</option>
              </select>
            </label>
            <label>
              Stop-loss
              <input
                min={100}
                max={100000}
                step={100}
                type="number"
                value={autoBetStopLossCents}
                onChange={(event) => onAutoBetStopLossChange(Number(event.target.value))}
              />
            </label>
            <p className="status">
              Proxima: {cents(autoBetCurrentAmountCents)} / Perda:{" "}
              {cents(autoBetAccumulatedLossCents)}
            </p>
          </div>
        ) : null}
      </div>
      {myBetNeedsReady ? (
        <button className="ready-button" disabled={readyPending} onClick={onReady}>
          {readyPending ? "Marcando..." : "Pronto para comecar"}
        </button>
      ) : null}
      {round?.status === "betting" && myBet?.ready ? (
        <p className="status accepted">Pronto confirmado. Aguardando outros apostadores.</p>
      ) : null}
      {readyError ? (
        <p className="status rejected">
          {errorMessage(readyError, "Nao foi possivel marcar pronto.")}
        </p>
      ) : null}
      {placeBetError ? (
        <p className="status rejected">
          {errorMessage(placeBetError, "Nao foi possivel colocar a aposta.")}
        </p>
      ) : null}
      {myBet?.autoCashoutMultiplierBps && myBet.status === "pending" ? (
        <p className="status">Alvo automatico: {multiplier(myBet.autoCashoutMultiplierBps)}</p>
      ) : null}
      <button className="cashout" disabled={cashoutDisabled} onClick={onCashout}>
        Sacar {payoutLabel}
      </button>
      <p className={`status ${cashoutState}`}>Saque: {cashoutStateLabel(cashoutState)}</p>
    </section>
  );
}
