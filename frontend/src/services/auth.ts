import { logFrontendEvent } from "./telemetry";

const ACCESS_TOKEN_KEY = "jungle.accessToken";
const PKCE_VERIFIER_KEY = "jungle.pkceVerifier";
const KEYCLOAK_READINESS_TIMEOUT_MS = 3500;
export const AUTH_REQUIRED_EVENT = "jungle.auth.required";

export interface AuthRequiredDetail {
  reason: string;
}

export function getCurrentPlayerId(): string {
  return getAccessTokenSubject() ?? "";
}

export function getAccessToken(): string | undefined {
  return localStorage.getItem(ACCESS_TOKEN_KEY) ?? undefined;
}

export function setAccessToken(token: string): void {
  if (token.trim().length === 0) {
    localStorage.removeItem(ACCESS_TOKEN_KEY);
    return;
  }

  localStorage.setItem(ACCESS_TOKEN_KEY, token.trim());
}

export function clearAccessToken(): void {
  localStorage.removeItem(ACCESS_TOKEN_KEY);
}

export function notifyAuthRequired(reason: string): void {
  if (typeof window === "undefined") {
    return;
  }

  window.dispatchEvent(
    new CustomEvent<AuthRequiredDetail>(AUTH_REQUIRED_EVENT, {
      detail: { reason },
    }),
  );
}

export function getAccessTokenSubject(): string | undefined {
  const token = getAccessToken();

  if (!token) {
    return undefined;
  }

  const payload = decodeJwtPayload(token);
  return typeof payload?.sub === "string" && payload.sub.length > 0 ? payload.sub : undefined;
}

export async function beginKeycloakLogin(): Promise<void> {
  await ensureKeycloakReachable();
  const verifier = randomString();
  const challenge = await pkceChallenge(verifier);
  sessionStorage.setItem(PKCE_VERIFIER_KEY, verifier);
  logFrontendEvent("auth.login.started", {
    authMode: "keycloak",
    realm: keycloakRealm(),
    clientId: keycloakClientId(),
  });
  window.location.assign(keycloakAuthorizeUrl(challenge));
}

export async function completeKeycloakLoginFromCallback(): Promise<boolean> {
  const params = new URLSearchParams(window.location.search);
  const code = params.get("code");
  const verifier = sessionStorage.getItem(PKCE_VERIFIER_KEY);

  if (!code) {
    logFrontendEvent("auth.callback.skipped", {
      authMode: "keycloak",
      hasCode: false,
      hasVerifier: Boolean(verifier),
    });
    return false;
  }

  if (!verifier) {
    clearAccessToken();
    clearKeycloakCallbackUrl();
    logFrontendEvent("auth.callback.failed", {
      authMode: "keycloak",
      reason: "missing_pkce_verifier",
    }, "warn");
    throw new Error("Nao foi possivel concluir o login porque a sessao PKCE expirou. Clique para entrar novamente.");
  }

  sessionStorage.removeItem(PKCE_VERIFIER_KEY);

  let response: Response;
  try {
    response = await fetch(keycloakTokenUrl(), {
      method: "POST",
      headers: { "content-type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        grant_type: "authorization_code",
        client_id: keycloakClientId(),
        code,
        redirect_uri: redirectUri(),
        code_verifier: verifier,
      }),
    });
  } catch (error) {
    clearAccessToken();
    clearKeycloakCallbackUrl();
    logFrontendEvent("auth.callback.failed", {
      authMode: "keycloak",
      reason: error instanceof Error ? error.message : String(error),
    }, "warn");
    throw new Error("Keycloak retornou para o jogo, mas o token nao pode ser confirmado. Verifique se o container esta pronto e tente novamente.");
  }

  if (!response.ok) {
    clearAccessToken();
    clearKeycloakCallbackUrl();
    logFrontendEvent("auth.callback.failed", {
      authMode: "keycloak",
      status: response.status,
    }, "warn");
    throw new Error("Keycloak recusou a troca do login por token. Clique para entrar novamente.");
  }

  const payload = (await response.json()) as { access_token?: string };

  if (!payload.access_token) {
    clearAccessToken();
    clearKeycloakCallbackUrl();
    logFrontendEvent("auth.callback.failed", {
      authMode: "keycloak",
      reason: "missing_access_token",
    }, "warn");
    throw new Error("Keycloak respondeu sem token de acesso. Clique para entrar novamente.");
  }

  setAccessToken(payload.access_token);
  clearKeycloakCallbackUrl();
  logFrontendEvent("auth.callback.completed", {
    authMode: "keycloak",
    playerId: getAccessTokenSubject(),
  });
  return true;
}

function keycloakBaseUrl(): string {
  return import.meta.env.VITE_KEYCLOAK_URL ?? "http://localhost:8080";
}

function keycloakRealm(): string {
  return import.meta.env.VITE_KEYCLOAK_REALM ?? "crash-game";
}

function keycloakClientId(): string {
  return import.meta.env.VITE_KEYCLOAK_CLIENT_ID ?? "crash-game-client";
}

function redirectUri(): string {
  return window.location.origin;
}

function keycloakAuthorizeUrl(challenge: string): string {
  const params = new URLSearchParams({
    client_id: keycloakClientId(),
    redirect_uri: redirectUri(),
    response_type: "code",
    scope: "openid profile email",
    code_challenge: challenge,
    code_challenge_method: "S256",
  });
  return `${keycloakBaseUrl()}/realms/${keycloakRealm()}/protocol/openid-connect/auth?${params}`;
}

function keycloakTokenUrl(): string {
  return `${keycloakBaseUrl()}/realms/${keycloakRealm()}/protocol/openid-connect/token`;
}

function clearKeycloakCallbackUrl(): void {
  window.history.replaceState({}, document.title, window.location.pathname);
}

async function ensureKeycloakReachable(): Promise<void> {
  const controller = new AbortController();
  const timeout = window.setTimeout(() => controller.abort(), KEYCLOAK_READINESS_TIMEOUT_MS);

  try {
    await fetch(`${keycloakBaseUrl()}/realms/${keycloakRealm()}/.well-known/openid-configuration`, {
      cache: "no-store",
      mode: "no-cors",
      signal: controller.signal,
    });
  } catch (error) {
    logFrontendEvent("auth.login.failed", {
      authMode: "keycloak",
      reason: error instanceof Error ? error.message : String(error),
    }, "warn");
    throw new Error("Keycloak nao respondeu. Verifique se o container esta pronto e tente novamente.");
  } finally {
    window.clearTimeout(timeout);
  }
}

function randomString(): string {
  const values = new Uint8Array(32);
  crypto.getRandomValues(values);
  return base64Url(values);
}

async function pkceChallenge(verifier: string): Promise<string> {
  const bytes = new TextEncoder().encode(verifier);
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return base64Url(new Uint8Array(digest));
}

function base64Url(values: Uint8Array): string {
  return btoa(String.fromCharCode(...values))
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/g, "");
}

function decodeJwtPayload(token: string): { sub?: unknown } | undefined {
  const payload = token.split(".")[1];

  if (!payload) {
    return undefined;
  }

  try {
    const paddedPayload = payload.padEnd(payload.length + ((4 - (payload.length % 4)) % 4), "=");
    const json = atob(paddedPayload.replace(/-/g, "+").replace(/_/g, "/"));
    return JSON.parse(json) as { sub?: unknown };
  } catch {
    return undefined;
  }
}
