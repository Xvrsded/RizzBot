import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  EmbedBuilder,
} from "discord.js";
import { DEFAULT_GIG_PRICING, type GigPricingConfig } from "../../../shared/products";
import {
  SERVICE_LABELS,
  SERVICE_STATUS_KEYS,
  SERVICE_TOGGLE_IDS,
  type ServiceStatusKey,
  type ServiceStatusMap,
} from "../../../shared/service-status";
import { buildCustomId } from "../../interactions/custom-id";
import { createBaseEmbed, EMBED_COLORS } from "./base.embed";
import { formatDashboardTimestamp } from "../../../database/repositories/dashboard-stats.repository";

const PANEL_DIVIDER = "━━━━━━━━━━━━━━━━━━━━━━━━";
const DASHBOARD_FOOTER = { text: "RizzBot • Control Center" };

export interface DashboardStats {
  activeCategories: number;
  totalCategories: number;
  activeTickets: number;
  ordersToday: number;
  lastUpdate: Date;
}

function formatStatusLine(key: ServiceStatusKey, enabled: boolean): string {
  const icon = enabled ? "🟢" : "🔴";
  return `${icon} ${SERVICE_LABELS[key]}`;
}

function buildToggleButton(key: ServiceStatusKey, enabled: boolean): ButtonBuilder {
  const icon = enabled ? "🟢" : "🔴";
  const shortLabels: Record<ServiceStatusKey, string> = {
    robuxLogin: "Via Login",
    robuxSend: "Via Send",
    giftInGame: "Gift In Game",
    mmReber: "Middleman",
    limitedItem: "Limited Item",
    communityPayout: "Community Payout",
  };

  return new ButtonBuilder()
    .setCustomId(buildCustomId("dashboard", "toggle", SERVICE_TOGGLE_IDS[key]))
    .setLabel(`${icon} ${shortLabels[key]}`)
    .setStyle(enabled ? ButtonStyle.Success : ButtonStyle.Danger);
}

export function buildDashboardEmbed(
  statuses: ServiceStatusMap,
  stats: DashboardStats,
  pricing: GigPricingConfig = DEFAULT_GIG_PRICING,
): EmbedBuilder {
  const statusLines = SERVICE_STATUS_KEYS.map((key) => formatStatusLine(key, statuses[key]));

  return createBaseEmbed("🛠️ RIZZBOT CONTROL CENTER", EMBED_COLORS.primary)
    .addFields(
      {
        name: "📦 PRODUCT STATUS",
        value: statusLines.join("\n"),
        inline: false,
      },
      {
        name: PANEL_DIVIDER,
        value: "\u200b",
        inline: false,
      },
      {
        name: "📊 SYSTEM INFORMATION",
        value: [
          `• Kategori Aktif: **${stats.activeCategories} / ${stats.totalCategories}**`,
          `• GIG Rate: **Rp${pricing.rateIdr.toLocaleString("id-ID")} / Robux**`,
          `• Ticket Aktif: **${stats.activeTickets}**`,
          `• Order Hari Ini: **${stats.ordersToday}**`,
          "",
          `**Last Update:**`,
          formatDashboardTimestamp(stats.lastUpdate),
        ].join("\n"),
        inline: false,
      },
      {
        name: PANEL_DIVIDER,
        value: "⚙️ MANAGEMENT",
        inline: false,
      },
    )
    .setFooter(DASHBOARD_FOOTER)
    .setTimestamp(stats.lastUpdate);
}

export function buildDashboardRows(statuses: ServiceStatusMap): ActionRowBuilder<ButtonBuilder>[] {
  return [
    new ActionRowBuilder<ButtonBuilder>().addComponents(
      buildToggleButton("robuxLogin", statuses.robuxLogin),
      buildToggleButton("robuxSend", statuses.robuxSend),
      buildToggleButton("giftInGame", statuses.giftInGame),
    ),
    new ActionRowBuilder<ButtonBuilder>().addComponents(
      buildToggleButton("mmReber", statuses.mmReber),
      buildToggleButton("limitedItem", statuses.limitedItem),
      buildToggleButton("communityPayout", statuses.communityPayout),
    ),
    new ActionRowBuilder<ButtonBuilder>().addComponents(
      new ButtonBuilder()
        .setCustomId(buildCustomId("dashboard", "inventory"))
        .setLabel("Inventory Management")
        .setEmoji("📦")
        .setStyle(ButtonStyle.Secondary),
    ),
    new ActionRowBuilder<ButtonBuilder>().addComponents(
      new ButtonBuilder()
        .setCustomId(buildCustomId("dashboard", "stub", "gig-config"))
        .setLabel("GIG Config")
        .setEmoji("⚙️")
        .setStyle(ButtonStyle.Secondary),
      new ButtonBuilder()
        .setCustomId(buildCustomId("dashboard", "stub", "mm-management"))
        .setLabel("MM Management")
        .setEmoji("🛡️")
        .setStyle(ButtonStyle.Secondary),
      new ButtonBuilder()
        .setCustomId(buildCustomId("dashboard", "stub", "limited-mgt"))
        .setLabel("Limited MGT")
        .setEmoji("💎")
        .setStyle(ButtonStyle.Secondary),
    ),
    new ActionRowBuilder<ButtonBuilder>().addComponents(
      new ButtonBuilder()
        .setCustomId(buildCustomId("dashboard", "refresh"))
        .setLabel("Refresh Server")
        .setEmoji("🔄")
        .setStyle(ButtonStyle.Primary),
    ),
  ];
}
