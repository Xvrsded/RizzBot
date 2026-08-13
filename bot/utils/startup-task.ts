import { logger } from "../../shared/logger";

function isExternalTimeoutError(error: unknown): boolean {
  if (!(error instanceof Error)) {
    return false;
  }

  const name = error.name.toLowerCase();
  const message = error.message.toLowerCase();

  return (
    name.includes("timeout") ||
    message.includes("timeout") ||
    message.includes("connect timeout") ||
    message.includes("etimedout") ||
    message.includes("econnreset") ||
    message.includes("network")
  );
}

export async function runStartupTask(
  label: string,
  task: () => Promise<unknown>,
  options: { optional?: boolean } = {},
): Promise<void> {
  const optional = options.optional ?? false;

  try {
    await task();
  } catch (error) {
    if (isExternalTimeoutError(error)) {
      logger.warn(`External request timeout during bootstrap (${label})`);
      logger.warn("Skipping optional external operation");
    } else if (optional) {
      logger.warn(`Optional bootstrap task skipped (${label})`);
      logger.error(`Bootstrap detail (${label})`, error);
    } else {
      logger.error(`Bootstrap task failed (${label})`, error);
    }

    logger.info("Bot startup continues normally");
  }
}
