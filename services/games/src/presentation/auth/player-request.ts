export interface PlayerRequest {
  headers: Record<string, string | string[] | undefined>;
  playerId?: string;
}
