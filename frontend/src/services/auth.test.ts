import { beforeEach, describe, expect, test, vi } from "vitest";
import { getWallet } from "./api";
import {
  getAccessToken,
  getCurrentPlayerId,
  setAccessToken,
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

  test("has no browser player id before Keycloak token is stored", () => {
    expect(getCurrentPlayerId()).toBe("");
  });

  test("stores optional access token", () => {
    setAccessToken("token");

    expect(getAccessToken()).toBe("token");
  });

  test("uses the bearer token subject as the Keycloak player id", () => {
    setAccessToken(jwtWithSubject("keycloak-subject"));

    expect(getCurrentPlayerId()).toBe("keycloak-subject");
  });

  test("ignores VITE_AUTH_MODE dev for browser player identity", () => {
    vi.stubEnv("VITE_AUTH_MODE", "dev");
    setAccessToken(jwtWithSubject("keycloak-subject"));

    expect(getCurrentPlayerId()).toBe("keycloak-subject");
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

  test("does not attach dev identity headers when VITE_AUTH_MODE is dev", async () => {
    vi.stubEnv("VITE_AUTH_MODE", "dev");
    const fetchMock = vi.fn(async (_input: RequestInfo | URL, _init?: RequestInit) =>
      new Response(JSON.stringify({ id: "wallet" })),
    );
    vi.stubGlobal("fetch", fetchMock);

    await getWallet();

    const headers = (fetchMock.mock.calls[0]?.[1] as RequestInit).headers as Headers;
    expect(headers.has("x-player-id")).toBe(false);
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
