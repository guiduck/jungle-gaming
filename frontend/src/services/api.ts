import type { CompletedRound, ItemsResponse, Round, Wallet } from "../types";
import { getAccessToken, getPlayerId, isDevAuthMode } from "./auth";
import { logFrontendEvent } from "./telemetry";

const API_URL = import.meta.env.VITE_API_URL ?? "http://localhost:8000";
export const SOCKET_URL = API_URL;

async function request<T extends object>(path: string, init?: RequestInit): Promise<T> {
  const token = getAccessToken();
  const method = init?.method ?? "GET";
  const headers = new Headers(init?.headers);
  headers.set("content-type", "application/json");

  if (isDevAuthMode()) {
    headers.set("x-player-id", getPlayerId());
  }

  if (token) {
    headers.set("authorization", `Bearer ${token}`);
  }

  logFrontendEvent("api.request.started", {
    method,
    path,
    authMode: isDevAuthMode() ? "dev" : "keycloak",
  });

  let response: Response;
  try {
    response = await fetch(`${API_URL}${path}`, {
      ...init,
      headers,
    });
  } catch (error) {
    logFrontendEvent(
      "api.request.failed",
      {
        method,
        path,
        reason: error instanceof Error ? error.message : String(error),
      },
      "error",
    );
    throw error;
  }

  if (!response.ok) {
    const error = (await response.json().catch(() => null)) as { message?: string } | null;
    logFrontendEvent(
      "api.request.rejected",
      {
        method,
        path,
        status: response.status,
        reason: error?.message,
      },
      "warn",
    );
    throw new Error(error?.message ?? `Request failed: ${response.status}`);
  }

  const data = (await response.json()) as T | { error?: string };

  if ("error" in data && data.error) {
    logFrontendEvent("api.response.error", { method, path, reason: data.error }, "warn");
    throw new Error(data.error);
  }

  logFrontendEvent("api.request.completed", {
    method,
    path,
    status: response.status,
  });

  return data as T;
}

export async function getCurrentRound(): Promise<Round> {
  return request<Round>("/games/rounds/current");
}

export async function getRoundHistory(): Promise<ItemsResponse<CompletedRound>> {
  return request<ItemsResponse<CompletedRound>>("/games/rounds/history");
}

export async function getRoundVerification(roundId: string): Promise<CompletedRound> {
  return request<CompletedRound>(`/games/rounds/${roundId}/verify`);
}

export async function getMyBets(): Promise<ItemsResponse<Round>> {
  return request<ItemsResponse<Round>>("/games/bets/me");
}

export async function getWallet(): Promise<Wallet> {
  return request<Wallet>("/wallets/me");
}

export async function createWallet(): Promise<Wallet> {
  return request<Wallet>("/wallets", { method: "POST", body: "{}" });
}

export async function placeBet(
  amountCents: number,
  autoCashoutMultiplierBps?: number | null,
): Promise<Round> {
  const payload =
    autoCashoutMultiplierBps === undefined
      ? { amountCents }
      : { amountCents, autoCashoutMultiplierBps };

  return request<Round>("/games/bet", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function cashOut(multiplierBps: number): Promise<Round> {
  return request<Round>("/games/bet/cashout", {
    method: "POST",
    body: JSON.stringify({ multiplierBps }),
  });
}

export async function startRound(): Promise<Round> {
  return request<Round>("/games/rounds/current/start", { method: "POST", body: "{}" });
}

export async function crashRound(): Promise<Round> {
  return request<Round>("/games/rounds/current/crash", { method: "POST", body: "{}" });
}

export async function settleRound(): Promise<Round> {
  return request<Round>("/games/rounds/current/settle", { method: "POST", body: "{}" });
}
