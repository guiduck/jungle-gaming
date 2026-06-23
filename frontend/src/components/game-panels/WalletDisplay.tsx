import type { Wallet } from "../../types";
import { cents, socketStatusLabel } from "./panel-formatters";

export interface WalletDisplayProps {
  wallet?: Wallet;
  showBalance: boolean;
  socketStatus: string;
  onToggleBalance: () => void;
}

export function WalletDisplay({
  wallet,
  showBalance,
  socketStatus,
  onToggleBalance,
}: WalletDisplayProps) {
  const balanceLabel = wallet ? (showBalance ? cents(wallet.balanceCents) : "******") : "...";
  const visibilityLabel = showBalance ? "Ocultar saldo" : "Mostrar saldo";

  return (
    <div className="wallet" data-smoke="wallet-display">
      <span data-smoke="websocket-status">Keycloak / {socketStatusLabel(socketStatus)}</span>
      <div className="wallet-balance-row">
        <strong>{balanceLabel}</strong>
        <button
          className="eye-button"
          type="button"
          onClick={onToggleBalance}
          aria-label={visibilityLabel}
          title={visibilityLabel}
        >
          <span className={`eye-glyph ${showBalance ? "visible" : "hidden"}`} aria-hidden="true" />
        </button>
      </div>
      <small>Identidade Keycloak</small>
    </div>
  );
}
