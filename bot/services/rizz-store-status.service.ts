import {
  ChannelType,
  PermissionFlagsBits,
  type Client,
  type Guild,
  type VoiceChannel,
} from "discord.js";
import type { GuildConfigDocument } from "../../database/models/guild-config.model";
import {
  buildRizzStoreChannelName,
  DEFAULT_RIZZ_STORE_CHANNELS,
  formatServiceDisplay,
  formatStockDisplay,
  RIZZ_STORE_CATEGORY_NAME,
  RIZZ_STORE_CHANNEL_DEFINITIONS,
  type RizzStoreChannelKey,
  type RizzStoreChannelMap,
  type RizzStoreConfig,
} from "../../shared/rizz-store";
import type { ServiceStatusMap } from "../../shared/service-status";
import { guildConfigRepository } from "../../database/repositories/guild-config.repository";
import { ticketRepository } from "../../database/repositories/ticket.repository";
import { guildConfigService } from "./guild-config.service";
import { serviceStatusService } from "./service-status.service";
import { logger } from "../../shared/logger";

function normalizeRizzStore(config: GuildConfigDocument | null): RizzStoreConfig {
  const stored = config?.rizzStore;

  return {
    categoryId: stored?.categoryId ?? null,
    groupPayoutEnabled: stored?.groupPayoutEnabled ?? true,
    channels: {
      ...DEFAULT_RIZZ_STORE_CHANNELS,
      ...(stored?.channels ?? {}),
    },
  };
}

function normalizeInventory(config: GuildConfigDocument | null): {
  stockViaSend: number;
  stockGig: number;
} {
  return {
    stockViaSend: config?.inventory?.stockViaSend ?? 0,
    stockGig: config?.inventory?.stockGig ?? 0,
  };
}

function buildVoicePermissions(guild: Guild, botId: string) {
  return [
    {
      id: guild.roles.everyone.id,
      deny: [PermissionFlagsBits.Connect, PermissionFlagsBits.Speak],
    },
    {
      id: botId,
      allow: [
        PermissionFlagsBits.ViewChannel,
        PermissionFlagsBits.ManageChannels,
        PermissionFlagsBits.Connect,
      ],
    },
  ];
}

async function findCategoryByName(guild: Guild): Promise<string | null> {
  for (const channel of guild.channels.cache.values()) {
    if (channel.type === ChannelType.GuildCategory && channel.name === RIZZ_STORE_CATEGORY_NAME) {
      return channel.id;
    }
  }

  return null;
}

async function ensureCategory(
  guild: Guild,
  config: RizzStoreConfig,
  botId: string,
): Promise<string | null> {
  let categoryId = config.categoryId;

  if (categoryId) {
    const existing = await guild.channels.fetch(categoryId).catch(() => null);

    if (existing?.type === ChannelType.GuildCategory) {
      await existing.setPosition(0).catch((error) => {
        logger.warn(`Failed to reposition RizzStore category in guild ${guild.id}`);
        logger.error("RizzStore category position detail", error);
      });
      return existing.id;
    }
  }

  const byName = await findCategoryByName(guild);

  if (byName) {
    const category = await guild.channels.fetch(byName).catch(() => null);

    if (category?.type === ChannelType.GuildCategory) {
      await category.setPosition(0).catch(() => undefined);
      return category.id;
    }
  }

  if (!guild.members.me?.permissions.has(PermissionFlagsBits.ManageChannels)) {
    logger.warn(`Cannot create RizzStore category in guild ${guild.id}: missing ManageChannels`);
    return null;
  }

  try {
    const created = await guild.channels.create({
      name: RIZZ_STORE_CATEGORY_NAME,
      type: ChannelType.GuildCategory,
      reason: "RizzBot RizzStore status category",
      position: 0,
      permissionOverwrites: buildVoicePermissions(guild, botId),
    });

    return created.id;
  } catch (error) {
    logger.error(`Failed to create RizzStore category in guild ${guild.id}`, error);
    return null;
  }
}

async function findChannelByPrefix(
  guild: Guild,
  categoryId: string,
  prefix: string,
): Promise<string | null> {
  for (const channel of guild.channels.cache.values()) {
    if (
      channel.parentId === categoryId &&
      channel.type === ChannelType.GuildVoice &&
      channel.name.startsWith(prefix)
    ) {
      return channel.id;
    }
  }

  return null;
}

async function ensureVoiceChannel(
  guild: Guild,
  categoryId: string,
  key: RizzStoreChannelKey,
  prefix: string,
  name: string,
  storedId: string | null,
  botId: string,
): Promise<string | null> {
  if (storedId) {
    const existing = await guild.channels.fetch(storedId).catch(() => null);

    if (existing?.type === ChannelType.GuildVoice) {
      if (existing.name !== name) {
        await existing.setName(name).catch((error) => {
          logger.warn(`Failed to rename RizzStore channel ${key} in guild ${guild.id}`);
          logger.error("RizzStore channel rename detail", error);
        });
      }

      if (existing.parentId !== categoryId) {
        await existing.setParent(categoryId).catch(() => undefined);
      }

      return existing.id;
    }
  }

  const byPrefix = await findChannelByPrefix(guild, categoryId, prefix);

  if (byPrefix) {
    const existing = (await guild.channels.fetch(byPrefix).catch(() => null)) as VoiceChannel | null;

    if (existing) {
      if (existing.name !== name) {
        await existing.setName(name).catch(() => undefined);
      }

      return existing.id;
    }
  }

  try {
    const created = await guild.channels.create({
      name,
      type: ChannelType.GuildVoice,
      parent: categoryId,
      reason: `RizzBot RizzStore status: ${key}`,
      permissionOverwrites: buildVoicePermissions(guild, botId),
    });

    return created.id;
  } catch (error) {
    logger.error(`Failed to create RizzStore channel ${key} in guild ${guild.id}`, error);
    return null;
  }
}

