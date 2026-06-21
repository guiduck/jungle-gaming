type TelemetryField = string | number | boolean | null | undefined;
type TelemetryLevel = "info" | "warn" | "error";

interface TelemetryEvent {
  event: string;
  fields?: Record<string, TelemetryField>;
  level?: TelemetryLevel;
}

interface TelemetryConsole {
  info: (message: string) => void;
  warn: (message: string) => void;
  error: (message: string) => void;
}

const serviceField = "service=frontend";

export function formatFrontendEvent(event: string, fields: Record<string, TelemetryField> = {}): string {
  return [`event=${event}`, serviceField, ...formatFields(fields)].join(" ");
}

export function createTelemetryEmitter(target: TelemetryConsole) {
  return ({ event, fields = {}, level = "info" }: TelemetryEvent): void => {
    target[level](formatFrontendEvent(event, fields));
  };
}

const consoleEmitter = createTelemetryEmitter(console);

export function logFrontendEvent(
  event: string,
  fields: Record<string, TelemetryField> = {},
  level: TelemetryLevel = "info",
): void {
  consoleEmitter({ event, fields, level });
}

function formatFields(fields: Record<string, TelemetryField>): string[] {
  return Object.entries(fields)
    .filter(([, value]) => value !== undefined)
    .map(([key, value]) => `${key}=${String(value)}`);
}
