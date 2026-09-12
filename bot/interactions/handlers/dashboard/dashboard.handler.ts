import { type ButtonInteraction, type ModalSubmitInteraction } from "discord.js";
import type { ParsedCustomId } from "../../custom-id";
import { parseServiceToggleId, type ServiceStatusKey } from "../../../../shared/service-status";
import { dashboardService } from "../../../services/dashboard.service";
import { serviceStatusService } from "../../../services/service-status.service";
import { guildConfigService } from "../../../services/guild-config.service";
import { rizzStoreStatusService } from "../../../services/rizz-store-status.service";
import { productPanelService } from "../../../services/product-panel.service";
import { requireDashboardAccess } from "../../../permissions/dashboard";
import { PermissionDeniedError } from "../../../permissions/guards";
import {
  buildDashboardAccessDeniedEmbed,
  buildDashboardRefreshedEmbed,
  buildDashboardStubEmbed,
  buildServiceUnavailableEmbed,
  buildServiceUpdatedEmbed,
} from "../../../utils/embeds/service-status.embed";
import {
  buildInventoryInvalidEmbed,
  buildInventoryModal,
  buildInventorySavedEmbed,
  buildInventorySaveFailedEmbed,
  extractInventoryModalInput,
} from "../../../utils/embeds/inventory.embed";
import { parseInventoryAmount } from "../../../utils/format-inventory";
import { replyEmbedEphemeral } from "../../../utils/reply";
import { parseIdrAmount } from "../../../utils/pricing";
import {
  buildGigPricingInvalidEmbed,
  buildGigPricingModal,
  buildGigPricingSavedEmbed,
  extractGigPricingModalInput,
} from "../../../utils/embeds/gig-pricing.embed";
import { logger } from "../../../../shared/logger";

const STUB_LABELS: Record<string, string> = {
  "gig-config": "GIG Config",
  "mm-management": "MM Management",
  "limited-mgt": "Limited MGT",
};

async function assertDashboardAccess(
  interaction: ButtonInteraction | ModalSubmitInteraction,
): Promise<boolean> {
  try {
    requireDashboardAccess(interaction);
    return true;
  } catch (error) {
    if (error instanceof PermissionDeniedError) {
      await replyEmbedEphemeral(interaction, buildDashboardAccessDeniedEmbed());
      return false;
    }

    throw error;
  }
}

export async function handleDashboardButton(
  interaction: ButtonInteraction,
  parsed: ParsedCustomId,
): Promise<void> {
  if (!interaction.inGuild() || !interaction.guild) {
    await replyEmbedEphemeral(interaction, buildDashboardAccessDeniedEmbed());
    return;
  }

  if (!(await assertDashboardAccess(interaction))) {
    return;
  }

  const guildId = interaction.guild.id;

  if (parsed.action === "inventory") {
    const config = await guildConfigService.getOrCreateGuildConfig(guildId);
    const stockViaSend = config.inventory?.stockViaSend ?? 0;
    const stockGig = config.inventory?.stockGig ?? 0;

    await interaction.showModal(buildInventoryModal(stockViaSend, stockGig));
    return;
  }

  if (parsed.action === "stub") {
    if (parsed.id === "gig-config") {
      const pricing = await guildConfigService.getGigPricing(guildId);
      await interaction.showModal(buildGigPricingModal(pricing));
      return;
    }

    await replyEmbedEphemeral(
      interaction,
      buildDashboardStubEmbed(STUB_LABELS[parsed.id ?? ""] ?? "Management"),
    );
    return;
  }

  if (parsed.action === "refresh") {
    await interaction.deferUpdate();

    const refreshed = await dashboardService.refreshDashboard(interaction.client, guildId);
    await rizzStoreStatusService.syncGuild(interaction.client, guildId);

    if (!refreshed) {
      await interaction.followUp({
        embeds: [buildServiceUnavailableEmbed()],
        ephemeral: true,
      });
      return;
    }

    await interaction.followUp({
      embeds: [buildDashboardRefreshedEmbed()],
      ephemeral: true,
    });

    logger.dashboard(`Dashboard refreshed by ${interaction.user.id} in guild ${guildId}`);
    return;
  }

  if (parsed.action === "toggle") {
    const serviceKey = parseServiceToggleId(parsed.id ?? "");

    if (!serviceKey) {
      await replyEmbedEphemeral(interaction, buildServiceUnavailableEmbed());
      return;
    }

    await interaction.deferUpdate();

    const updatedStatuses = await serviceStatusService.toggleStatus(guildId, serviceKey);

    if (!updatedStatuses) {
      await interaction.followUp({
        embeds: [buildServiceUnavailableEmbed()],
        ephemeral: true,
      });
      return;
    }

    await guildConfigService.updateGuildConfig(guildId, {
      dashboardLastUpdatedAt: new Date(),
    });

    const refreshed = await dashboardService.refreshDashboard(interaction.client, guildId);
    await rizzStoreStatusService.refreshServiceStatuses(interaction.client, guildId);

    if (serviceKey === "mmReber") {
      await productPanelService.refreshMiddlemanPanelForGuild(interaction.client, guildId);
    }

    if (serviceKey === "communityPayout") {
      await productPanelService.refreshCommunityPayoutPanelForGuild(interaction.client, guildId);
    }

    if (!refreshed) {
      await interaction.followUp({
        embeds: [buildServiceUnavailableEmbed()],
        ephemeral: true,
      });
      return;
    }

    await interaction.followUp({
      embeds: [buildServiceUpdatedEmbed(serviceKey, updatedStatuses[serviceKey as ServiceStatusKey])],
      ephemeral: true,
    });

    logger.dashboard(
      `Service ${serviceKey} toggled to ${updatedStatuses[serviceKey as ServiceStatusKey] ? "OPEN" : "CLOSED"} by ${interaction.user.id}`,
    );
    return;
  }

  await replyEmbedEphemeral(interaction, buildServiceUnavailableEmbed());
}

