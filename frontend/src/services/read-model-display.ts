import { formatMultiplierBps } from "./auto-cashout";

export function formatCents(value: number): string {
  return `R$ ${(value / 100).toFixed(2).replace(".", ",")}`;
}

export function shortPlayerId(playerId: string): string {
  if (!playerId) {
    return "desconhecido";
  }

  return playerId.length <= 12 ? playerId : `${playerId.slice(0, 8)}...`;
}

export function betOutcomeLabel(bet: {
  status: string;
  cashoutTrigger?: "manual" | "auto";
  autoCashoutMultiplierBps?: number;
  cashoutMultiplierBps?: number;
  payoutCents?: number;
}): string {
  if (bet.status === "pending" && bet.autoCashoutMultiplierBps) {
    return `auto @ ${formatMultiplierBps(bet.autoCashoutMultiplierBps)}`;
  }

  if (bet.status === "cashed_out" && bet.cashoutTrigger === "auto") {
    return "saque automatico";
  }

  if (bet.status === "cashed_out" && bet.cashoutTrigger === "manual") {
    return "saque manual";
  }

  if (bet.status === "cashed_out") {
    return "sacado";
  }

  if (bet.status === "lost") {
    return "perdida";
  }

  if (bet.status === "pending") {
    return "pendente";
  }

  return bet.status || "indisponivel";
}
