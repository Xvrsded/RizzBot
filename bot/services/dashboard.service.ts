import type { Client, TextChannel } from "discord.js";
import { DASHBOARD_CHANNEL_ID } from "../../shared/products";
import { SERVICE_STATUS_KEYS } from "../../shared/service-status";
import { dashboardMessageRepository } from "../../database/repositories/dashboard-message.repository";
import { dashboardStatsRepository } from "../../database/repositories/dashboard-stats.repository";
import { ticketRepository } from "../../database/repositories/ticket.repository";
import { guildConfigService } from "./guild-config.service";
import { serviceStatusService } from "./service-status.service";
import {
  buildDashboardEmbed,
  buildDashboardRows,
  type DashboardStats,
} from "../utils/embeds/dashboard.embed";
import { logger } from "../../shared/logger";

async function findDashboardChannel(
  client: Client<true>,
  channelId: string,
): Promise<TextChannel | null> {
  const channel = await client.channels.fetch(channelId).catch(() => null);

  if (!channel?.isTextBased() || channel.isDMBased()) {
    return null;
  }

  return channel as TextChannel;
}

async function buildDashboardStats(guildId: string, lastUpdate: Date): Promise<DashboardStats> {
  const statuses = (await serviceStatusService.getAllStatuses(guildId))!;
  const [activeTickets, ordersToday] = await Promise.all([
    ticketRepository.countOpenByGuild(guildId),
    dashboardStatsRepository.countOrdersTodayByGuild(guildId),
  ]);

  return {
    activeCategories: serviceStatusService.countActiveCategories(statuses),
    totalCategories: SERVICE_STATUS_KEYS.length,
    activeTickets,
    ordersToday,
    lastUpdate,
  };
}

export const dashboardService = {
  async getDashboardPayload(guildId: string) {
    const statuses = await serviceStatusService.getAllStatuses(guildId);

    if (!statuses) {
      return null;
    }

    const config = await guildConfigService.getGuildConfig(guildId);
    const lastUpdate = config?.dashboardLastUpdatedAt ?? new Date();
    const stats = await buildDashboardStats(guildId, lastUpdate);

    return {
      embed: buildDashboardEmbed(statuses, stats),
      rows: buildDashboardRows(statuses),
      statuses,
      stats,
    };
  },

  async renderDashboardMessage(
    client: Client<true>,
    guildId: string,
    channel: TextChannel,
    existingMessageId?: string | null,
  ): Promise<string | null> {
    const payload = await this.getDashboardPayload(guildId);

    if (!payload) {
      logger.warn(`Dashboard payload unavailable for guild ${guildId}`);
      return null;
    }

    if (existingMessageId) {
      const existingMessage = await channel.messages.fetch(existingMessageId).catch(() => null);

      if (existingMessage) {
        await existingMessage.edit({
          embeds: [payload.embed],
          components: payload.rows,
        });

        await guildConfigService.updateGuildConfig(guildId, {
          dashboardChannelId: channel.id,
          dashboardMessageId: existingMessage.id,
          dashboardLastUpdatedAt: payload.stats.lastUpdate,
        });

        return existingMessage.id;
      }
    }

    const message = await channel.send({
      embeds: [payload.embed],
      components: payload.rows,
    });

    await dashboardMessageRepository.upsertByGuildId(guildId, {
      channelId: channel.id,
      messageId: message.id,
    });

    await guildConfigService.updateGuildConfig(guildId, {
      dashboardChannelId: channel.id,
      dashboardMessageId: message.id,
      dashboardLastUpdatedAt: payload.stats.lastUpdate,
    });

    return message.id;
  },

  async refreshDashboard(client: Client<true>, guildId: string): Promise<boolean> {
    const record = await dashboardMessageRepository.findByGuildId(guildId);
    const channelId = record?.channelId ?? DASHBOARD_CHANNEL_ID;
    const channel = await findDashboardChannel(client, channelId);

    if (!channel) {
      logger.dashboard(`Dashboard channel ${channelId} unavailable for guild ${guildId}`);
      return false;
    }

    await guildConfigService.updateGuildConfig(guildId, {
      dashboardLastUpdatedAt: new Date(),
    });

    const messageId = await this.renderDashboardMessage(
      client,
      guildId,
      channel,
      record?.messageId ?? null,
    );

    return messageId !== null;
  },

  async restoreDashboard(client: Client<true>): Promise<void> {
    logger.dashboard("Restoring control center dashboard...");

    const guilds = [...client.guilds.cache.values()];

    for (const guild of guilds) {
      try {
        await guildConfigService.getOrCreateGuildConfig(guild.id, guild.name);

        const record = await dashboardMessageRepository.findByGuildId(guild.id);
        const config = await guildConfigService.getGuildConfig(guild.id);
        const channelId = record?.channelId ?? config?.dashboardChannelId ?? DASHBOARD_CHANNEL_ID;
        const channel = await findDashboardChannel(client, channelId);

        if (!channel) {
          logger.dashboard(`Dashboard channel ${channelId} not found in guild ${guild.id}`);
          continue;
        }

        const messageId = record?.messageId ?? config?.dashboardMessageId ?? null;
        const renderedId = await this.renderDashboardMessage(client, guild.id, channel, messageId);

        if (renderedId) {
          logger.dashboard(`Dashboard ready in guild ${guild.id} (${channel.id}/${renderedId})`);
        }
      } catch (error) {
        logger.warn(`Failed to restore dashboard for guild ${guild.id}`);
        logger.error("Dashboard restore detail", error);
      }
    }
  },
};
