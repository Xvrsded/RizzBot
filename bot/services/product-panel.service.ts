import {
  ProductType,
  GIFT_IN_GAME_CHANNEL_ID,
  ROBUX_USERNAME_CHANNEL_ID,
  ROBUX_LOGIN_CHANNEL_ID,
  ITEM_LIMITED_CHANNEL_ID,
  ITEM_LIMITED_TRADE_INFO_CHANNEL_ID,
  ITEM_TUMBAL_PANEL_KEY,
  MIDDLEMAN_CHANNEL_ID,
  COMMUNITY_PAYOUT_CHANNEL_ID,
} from "../../shared/products";
import {
  buildCommunityPayoutPanelEmbed,
  buildCommunityPayoutPanelRowLinks,
  buildCommunityPayoutPanelRowActions,
} from "../utils/embeds/community-payout.embed";
import { serviceStatusService } from "./service-status.service";
import { buildMiddlemanPanelEmbed, buildMiddlemanFeeDropdownRow } from "../utils/embeds/middleman.embed";
import { productPanelMessageRepository } from "../../database/repositories/product-panel-message.repository";
import type { ProductPanelKey } from "../../database/models/product-panel-message.model";
import { buildGiftPanelEmbed, buildGiftInGamePanelRow } from "../utils/embeds/gift-in-game.embed";
import { buildRobuxPanelEmbed, buildRobuxPanelRow } from "../utils/embeds/robux-username.embed";
import { buildLoginPanelEmbed, buildLoginPanelRow } from "../utils/embeds/login.embed";
import { buildLimitedPanelEmbed, buildLimitedPanelRow } from "../utils/embeds/limited.embed";
import { buildItemTumbalPanelEmbeds } from "../utils/embeds/item-tumbal.embed";
import { logger } from "../../shared/logger";
import type { Client, TextChannel } from "discord.js";
import { guildConfigService } from "./guild-config.service";
async function findTextChannel(
  client: Client<true>,
  channelId: string,
): Promise<TextChannel | null> {
  const channel = await client.channels.fetch(channelId).catch(() => null);

  if (!channel || !channel.isTextBased() || channel.isDMBased()) {
    return null;
  }

  return channel as TextChannel;
}

async function restoreProductPanel(
  client: Client<true>,
  productType: ProductPanelKey,
  defaultChannelId: string,
  label: string,
  buildEmbed: (
    guildId: string,
  ) => ReturnType<typeof buildGiftPanelEmbed> | Promise<ReturnType<typeof buildGiftPanelEmbed>>,
  buildRow: () => ReturnType<typeof buildGiftInGamePanelRow>,
): Promise<void> {
  const guilds = [...client.guilds.cache.values()];

  for (const guild of guilds) {
    try {
      const record = await productPanelMessageRepository.findByGuildAndProduct(guild.id, productType);
      const channelId = record?.channelId ?? defaultChannelId;
      const channel = await findTextChannel(client, channelId);

      if (!channel) {
        logger.dashboard(`${label} channel ${channelId} not found in guild ${guild.id}`);
        continue;
      }

      const embed = await buildEmbed(guild.id);
      const row = buildRow();

      if (record) {
        const existingMessage = await channel.messages.fetch(record.messageId).catch(() => null);

        if (existingMessage) {
          await existingMessage.edit({ embeds: [embed], components: [row] });
          logger.dashboard(`Updated existing ${label} panel in guild ${guild.id}`);
          continue;
        }
      }

      const message = await channel.send({ embeds: [embed], components: [row] });

      await productPanelMessageRepository.upsert({
        guildId: guild.id,
        productType,
        channelId: channel.id,
        messageId: message.id,
      });

      logger.dashboard(`Created ${label} panel in guild ${guild.id} (${channel.id})`);
    } catch (error) {
      logger.warn(`Failed to restore ${label} panel in guild ${guild.id}`);
      logger.error(`${label} panel restore detail`, error);
    }
  }
}

