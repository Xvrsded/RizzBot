import { ActionRowBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder } from "discord.js";
import { buildCustomId } from "../../interactions/custom-id";
import { formatIdr } from "../pricing";
import { createBaseEmbed, EMBED_COLORS } from "./base.embed";
import {
  type CustomerLeaderboardEntry,
  type LeaderboardAggregation,
  PANEL_DIVIDER,
} from "../../services/leaderboard-parser";

const RANK_MEDALS = ["🥇", "🥈", "🥉"] as const;

function formatRankLine(rank: number, customerId: string, entry: CustomerLeaderboardEntry): string {
  const rankLabel = rank <= 3 ? RANK_MEDALS[rank - 1]! : `**${rank}.**`;
  const customerLabel = `<@${customerId}>`;

  return [
    `${rankLabel} ${customerLabel}`,
    `\`${formatIdr(entry.totalSpentIdr)}\``,
    `🛒 ${entry.transactionCount} transaksi`,
  ].join("\n");
}

function formatUpdatedAt(date: Date): string {
  return new Intl.DateTimeFormat("id-ID", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Asia/Jakarta",
    hour12: false,
  }).format(date);
}

export function buildLeaderboardEmbed(
  aggregation: LeaderboardAggregation,
  updatedAt: Date,
): EmbedBuilder {
  const topCustomers = aggregation.customers.slice(0, 10);
  const rankingLines =
    topCustomers.length > 0
      ? topCustomers.map((entry, index) => formatRankLine(index + 1, entry.customerId, entry)).join("\n\n")
      : "_Belum ada transaksi SUCCESS yang tercatat._";

  const description = [
    "Customer dengan total transaksi tertinggi di RizzStore.",
    "",
    rankingLines,
    "",
    PANEL_DIVIDER,
    "",
    "📊 **STATISTIK RIZZSTORE**",
    "",
    `👥 Total Customer:\n**${aggregation.totalCustomers.toLocaleString("id-ID")}**`,
    "",
    `🛒 Total Transaksi:\n**${aggregation.totalTransactions.toLocaleString("id-ID")}**`,
    "",
    `💰 Total Omzet:\n**${formatIdr(aggregation.totalRevenueIdr)}**`,
    "",
    PANEL_DIVIDER,
    "",
    `**Update:**\n${formatUpdatedAt(updatedAt)}`,
  ].join("\n");

  return createBaseEmbed("🏆 RIZZSTORE CUSTOMER LEADERBOARD", EMBED_COLORS.primary)
    .setDescription(description)
    .setFooter({ text: "RizzBot • Customer Leaderboard" })
    .setTimestamp(updatedAt);
}

export function buildLeaderboardRefreshRow(): ActionRowBuilder<ButtonBuilder> {
  return new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder()
      .setCustomId(buildCustomId("leaderboard", "refresh"))
      .setLabel("Refresh Leaderboard")
      .setEmoji("🔄")
      .setStyle(ButtonStyle.Secondary),
  );
}

export function buildLeaderboardAccessDeniedEmbed(): EmbedBuilder {
  return createBaseEmbed("⚠️ AKSES DITOLAK", EMBED_COLORS.warning)
    .setDescription(
      [
        "Anda tidak memiliki izin untuk mengelola leaderboard RizzStore.",
        "",
        "Hanya Owner dan Admin yang dapat melakukan refresh leaderboard.",
      ].join("\n"),
    )
    .setFooter({ text: "RizzBot • Customer Leaderboard" });
}

export function buildLeaderboardRefreshedEmbed(): EmbedBuilder {
  return createBaseEmbed("🔄 LEADERBOARD REFRESHED", EMBED_COLORS.success)
    .setDescription("Leaderboard berhasil diperbarui dengan data transaction log terbaru.")
    .setFooter({ text: "RizzBot • Customer Leaderboard" });
}

export function buildLeaderboardRefreshFailedEmbed(): EmbedBuilder {
  return createBaseEmbed("❌ REFRESH GAGAL", EMBED_COLORS.error)
    .setDescription("Leaderboard tidak dapat diperbarui saat ini. Silakan coba lagi nanti.")
    .setFooter({ text: "RizzBot • Customer Leaderboard" });
}

export interface LeaderboardCleanupEmbedData {
  deletedUserMessages: number;
  keptBotMessages: number;
  channelLabel: string;
}

export function buildLeaderboardCleanupEmbed(data: LeaderboardCleanupEmbedData): EmbedBuilder {
  return createBaseEmbed("🧹 LEADERBOARD CLEANUP", EMBED_COLORS.success)
    .setDescription(
      [
        `**Pesan user dihapus:**\n${data.deletedUserMessages.toLocaleString("id-ID")}`,
        "",
        `**Pesan bot dipertahankan:**\n${data.keptBotMessages.toLocaleString("id-ID")}`,
        "",
        "**Status:**\n✅ CLEANUP SELESAI",
        "",
        `**Channel:**\n${data.channelLabel}`,
      ].join("\n"),
    )
    .setFooter({ text: "RizzBot • Customer Leaderboard" });
}

export function buildLeaderboardCleanupFailedEmbed(): EmbedBuilder {
  return createBaseEmbed("❌ CLEANUP GAGAL", EMBED_COLORS.error)
    .setDescription(
      "Channel leaderboard tidak dapat diakses atau cleanup gagal dijalankan. Silakan coba lagi nanti.",
    )
    .setFooter({ text: "RizzBot • Customer Leaderboard" });
}
