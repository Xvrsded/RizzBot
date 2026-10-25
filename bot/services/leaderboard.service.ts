import type { APIEmbed, Client, Message, TextChannel, Guild, GuildMember } from "discord.js";
import {
  GIFT_OWNER_ROLE_ID,
  GIFT_TRANSACTION_LOG_CHANNEL_ID,
  LEADERBOARD_CHANNEL_ID,
} from "../../shared/products";
import { guildConfigService } from "./guild-config.service";
import { leaderboardMessageRepository } from "../../database/repositories/leaderboard-message.repository";
import {
  aggregateLeaderboard,
  parseTransactionLogEmbed,
  type LeaderboardAggregation,
  type ParsedTransactionLog,
  type CustomerLeaderboardEntry,
} from "./leaderboard-parser";
import {
  buildLeaderboardEmbed,
  buildLeaderboardRefreshRow,
} from "../utils/embeds/leaderboard.embed";
import { logger } from "../../shared/logger";

let refreshPromise: Promise<boolean> | null = null;

function logLeaderboard(message: string): void {
  logger.info(`[LEADERBOARD] ${message}`);
}

async function findTextChannel(client: Client<true>, channelId: string): Promise<TextChannel | null> {
  const channel = await client.channels.fetch(channelId).catch(() => null);

  if (!channel?.isTextBased() || channel.isDMBased()) {
    return null;
  }

  return channel as TextChannel;
}

async function fetchAllChannelMessages(channel: TextChannel): Promise<Message[]> {
  const messages: Message[] = [];
  let before: string | undefined;

  while (true) {
    const batch = await channel.messages.fetch({ limit: 100, before }).catch(() => null);

    if (!batch || batch.size === 0) {
      break;
    }

    messages.push(...batch.values());
    before = batch.last()?.id;

    if (batch.size < 100) {
      break;
    }
  }

  return messages;
}

function shouldKeepLeaderboardMessage(message: Message, client: Client<true>): boolean {
  if (message.author.bot) {
    return true;
  }

  if (message.author.id === client.user.id) {
    return true;
  }

  if (message.webhookId && message.applicationId === client.application?.id) {
    return true;
  }

  return false;
}

export interface LeaderboardCleanupResult {
  deletedUserMessages: number;
  keptBotMessages: number;
  channelName: string;
}

export async function clearUserMessagesFromLeaderboardChannel(
  client: Client<true>,
): Promise<LeaderboardCleanupResult | null> {
  const channel = await findTextChannel(client, LEADERBOARD_CHANNEL_ID);

  if (!channel) {
    logLeaderboard(`Leaderboard cleanup failed: channel ${LEADERBOARD_CHANNEL_ID} unavailable`);
    return null;
  }

  let deletedUserMessages = 0;
  let keptBotMessages = 0;

  try {
    const messages = await fetchAllChannelMessages(channel);

    for (const message of messages) {
      if (shouldKeepLeaderboardMessage(message, client)) {
        keptBotMessages += 1;
        continue;
      }

      try {
        await message.delete();
        deletedUserMessages += 1;
      } catch (error) {
        logLeaderboard(`Failed to delete user message ${message.id} in leaderboard channel`);
        logger.error("[LEADERBOARD] Cleanup delete error", error);
      }
    }

    logLeaderboard(
      `Cleanup complete: deleted ${deletedUserMessages} user message(s), kept ${keptBotMessages} bot message(s)`,
    );

    return {
      deletedUserMessages,
      keptBotMessages,
      channelName: channel.name,
    };
  } catch (error) {
    logLeaderboard("Leaderboard cleanup failed");
    logger.error("[LEADERBOARD] Cleanup error", error);
    return null;
  }
}

async function loadTransactionsFromLogChannel(client: Client<true>): Promise<ParsedTransactionLog[]> {
  const logChannel = await findTextChannel(client, GIFT_TRANSACTION_LOG_CHANNEL_ID);

  if (!logChannel) {
    logLeaderboard("Failed to read transaction logs: log channel unavailable");
    return [];
  }

  try {
    const messages = await fetchAllChannelMessages(logChannel);
    const transactions: ParsedTransactionLog[] = [];

    for (const message of messages) {
      const embed = message.embeds[0];

      if (!embed) {
        continue;
      }

      const parsed = parseTransactionLogEmbed(message.id, embed.toJSON() as APIEmbed);

      if (!parsed) {
        if (/transaction completed/i.test(embed.title ?? "")) {
          logLeaderboard(`Invalid transaction log skipped: ${message.id}`);
        }
        continue;
      }

      transactions.push(parsed);
    }

    return transactions;
  } catch (error) {
    logLeaderboard("Failed to read transaction logs");
    logger.error("[LEADERBOARD] Transaction log fetch error", error);
    return [];
  }
}

async function buildAggregation(client: Client<true>): Promise<LeaderboardAggregation> {
  const transactions = await loadTransactionsFromLogChannel(client);
  return aggregateLeaderboard(transactions);
}

const LEADERBOARD_ROLES = [
  { threshold: 100_000_000, roleId: "1555630216028885012" },
  { threshold: 75_000_000, roleId: "1555629952328667236" },
  { threshold: 50_000_000, roleId: "1555629400790405120" },
  { threshold: 30_000_000, roleId: "1555629768760758372" },
  { threshold: 10_000_000, roleId: "1537368224851566672" },
  { threshold: 5_000_000, roleId: "1447842093107249183" },
  { threshold: 1_000_000, roleId: "1447842107372081295" },
  { threshold: 500_000, roleId: "1447842122014392360" },
];