async function restoreInfoPanel(
  client: Client<true>,
  panelKey: ProductPanelKey,
  defaultChannelId: string,
  label: string,
  buildEmbeds: () => ReturnType<typeof buildItemTumbalPanelEmbeds>,
): Promise<void> {
  const guilds = [...client.guilds.cache.values()];

  for (const guild of guilds) {
    try {
      const record = await productPanelMessageRepository.findByGuildAndProduct(guild.id, panelKey);
      const channelId = record?.channelId ?? defaultChannelId;
      const channel = await findTextChannel(client, channelId);

      if (!channel) {
        logger.dashboard(`${label} channel ${channelId} not found in guild ${guild.id}`);
        continue;
      }

      const embeds = buildEmbeds();

      if (record) {
        const existingMessage = await channel.messages.fetch(record.messageId).catch(() => null);

        if (existingMessage) {
          await existingMessage.edit({ embeds, components: [] });
          logger.dashboard(`Updated existing ${label} panel in guild ${guild.id}`);
          continue;
        }
      }

      const message = await channel.send({ embeds, components: [] });

      await productPanelMessageRepository.upsert({
        guildId: guild.id,
        productType: panelKey,
        channelId: channel.id,
        messageId: message.id,
      });

      logger.dashboard(`Created ${label} panel in guild ${guild.id} (${channel.id})`);
    } catch (error) {
      logger.warn(`Failed to restore ${label} panel in guild ${guild.id}`);
      logger.error(`${label} panel restore detail`, error);
    }
  }
}
export const productPanelService = {
  async restoreGiftInGamePanel(client: Client<true>): Promise<void> {
    logger.dashboard("Restoring Gift In Game product panel...");
    await restoreProductPanel(
      client,
      ProductType.GIFT_IN_GAME,
      GIFT_IN_GAME_CHANNEL_ID,
      "Gift In Game",
      async (guildId) => buildGiftPanelEmbed(await guildConfigService.getGigPricing(guildId)),
      buildGiftInGamePanelRow,
    );
  },

  async restoreRobuxUsernamePanel(client: Client<true>): Promise<void> {
    logger.dashboard("Restoring Robux Via Username product panel...");
    await restoreProductPanel(
      client,
      ProductType.ROBUX_USERNAME,
      ROBUX_USERNAME_CHANNEL_ID,
      "Robux Via Username",
      buildRobuxPanelEmbed,
      buildRobuxPanelRow,
    );
  },

  async restoreLoginPanel(client: Client<true>): Promise<void> {
    logger.dashboard("Restoring Robux Via Login product panel...");
    await restoreProductPanel(
      client,
      ProductType.ROBUX_LOGIN,
      ROBUX_LOGIN_CHANNEL_ID,
      "Robux Via Login",
      buildLoginPanelEmbed,
      buildLoginPanelRow,
    );
  },

  async restoreLimitedPanel(client: Client<true>): Promise<void> {
    logger.dashboard("Restoring Item Limited product panel...");
    await restoreProductPanel(
      client,
      ProductType.ITEM_LIMITED,
      ITEM_LIMITED_CHANNEL_ID,
      "Item Limited",
      buildLimitedPanelEmbed,
      buildLimitedPanelRow,
    );
  },

  async restoreItemTumbalPanel(client: Client<true>): Promise<void> {
    logger.dashboard("Restoring Item Tumbal info panel...");
    await restoreInfoPanel(
      client,
      ITEM_TUMBAL_PANEL_KEY,
      ITEM_LIMITED_TRADE_INFO_CHANNEL_ID,
      "Item Tumbal",
      buildItemTumbalPanelEmbeds,
    );
  },

  async restoreMiddlemanPanel(client: Client<true>): Promise<void> {
    logger.dashboard("Restoring Middleman product panel...");
    const guilds = [...client.guilds.cache.values()];

    for (const guild of guilds) {
      await this.refreshMiddlemanPanelForGuild(client, guild.id);
    }
  },

  async refreshMiddlemanPanelForGuild(client: Client<true>, guildId: string): Promise<void> {
    try {
      const serviceOpen = (await serviceStatusService.isEnabled(guildId, "mmReber")) ?? true;
      const record = await productPanelMessageRepository.findByGuildAndProduct(
        guildId,
        ProductType.MIDDLEMAN,
      );
      const channelId = record?.channelId ?? MIDDLEMAN_CHANNEL_ID;
      const channel = await findTextChannel(client, channelId);

      if (!channel) {
        logger.dashboard(`Middleman channel ${channelId} not found in guild ${guildId}`);
        return;
      }

      const embed = buildMiddlemanPanelEmbed(serviceOpen);
      const row = buildMiddlemanFeeDropdownRow();

      if (record) {
        const existingMessage = await channel.messages.fetch(record.messageId).catch(() => null);

        if (existingMessage) {
          await existingMessage.edit({ embeds: [embed], components: [row] });
          logger.dashboard(`Updated Middleman panel in guild ${guildId}`);
          return;
        }
      }

      const message = await channel.send({ embeds: [embed], components: [row] });

      await productPanelMessageRepository.upsert({
        guildId,
        productType: ProductType.MIDDLEMAN,
        channelId: channel.id,
        messageId: message.id,
      });

      logger.dashboard(`Created Middleman panel in guild ${guildId} (${channel.id})`);
    } catch (error) {
      logger.warn(`Failed to restore Middleman panel in guild ${guildId}`);
      logger.error("Middleman panel restore detail", error);
    }
  },

  async restoreCommunityPayoutPanel(client: Client<true>): Promise<void> {
    logger.dashboard("Restoring Community Payout product panel...");
    const guilds = [...client.guilds.cache.values()];

    for (const guild of guilds) {
      await this.refreshCommunityPayoutPanelForGuild(client, guild.id);
    }
  },

  async refreshCommunityPayoutPanelForGuild(client: Client<true>, guildId: string): Promise<void> {
    try {
      const serviceOpen = (await serviceStatusService.isEnabled(guildId, "communityPayout")) ?? true;
      const record = await productPanelMessageRepository.findByGuildAndProduct(
        guildId,
        ProductType.COMMUNITY_PAYOUT,
      );
      const channelId = record?.channelId ?? COMMUNITY_PAYOUT_CHANNEL_ID;
      const channel = await findTextChannel(client, channelId);

      if (!channel) {
        logger.dashboard(`Community Payout channel ${channelId} not found in guild ${guildId}`);
        return;
      }

      const embed = buildCommunityPayoutPanelEmbed(serviceOpen);
      const rowLinks = buildCommunityPayoutPanelRowLinks();
      const rowActions = buildCommunityPayoutPanelRowActions();

      if (record) {
        const existingMessage = await channel.messages.fetch(record.messageId).catch(() => null);

        if (existingMessage) {
          await existingMessage.edit({ embeds: [embed], components: [rowLinks, rowActions] });
          logger.dashboard(`Updated Community Payout panel in guild ${guildId}`);
          return;
        }
      }

      const message = await channel.send({ embeds: [embed], components: [rowLinks, rowActions] });

      await productPanelMessageRepository.upsert({
        guildId,
        productType: ProductType.COMMUNITY_PAYOUT,
        channelId: channel.id,
        messageId: message.id,
      });

      logger.dashboard(`Created Community Payout panel in guild ${guildId} (${channel.id})`);
    } catch (error) {
      logger.warn(`Failed to restore Community Payout panel in guild ${guildId}`);
      logger.error("Community Payout panel restore detail", error);
    }
  },
};
