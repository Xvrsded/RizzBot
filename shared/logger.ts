type LogCategory =
  | "INFO"
  | "WARN"
  | "ERROR"
  | "DISCORD"
  | "MONGODB"
  | "DASHBOARD"
  | "COMMAND"
  | "ORDER"
  | "TICKET";

function formatMessage(category: LogCategory, message: string): string {
  return `[${category}] ${message}`;
}

function formatError(error: unknown): string {
  if (error instanceof Error) {
    return error.stack ?? error.message;
  }

  return String(error);
}

function log(category: LogCategory, message: string): void {
  console.log(formatMessage(category, message));
}

function logError(category: LogCategory, message: string, error?: unknown): void {
  console.error(formatMessage(category, message));

  if (error !== undefined) {
    console.error(formatError(error));
  }
}

export const logger = {
  info: (message: string) => log("INFO", message),
  warn: (message: string) => log("WARN", message),
  error: (message: string, error?: unknown) => logError("ERROR", message, error),
  discord: (message: string) => log("DISCORD", message),
  mongodb: (message: string) => log("MONGODB", message),
  dashboard: (message: string) => log("DASHBOARD", message),
  command: (message: string) => log("COMMAND", message),
  order: (message: string) => log("ORDER", message),
  ticket: (message: string) => log("TICKET", message),
};
