const PLAYER_ID_KEY = "jungle.playerId";
const ACCESS_TOKEN_KEY = "jungle.accessToken";

export function getPlayerId(): string {
  return localStorage.getItem(PLAYER_ID_KEY) ?? "player";
}

export function setPlayerId(playerId: string): void {
  localStorage.setItem(PLAYER_ID_KEY, playerId.trim() || "player");
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