async function updateAutoRoles(guild: Guild, customers: CustomerLeaderboardEntry[]): Promise<void> {
  const allRoleIds = LEADERBOARD_ROLES.map((r) => r.roleId);

  // 1. Owner mendapatkan SEMUA role leaderboard
  const ownerMembers = new Map<string, GuildMember>();
  try {
    const config = await guildConfigService.getGuildConfig(guild.id).catch(() => null);
    const ownerRoleIds = new Set<string>([GIFT_OWNER_ROLE_ID]);
    if (config?.ownerRoleId) {
      ownerRoleIds.add(config.ownerRoleId);
    }

    if (guild.ownerId) {
      const serverOwner = await guild.members.fetch(guild.ownerId).catch(() => null);
      if (serverOwner) {
        ownerMembers.set(serverOwner.id, serverOwner);
      }
    }

    for (const roleId of ownerRoleIds) {
      const role = guild.roles.cache.get(roleId) ?? (await guild.roles.fetch(roleId).catch(() => null));
      if (role) {
        for (const [id, member] of role.members) {
          ownerMembers.set(id, member);
        }
      }
    }

    for (const owner of ownerMembers.values()) {
      const missingRoles = allRoleIds.filter((id) => !owner.roles.cache.has(id));
      if (missingRoles.length > 0) {
        await owner.roles.add(missingRoles, "Leaderboard auto-role (Owner gets all roles)").catch((error) => {
          logger.error(`[LEADERBOARD] Failed to add all roles to owner ${owner.id}`, error);
        });
      }
    }
  } catch (error) {
    logger.error("[LEADERBOARD] Failed to process owner auto-roles", error);
  }

  // 2. Berikan role ke customer berdasarkan total belanja
  // Role sebelumnya TIDAK dihapus saat user upgrade role
  for (const customer of customers) {
    // Jika customer adalah Owner, lewati karena sudah mendapatkan semua role
    if (ownerMembers.has(customer.customerId)) {
      continue;
    }

    const qualifiedRoles = LEADERBOARD_ROLES
      .filter((r) => customer.totalSpentIdr >= r.threshold)
      .map((r) => r.roleId);

    if (qualifiedRoles.length === 0) {
      continue;
    }

    try {
      const member = await guild.members.fetch(customer.customerId).catch(() => null);
      if (!member) continue;

      // Hanya tambahkan role yang belum dimiliki, jangan hapus role sebelumnya
      const rolesToAdd = qualifiedRoles.filter((id) => !member.roles.cache.has(id));

      if (rolesToAdd.length > 0) {
        await member.roles.add(rolesToAdd, "Leaderboard auto-role update");
      }
    } catch (error) {
      logger.error(`[LEADERBOARD] Failed to update roles for ${customer.customerId}`, error);
    }
  }
}

async function renderLeaderboardMessage(
  client: Client<true>,
  guildId: string,
  channel: TextChannel,
  aggregation: LeaderboardAggregation,
  existingMessageId?: string | null,
): Promise<string | null> {
  const updatedAt = new Date();
  const embed = buildLeaderboardEmbed(aggregation, updatedAt);
  const components = [buildLeaderboardRefreshRow()];

  if (existingMessageId) {
    const existingMessage = await channel.messages.fetch(existingMessageId).catch(() => null);

    if (existingMessage) {
      await existingMessage.edit({ embeds: [embed], components });
      await leaderboardMessageRepository.upsertByGuildId(guildId, {
        channelId: channel.id,
        messageId: existingMessage.id,
      });
      return existingMessage.id;
    }

    logLeaderboard("Leaderboard message not found, creating new message");
  }

  const message = await channel.send({ embeds: [embed], components });
  await leaderboardMessageRepository.upsertByGuildId(guildId, {
    channelId: channel.id,
    messageId: message.id,
  });

  return message.id;
}

export const leaderboardService = {
  scheduleRefresh(client: Client<true>): Promise<boolean> {
    if (refreshPromise) {
      return refreshPromise;
    }

    refreshPromise = this.refreshLeaderboard(client).finally(() => {
      refreshPromise = null;
    });

    return refreshPromise;
  },

  async refreshLeaderboard(client: Client<true>): Promise<boolean> {
    const channel = await findTextChannel(client, LEADERBOARD_CHANNEL_ID);

    if (!channel?.guild) {
      logLeaderboard("Leaderboard channel unavailable");
      return false;
    }

    try {
      const guildId = channel.guild.id;
      const aggregation = await buildAggregation(client);
      
      // Update auto roles based on aggregation
      await updateAutoRoles(channel.guild, aggregation.customers);

      const record = await leaderboardMessageRepository.findByGuildId(guildId);
      const messageId = await renderLeaderboardMessage(
        client,
        guildId,
        channel,
        aggregation,
        record?.messageId ?? null,
      );

      if (messageId) {
        logLeaderboard(
          `Updated leaderboard (${aggregation.totalCustomers} customers, ${aggregation.totalTransactions} transactions, ${aggregation.totalRevenueIdr} IDR)`,
        );
      }

      return messageId !== null;
    } catch (error) {
      logLeaderboard("Failed to refresh leaderboard");
      logger.error("[LEADERBOARD] Refresh error", error);
      return false;
    }
  },

  async restoreLeaderboard(client: Client<true>): Promise<void> {
    logLeaderboard("Restoring customer leaderboard...");

    const channel = await findTextChannel(client, LEADERBOARD_CHANNEL_ID);

    if (!channel?.guild) {
      logLeaderboard(`Leaderboard channel ${LEADERBOARD_CHANNEL_ID} unavailable`);
      return;
    }

    const refreshed = await this.refreshLeaderboard(client);

    if (refreshed) {
      logLeaderboard(`Leaderboard ready in guild ${channel.guild.id} (${channel.id})`);
    }
  },

  clearUserMessagesFromLeaderboardChannel,
};
