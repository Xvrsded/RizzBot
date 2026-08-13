import "./handlers";

import {
  MessageFlags,
  type AutocompleteInteraction,
  type ButtonInteraction,
  type ChatInputCommandInteraction,
  type Interaction,
  type ModalSubmitInteraction,
  type RepliableInteraction,
  type StringSelectMenuInteraction,
} from "discord.js";
import { logger } from "../../shared/logger";
import { handleInteractionError } from "../utils/errorHandler";
import { replyEmbedEphemeral } from "../utils/reply";
import { PermissionDeniedError } from "../permissions/guards";
import { createErrorEmbed } from "../utils/embeds/base.embed";
import { createRobuxErrorEmbed } from "../utils/embeds/robux-username.embed";
import { parseCustomId } from "./custom-id";
import { interactionRegistry } from "./registry";

function isRobuxCustomId(customId: string): boolean {
  return customId.startsWith("robux:");
}

function buildUnknownInteractionError(customId: string) {
  if (isRobuxCustomId(customId)) {
    return createRobuxErrorEmbed(
      "❌ TERJADI KESALAHAN",
      "Pesanan Robux Via Send tidak dapat diproses saat ini.\n\nCoba ulangi proses pemesanan atau hubungi Staff.",
    );
  }

  return createErrorEmbed("❌ TERJADI KESALAHAN", "This action is not available yet.");
}

function logRobuxDebug(stage: string, customId: string, parsed?: ReturnType<typeof parseCustomId>): void {
  if (!isRobuxCustomId(customId)) {
    return;
  }

  const parsedSummary = parsed
    ? `domain=${parsed.domain}, action=${parsed.action}, id=${parsed.id ?? "none"}`
    : "parsed=null";

  logger.info(`[ROBUX DEBUG] ${stage} customId=${customId} ${parsedSummary}`);
}

async function handleAutocomplete(interaction: AutocompleteInteraction): Promise<void> {
  const command = interaction.client.commands.get(interaction.commandName);

  if (!command?.autocomplete) {
    return;
  }

  try {
    await command.autocomplete(interaction);
  } catch (error) {
    logger.error(`Autocomplete error for /${interaction.commandName}`, error);
  }
}

async function handleChatInputCommand(interaction: ChatInputCommandInteraction): Promise<void> {
  const command = interaction.client.commands.get(interaction.commandName);

  if (!command) {
    logger.warn(`Unknown command: /${interaction.commandName}`);
    return;
  }

  try {
    logger.command(`/${interaction.commandName} used by ${interaction.user.tag}`);
    await command.execute(interaction);
  } catch (error) {
    await handleInteractionError(interaction, error);
  }
}

async function handleUnknownComponentInteraction(
  interaction: RepliableInteraction,
  type: "button" | "select menu" | "modal",
  customId: string,
  reason: "invalid_format" | "missing_handler",
): Promise<void> {
  const registered = interactionRegistry.getRegisteredDomains();

  logger.warn(
    `No handler for ${type} customId: ${customId} (${reason}). Registered modals=[${registered.modals.join(", ")}]`,
  );

  if (isRobuxCustomId(customId)) {
    logger.error(
      `[ROBUX DEBUG] routing failed for ${type} customId=${customId} reason=${reason} registeredModals=[${registered.modals.join(", ")}]`,
    );
  }

  await replyEmbedEphemeral(interaction, buildUnknownInteractionError(customId));
}

async function handleButton(interaction: ButtonInteraction): Promise<void> {
  const parsed = parseCustomId(interaction.customId);
  logRobuxDebug("button interaction", interaction.customId, parsed ?? undefined);

  if (!parsed) {
    logger.warn(`Invalid button customId format: ${interaction.customId}`);
    await handleUnknownComponentInteraction(interaction, "button", interaction.customId, "invalid_format");
    return;
  }

  const handler = interactionRegistry.getButtonHandler(parsed.domain);

  if (!handler) {
    await handleUnknownComponentInteraction(interaction, "button", interaction.customId, "missing_handler");
    return;
  }

  try {
    await handler(interaction, parsed);
  } catch (error) {
    if (error instanceof PermissionDeniedError) {
      await handlePermissionDenied(interaction, error);
      return;
    }

    await handleInteractionError(interaction, error);
  }
}

async function handleSelectMenu(interaction: StringSelectMenuInteraction): Promise<void> {
  const parsed = parseCustomId(interaction.customId);
  logRobuxDebug("select menu interaction", interaction.customId, parsed ?? undefined);

  if (!parsed) {
    logger.warn(`Invalid select menu customId format: ${interaction.customId}`);
    await handleUnknownComponentInteraction(interaction, "select menu", interaction.customId, "invalid_format");
    return;
  }

  const handler = interactionRegistry.getSelectMenuHandler(parsed.domain);

  if (!handler) {
    await handleUnknownComponentInteraction(interaction, "select menu", interaction.customId, "missing_handler");
    return;
  }

  try {
    await handler(interaction, parsed);
  } catch (error) {
    if (error instanceof PermissionDeniedError) {
      await handlePermissionDenied(interaction, error);
      return;
    }

    await handleInteractionError(interaction, error);
  }
}

async function handleModalSubmit(interaction: ModalSubmitInteraction): Promise<void> {
  const parsed = parseCustomId(interaction.customId);
  logRobuxDebug("modal submit received", interaction.customId, parsed ?? undefined);

  if (!parsed) {
    logger.warn(`Invalid modal customId format: ${interaction.customId}`);
    await handleUnknownComponentInteraction(interaction, "modal", interaction.customId, "invalid_format");
    return;
  }

  const handler = interactionRegistry.getModalHandler(parsed.domain);

  if (!handler) {
    await handleUnknownComponentInteraction(interaction, "modal", interaction.customId, "missing_handler");
    return;
  }

  if (parsed.domain === "robux") {
    logger.info(`[ROBUX DEBUG] routing to robux modal handler action=${parsed.action} id=${parsed.id ?? "none"}`);
  }

  try {
    await handler(interaction, parsed);
  } catch (error) {
    if (error instanceof PermissionDeniedError) {
      await handlePermissionDenied(interaction, error);
      return;
    }

    await handleInteractionError(interaction, error);
  }
}

async function handlePermissionDenied(
  interaction: RepliableInteraction,
  error: PermissionDeniedError,
): Promise<void> {
  await replyEmbedEphemeral(
    interaction,
    createErrorEmbed("❌ TERJADI KESALAHAN", error.message),
  );
}

export async function routeInteraction(interaction: Interaction): Promise<void> {
  if (interaction.isAutocomplete()) {
    await handleAutocomplete(interaction);
    return;
  }

  if (interaction.isChatInputCommand()) {
    await handleChatInputCommand(interaction);
    return;
  }

  if (interaction.isButton()) {
    await handleButton(interaction);
    return;
  }

  if (interaction.isStringSelectMenu()) {
    await handleSelectMenu(interaction);
    return;
  }

  if (interaction.isModalSubmit()) {
    await handleModalSubmit(interaction);
    return;
  }
}
