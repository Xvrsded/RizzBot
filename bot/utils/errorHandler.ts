import { MessageFlags, type RepliableInteraction } from "discord.js";
import { PermissionDeniedError } from "../permissions/guards";
import { createErrorEmbed } from "./embeds/base.embed";
import { followUpEmbedEphemeral, replyEmbedEphemeral } from "./reply";
import { logger } from "../../shared/logger";

function isAlreadyAcknowledgedError(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    error.code === 40060
  );
}

function isUnknownInteractionError(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    error.code === 10062
  );
}

export async function handleInteractionError(
  interaction: RepliableInteraction,
  error: unknown,
): Promise<void> {
  if (isUnknownInteractionError(error) || isAlreadyAcknowledgedError(error)) {
    return;
  }

  const embed =
    error instanceof PermissionDeniedError
      ? createErrorEmbed("❌ TERJADI KESALAHAN", error.message)
      : createErrorEmbed("❌ TERJADI KESALAHAN", "Something went wrong while executing this action.");

  if (error instanceof PermissionDeniedError) {
    logger.warn(`Permission denied: ${interaction.user.tag}`);
  } else {
    logger.error("Interaction error", error);
  }

  try {
    if (interaction.replied || interaction.deferred) {
      await followUpEmbedEphemeral(interaction, embed);
      return;
    }

    await replyEmbedEphemeral(interaction, embed);
  } catch (replyError) {
    if (!isAlreadyAcknowledgedError(replyError) && !isUnknownInteractionError(replyError)) {
      logger.error("Failed to send interaction error response", replyError);
    }
  }
}

export function setupGlobalErrorHandlers(): void {
  process.on("uncaughtException", (error) => {
    logger.error("Uncaught exception", error);
  });

  process.on("unhandledRejection", (reason) => {
    logger.error("Unhandled rejection", reason);
  });
}

export { MessageFlags };
