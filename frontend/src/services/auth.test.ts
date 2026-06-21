import { beforeEach, describe, expect, test, vi } from "vitest";
import { getWallet } from "./api";
import {
  getAccessToken,
  getCurrentPlayerId,
  getAuthMode,
  getPlayerId,
  isDevAuthMode,
  setAccessToken,
  setPlayerId,
} from "./auth";

function installLocalStorage(): void {
  const values = new Map<string, string>();
  vi.stubGlobal("localStorage", {
    getItem: (key: string) => values.get(key) ?? null,
    setItem: (key: string, value: string) => values.set(key, value),
    removeItem: (key: string) => values.delete(key),
  });
}

describe("auth helpers", () => {
  beforeEach(() => {
    installLocalStorage();
    vi.unstubAllEnvs();
    vi.restoreAllMocks();
  });

  test("defaults to the local smoke player", () => {
    expect(getPlayerId()).toBe("player");
  });

  test("stores player id and optional access token", () => {
    setPlayerId("alice");
    setAccessToken("token");

    expect(getPlayerId()).toBe("alice");
    expect(getAccessToken()).toBe("token");
  });

  test("uses the bearer token subject as the Keycloak player id", () => {
    setPlayerId("local-player");
    setAccessToken(jwtWithSubject("keycloak-subject"));

    expect(getCurrentPlayerId()).toBe("keycloak-subject");
  });

  test("uses the local player id in explicit dev mode", () => {
    vi.stubEnv("VITE_AUTH_MODE", "dev");
    setPlayerId("dev-player");
    setAccessToken(jwtWithSubject("keycloak-subject"));

    expect(getCurrentPlayerId()).toBe("dev-player");
  });

  test("defaults to Keycloak auth mode", () => {
    expect(getAuthMode()).toBe("keycloak");
    expect(isDevAuthMode()).toBe(false);
  });

  test("attaches bearer token in Keycloak mode without dev identity header", async () => {
    setAccessToken("token-123");
    const fetchMock = vi.fn(async (_input: RequestInfo | URL, _init?: RequestInit) =>
      new Response(JSON.stringify({ id: "wallet" })),
    );
    vi.stubGlobal("fetch", fetchMock);

    await getWallet();

    const headers = (fetchMock.mock.calls[0]?.[1] as RequestInit).headers as Headers;
    expect(headers.get("authorization")).toBe("Bearer token-123");
    expect(headers.has("x-player-id")).toBe(false);
  });

  test("attaches x-player-id only in explicit dev mode", async () => {
    vi.stubEnv("VITE_AUTH_MODE", "dev");
    setPlayerId("dev-player");
    const fetchMock = vi.fn(async (_input: RequestInfo | URL, _init?: RequestInit) =>
      new Response(JSON.stringify({ id: "wallet" })),
    );
    vi.stubGlobal("fetch", fetchMock);

    await getWallet();

    const headers = (fetchMock.mock.calls[0]?.[1] as RequestInit).headers as Headers;
    expect(headers.get("x-player-id")).toBe("dev-player");
    expect(headers.has("authorization")).toBe(false);
  });
});

function jwtWithSubject(sub: string): string {
  const payload = btoa(JSON.stringify({ sub }))
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/g, "");
  return `header.${payload}.signature`;
}