export async function handleDashboardModal(
  interaction: ModalSubmitInteraction,
  parsed: ParsedCustomId,
): Promise<void> {
  if (!interaction.inGuild() || !interaction.guild) {
    await replyEmbedEphemeral(interaction, buildServiceUnavailableEmbed());
    return;
  }

  if (!(await assertDashboardAccess(interaction))) {
    return;
  }

  const guildId = interaction.guild.id;

  if (parsed.action === "gig-pricing-save") {
    const { rateRaw, roundingRaw } = extractGigPricingModalInput(interaction);
    const rateIdr = parseIdrAmount(rateRaw);
    const roundingIdr = parseIdrAmount(roundingRaw);

    if (rateIdr === null || roundingIdr === null) {
      await replyEmbedEphemeral(interaction, buildGigPricingInvalidEmbed());
      return;
    }

    await interaction.deferReply({ ephemeral: true });

    const pricing = await guildConfigService.updateGigPricing(guildId, {
      rateIdr,
      roundingIdr,
    });

    if (!pricing) {
      await interaction.editReply({ embeds: [buildServiceUnavailableEmbed()] });
      return;
    }

    await dashboardService.refreshDashboard(interaction.client, guildId);
    await productPanelService.restoreGiftInGamePanel(interaction.client);
    await interaction.editReply({ embeds: [buildGigPricingSavedEmbed(pricing)] });
    logger.dashboard(
      `GIG pricing updated by ${interaction.user.id} in guild ${guildId} (rate=${rateIdr}, rounding=${roundingIdr})`,
    );
    return;
  }

  if (parsed.action !== "inventory-save") {
    await replyEmbedEphemeral(interaction, buildServiceUnavailableEmbed());
    return;
  }

  const { stockViaSendRaw, stockGigRaw } = extractInventoryModalInput(interaction);
  const stockViaSend = parseInventoryAmount(stockViaSendRaw);
  const stockGig = parseInventoryAmount(stockGigRaw);

  if (stockViaSend === null || stockGig === null) {
    await replyEmbedEphemeral(interaction, buildInventoryInvalidEmbed());
    return;
  }

  await interaction.deferReply({ ephemeral: true });

  const saved = await rizzStoreStatusService.updateInventory(
    interaction.client,
    guildId,
    stockViaSend,
    stockGig,
  );

  if (!saved) {
    await interaction.editReply({ embeds: [buildInventorySaveFailedEmbed()] });
    return;
  }

  await interaction.editReply({
    embeds: [buildInventorySavedEmbed(stockViaSend, stockGig)],
  });

  logger.dashboard(
    `Inventory updated by ${interaction.user.id} in guild ${guildId} (viaSend=${stockViaSend}, gig=${stockGig})`,
  );
}
