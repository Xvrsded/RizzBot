import { ChannelType, PermissionFlagsBits, type Client, type Guild } from "discord.js";
import { env } from "../../config/env";
import { guildConfigService } from "./guild-config.service";
import { logger } from "../../shared/logger";

const TICKET_CATEGORY_NAME_HINTS = ["ticket", "tickets", "pesanan", "order", "orders"];

async function validateCategory(guild: Guild, categoryId: string): Promise<string | null> {
  const channel = await guild.channels.fetch(categoryId).catch(() => null);

  if (!channel || channel.type !== ChannelType.GuildCategory) {
    return null;
  }

  return channel.id;
}

async function findTicketCategoryByName(guild: Guild): Promise<string | null> {
  for (const channel of guild.channels.cache.values()) {
    if (channel.type !== ChannelType.GuildCategory) {
      continue;
    }

    const normalized = channel.name.toLowerCase();

    if (TICKET_CATEGORY_NAME_HINTS.some((hint) => normalized.includes(hint))) {
      return channel.id;
    }
  }

  return null;
}

async function createTicketCategory(guild: Guild): Promise<string | null> {
  const me = guild.members.me;

  if (!me?.permissions.has(PermissionFlagsBits.ManageChannels)) {
    logger.warn(`Cannot auto-create ticket category in guild ${guild.id}: missing ManageChannels`);
    return null;
  }

  try {
    const category = await guild.channels.create({
      name: "Tickets",
      type: ChannelType.GuildCategory,
      reason: "RizzBot auto-setup: ticket category",
    });

    logger.info(`Created ticket category "${category.name}" (${category.id}) in guild ${guild.id}`);
    return category.id;
  } catch (error) {
    logger.warn(`Failed to auto-create ticket category in guild ${guild.id}`);
    logger.error("Ticket category creation detail", error);
    return null;
  }
}

async function resolveTicketCategoryId(guild: Guild): Promise<string | null> {
  if (env.TICKET_CATEGORY_ID) {
    const fromEnv = await validateCategory(guild, env.TICKET_CATEGORY_ID);

    if (fromEnv) {
      return fromEnv;
    }

    logger.warn(
      `TICKET_CATEGORY_ID=${env.TICKET_CATEGORY_ID} is invalid for guild ${guild.id}; falling back to auto-detect`,
    );
  }

  const byName = await findTicketCategoryByName(guild);

  if (byName) {
    return byName;
  }

  return createTicketCategory(guild);
}

async function ensureTicketCategory(guild: Guild): Promise<void> {
  const config = await guildConfigService.getOrCreateGuildConfig(guild.id, guild.name);

  if (config.ticketCategoryId) {
    const valid = await validateCategory(guild, config.ticketCategoryId);

    if (valid) {
      return;
    }

    logger.warn(
      `Stored ticket category ${config.ticketCategoryId} is invalid in guild ${guild.id}; re-resolving`,
    );
  }

  const categoryId = await resolveTicketCategoryId(guild);

  if (!categoryId) {
    logger.warn(
      `Ticket category could not be configured for guild ${guild.id}. Run /ticket setup or set TICKET_CATEGORY_ID in .env`,
    );
    return;
  }

  await guildConfigService.upsertGuildConfig(guild.id, {
    guildName: guild.name,
    ticketCategoryId: categoryId,
  });

  logger.info(`Ticket category auto-configured for guild ${guild.id}: ${categoryId}`);
}

export const guildBootstrapService = {
  async runStartupSetup(client: Client<true>): Promise<void> {
    logger.info("Running guild bootstrap setup...");

    const guilds = [...client.guilds.cache.values()];

    if (guilds.length === 0) {
      logger.warn("No guilds available for bootstrap setup");
      return;
    }

    for (const guild of guilds) {
      try {
        await ensureTicketCategory(guild);
      } catch (error) {
        logger.warn(`Bootstrap skipped for guild ${guild.id} due to external error`);
        logger.error(`Bootstrap detail for guild ${guild.id}`, error);
      }
    }
  },
};
