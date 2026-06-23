import type {
  CompletedRound,
  ItemsResponse,
  LeaderboardResponse,
  PlayerBetHistoryEntry,
  Round,
  RoundHistorySummary,
  Wallet,
} from "../types";
import { clearAccessToken, getAccessToken, notifyAuthRequired } from "./auth";
import { logFrontendEvent } from "./telemetry";

const API_URL = import.meta.env.VITE_API_URL ?? "http://localhost:8000";
export const SOCKET_URL = API_URL;
export const SOCKET_PATH = import.meta.env.VITE_SOCKET_PATH ?? defaultSocketPath(API_URL);

function defaultSocketPath(apiUrl: string): string {
  try {
    return new URL(apiUrl).port === "4001" ? "/socket" : "/games/socket";
  } catch {
    return "/games/socket";
  }
}

async function request<T extends object>(path: string, init?: RequestInit): Promise<T> {
  const token = getAccessToken();
  const method = init?.method ?? "GET";
  const headers = new Headers(init?.headers);
  headers.set("content-type", "application/json");

  if (token) {
    headers.set("authorization", `Bearer ${token}`);
  }

  logFrontendEvent("api.request.started", {
    method,
    path,
    authMode: "keycloak",
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
    const reason = error?.message ?? `Request failed: ${response.status}`;
    logFrontendEvent(
      "api.request.rejected",
      {
        method,
        path,
        status: response.status,
        reason,
      },
      "warn",
    );

    if (response.status === 401) {
      clearAccessToken();
      notifyAuthRequired(reason);
    }

    throw new Error(reason);
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

export async function getRoundHistory(): Promise<ItemsResponse<RoundHistorySummary>> {
  return request<ItemsResponse<RoundHistorySummary>>("/games/rounds/history");
}

export async function getRoundVerification(roundId: string): Promise<CompletedRound> {
  return request<CompletedRound>(`/games/rounds/${roundId}/verify`);
}

export async function getLeaderboard(
  metric: "payout" | "multiplier" = "payout",
  limit?: number,
): Promise<LeaderboardResponse> {
  const params = new URLSearchParams({ metric });
  if (limit !== undefined) {
    params.set("limit", String(limit));
  }
  return request<LeaderboardResponse>(`/games/leaderboard?${params.toString()}`);
}

export async function getMyBets(): Promise<ItemsResponse<PlayerBetHistoryEntry>> {
  return request<ItemsResponse<PlayerBetHistoryEntry>>("/games/bets/me");
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

export async function markBetReady(): Promise<Round> {
  return request<Round>("/games/bet/ready", { method: "POST", body: "{}" });
}