function buildChannelNames(
  queueCount: number,
  inventory: { stockViaSend: number; stockGig: number },
  serviceStatus: ServiceStatusMap,
  groupPayoutEnabled: boolean,
): Record<RizzStoreChannelKey, string> {
  return {
    queue: buildRizzStoreChannelName("🎟️ | ANTRIAN:", String(queueCount)),
    stockViaSend: buildRizzStoreChannelName(
      "📦 | STOCK VIA SEND:",
      formatStockDisplay(inventory.stockViaSend),
    ),
    stockGig: buildRizzStoreChannelName("📦 | STOCK GIG:", formatStockDisplay(inventory.stockGig)),
    giftGamepass: buildRizzStoreChannelName(
      "🎁 | GIFT GAMEPASS:",
      formatServiceDisplay(serviceStatus.giftInGame),
    ),
    robuxUsername: buildRizzStoreChannelName(
      "💎 | ROBUX VIA USERNAME:",
      formatServiceDisplay(serviceStatus.robuxSend),
    ),
    robuxLogin: buildRizzStoreChannelName(
      "🔐 | ROBUX VIA LOGIN:",
      formatServiceDisplay(serviceStatus.robuxLogin),
    ),
    limitedItem: buildRizzStoreChannelName(
      "💎 | LIMITED ITEM:",
      formatServiceDisplay(serviceStatus.limitedItem),
    ),
    groupPayout: buildRizzStoreChannelName(
      "💸 | GROUP PAYOUT:",
      formatServiceDisplay(serviceStatus.communityPayout),
    ),
    mmRekber: buildRizzStoreChannelName(
      "🛡️ | MM REKBER:",
      formatServiceDisplay(serviceStatus.mmReber),
    ),
  };
}

async function persistRizzStore(
  guildId: string,
  rizzStore: RizzStoreConfig,
): Promise<void> {
  await guildConfigRepository.updateByGuildId(guildId, {
    rizzStore,
  });
}

export const rizzStoreStatusService = {
  async syncGuild(client: Client<true>, guildId: string): Promise<void> {
    const guild = client.guilds.cache.get(guildId) ?? (await client.guilds.fetch(guildId).catch(() => null));

    if (!guild) {
      return;
    }

    await this.ensureAndSyncGuild(client, guild);
  },

  async ensureAndSyncGuild(client: Client<true>, guild: Guild): Promise<void> {
    try {
      const config = await guildConfigService.getOrCreateGuildConfig(guild.id, guild.name);
      const rizzStore = normalizeRizzStore(config);
      const inventory = normalizeInventory(config);
      const serviceStatus =
        (await serviceStatusService.getAllStatuses(guild.id)) ?? config.serviceStatus;
      const queueCount = await ticketRepository.countOpenByGuild(guild.id);
      const botId = client.user.id;

      const categoryId = await ensureCategory(guild, rizzStore, botId);

      if (!categoryId) {
        return;
      }

      const channelNames = buildChannelNames(
        queueCount,
        inventory,
        serviceStatus,
        rizzStore.groupPayoutEnabled,
      );

      const updatedChannels: RizzStoreChannelMap = { ...rizzStore.channels };

      for (const definition of RIZZ_STORE_CHANNEL_DEFINITIONS) {
        const channelId = await ensureVoiceChannel(
          guild,
          categoryId,
          definition.key,
          definition.namePrefix,
          channelNames[definition.key],
          rizzStore.channels[definition.key],
          botId,
        );

        if (channelId) {
          updatedChannels[definition.key] = channelId;
        }
      }

      await persistRizzStore(guild.id, {
        categoryId,
        groupPayoutEnabled: rizzStore.groupPayoutEnabled,
        channels: updatedChannels,
      });
    } catch (error) {
      logger.warn(`RizzStore sync skipped for guild ${guild.id}`);
      logger.error("RizzStore sync detail", error);
    }
  },

  async restoreAll(client: Client<true>): Promise<void> {
    logger.info("Restoring RizzStore status channels...");

    for (const guild of client.guilds.cache.values()) {
      try {
        await this.ensureAndSyncGuild(client, guild);
        logger.info(`RizzStore ready for guild ${guild.id}`);
      } catch (error) {
        logger.warn(`Failed to restore RizzStore for guild ${guild.id}`);
        logger.error("RizzStore restore detail", error);
      }
    }
  },

  async refreshQueue(client: Client<true>, guildId: string): Promise<void> {
    await this.syncGuild(client, guildId);
  },

  async refreshStock(client: Client<true>, guildId: string): Promise<void> {
    await this.syncGuild(client, guildId);
  },

  async refreshServiceStatuses(client: Client<true>, guildId: string): Promise<void> {
    await this.syncGuild(client, guildId);
  },

  async updateInventory(
    client: Client<true>,
    guildId: string,
    stockViaSend: number,
    stockGig: number,
  ): Promise<boolean> {
    try {
      await guildConfigRepository.updateByGuildId(guildId, {
        inventory: { stockViaSend, stockGig },
      });
      await this.refreshStock(client, guildId);
      return true;
    } catch (error) {
      logger.error(`Failed to update inventory for guild ${guildId}`, error);
      return false;
    }
  },
};
