import { beforeEach, describe, expect, test, vi } from "vitest";
import { getAccessToken, getPlayerId, setAccessToken, setPlayerId } from "./auth";

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
});
