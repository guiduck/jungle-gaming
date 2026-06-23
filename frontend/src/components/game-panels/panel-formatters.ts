import { formatMultiplierBps } from "../../services/auto-cashout";
import { formatCents } from "../../services/read-model-display";
import type { RoundStatus } from "../../types";

export function cents(value: number): string {
  return formatCents(value);
}

export function multiplier(value: number): string {
  return formatMultiplierBps(value);
}

export function revealedCrashPointLabel(
  status: RoundStatus | undefined,
  crashMultiplierBps: number | undefined,
): string {
  if (!crashMultiplierBps) {
    return "...";
  }

  if (status !== "crashed" && status !== "settled") {
    return "oculto ate o crash";
  }

  return multiplier(crashMultiplierBps);
}

export function phaseLabel(status: string | undefined): string {
  switch (status) {
    case "betting":
      return "apostas";
    case "running":
      return "subindo";
    case "crashed":
      return "crash";
    case "settled":
      return "encerrada";
    default:
      return "carregando";
  }
}

export function cashoutStateLabel(status: string): string {
  switch (status) {
    case "idle":
      return "ocioso";
    case "pending":
      return "pendente";
    case "accepted":
      return "aceito";
    case "rejected":
      return "rejeitado";
    default:
      return status;
  }
}

export function socketStatusLabel(status: string): string {
  switch (status) {
    case "connecting":
      return "conectando";
    case "connected":
      return "conectado";
    case "disconnected":
      return "desconectado";
    default:
      return status;
  }
}

export function cashoutTriggerLabel(trigger: string | undefined): string {
  switch (trigger) {
    case "manual":
      return "manual";
    case "auto":
      return "automatico";
    default:
      return "saque";
  }
}

export function errorMessage(error: unknown, fallback: string): string {
  return error instanceof Error ? error.message : fallback;
}
