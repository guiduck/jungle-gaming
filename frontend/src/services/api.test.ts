import { beforeEach, describe, expect, test, vi } from "vitest";
import { getLeaderboard, getWallet } from "./api";
import { AUTH_REQUIRED_EVENT } from "./auth";

function firstFetchUrl(fetchMock: ReturnType<typeof vi.fn>): string {
  const firstCall = fetchMock.mock.calls[0];
  return String(firstCall?.[0]);
}

function installLocalStorage(): Map<string, string> {
  const values = new Map<string, string>();
  vi.stubGlobal("localStorage", {
    getItem: (key: string) => values.get(key) ?? null,
    setItem: (key: string, value: string) => values.set(key, value),
    removeItem: (key: string) => values.delete(key),
  });
  return values;
}

describe("api helpers", () => {
  let storageValues: Map<string, string>;

  beforeEach(() => {
    storageValues = installLocalStorage();
    vi.unstubAllEnvs();
    vi.restoreAllMocks();
  });

  test("formats default leaderboard query", async () => {
    const fetchMock = vi.fn(async () =>
      new Response(JSON.stringify({ metric: "payout", items: [] })),
    );
    vi.stubGlobal("fetch", fetchMock);

    await getLeaderboard();

    expect(firstFetchUrl(fetchMock)).toBe(
      "http://localhost:8000/games/leaderboard?metric=payout",
    );
  });

  test("formats explicit leaderboard metric and limit query", async () => {
    const fetchMock = vi.fn(async () =>
      new Response(JSON.stringify({ metric: "multiplier", items: [] })),
    );
    vi.stubGlobal("fetch", fetchMock);

    await getLeaderboard("multiplier", 5);

    expect(firstFetchUrl(fetchMock)).toBe(
      "http://localhost:8000/games/leaderboard?metric=multiplier&limit=5",
    );
  });

  test("clears access token and notifies auth requirement on 401", async () => {
    storageValues.set("jungle.accessToken", "stale-token");
    const windowTarget = new EventTarget();
    vi.stubGlobal("window", windowTarget);
    vi.stubGlobal(
      "CustomEvent",
      class CustomEventPolyfill<T = unknown> extends Event {
        detail: T;

        constructor(type: string, init?: CustomEventInit<T>) {
          super(type);
          this.detail = init?.detail as T;
        }
      },
    );
    const authRequired = vi.fn();
    window.addEventListener(AUTH_REQUIRED_EVENT, authRequired);
    const fetchMock = vi.fn(async () =>
      new Response(JSON.stringify({ message: "Keycloak bearer token is required" }), {
        status: 401,
      }),
    );
    vi.stubGlobal("fetch", fetchMock);

    await expect(getWallet()).rejects.toThrow("Keycloak bearer token is required");

    expect(storageValues.has("jungle.accessToken")).toBe(false);
    expect(authRequired).toHaveBeenCalledOnce();
    expect((authRequired.mock.calls[0]?.[0] as CustomEvent).detail).toEqual({
      reason: "Keycloak bearer token is required",
    });
    window.removeEventListener(AUTH_REQUIRED_EVENT, authRequired);
  });
});
