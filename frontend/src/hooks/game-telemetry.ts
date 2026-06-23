import { logFrontendEvent } from "../services/telemetry";

export function logGameEvent(
  event: string,
  fields: Record<string, string | number | boolean | undefined> = {},
): void {
  logFrontendEvent(event, fields);
}
