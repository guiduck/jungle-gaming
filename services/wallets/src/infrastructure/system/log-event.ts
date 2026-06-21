type LogField = string | number | boolean | null | undefined;

export function formatLogEvent(event: string, fields: Record<string, LogField> = {}): string {
  const safeFields = Object.entries(fields)
    .filter(([, value]) => value !== undefined)
    .map(([key, value]) => `${key}=${String(value)}`);

  return [`event=${event}`, "service=wallets", ...safeFields].join(" ");
}
