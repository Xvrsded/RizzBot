import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  EmbedBuilder,
  StringSelectMenuBuilder,
  StringSelectMenuOptionBuilder,
} from "discord.js";
import { buildCustomId } from "../../interactions/custom-id";
import { formatIdr } from "../pricing";
import {
  COMMUNITY_PAYOUT_GROUP_LINKS,
  COMMUNITY_PAYOUT_PANEL_CHANNEL_ID,
  COMMUNITY_PAYOUT_GROUP_IDS,
} from "../../../shared/community-payout";
import { COMMUNITY_PAYOUT_PACKAGES } from "../../../shared/community-payout-packages";
import type { CommunityPayoutOrderSessionDocument } from "../../../database/models/community-payout-order-session.model";
import type { CommunityEligibilityResult, IndividualCommunityStatus } from "../../services/community-membership.service";
import {
  createBaseEmbed,
  createErrorEmbed,
  createSuccessEmbed,
  createWarningEmbed,
  EMBED_COLORS,
} from "./base.embed";

const PANEL_DIVIDER = "━━━━━━━━━━━━━━━━━━━━";
const FOOTER = { text: "RizzStore • Robux Community Payout" };

function formatEligibleDate(date: Date | null): string {
  if (!date) {
    return "-";
  }

  return new Intl.DateTimeFormat("id-ID", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Asia/Jakarta",
    timeZoneName: "short"
  }).format(date);
}

function buildPriceListBlock(): string {
  const lines = COMMUNITY_PAYOUT_PACKAGES.map(
    (pkg) => `${pkg.robuxAmount} Robux  = ${formatIdr(pkg.priceIdr)}`,
  );

  return ["```text", ...lines, "```"].join("\n");
}

function getCommunityWaitText(status: IndividualCommunityStatus): string {
  if (!status.isConfirmed) return "❌ Belum dikonfirmasi";
  if (status.status === "eligible") return "✅ Eligible";
  
  const now = new Date();
  if (status.eligibleAt) {
    const remainingMs = status.eligibleAt.getTime() - now.getTime();
    if (remainingMs > 0) {
      const remainingDays = Math.floor(remainingMs / (1000 * 60 * 60 * 24));
      const remainingHours = Math.floor((remainingMs % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      return `⏳ ${remainingDays} hari ${remainingHours} jam tersisa`;
    }
  }
  return "⏳ Menunggu update status";
}

export function buildCommunityPayoutPanelEmbed(serviceOpen: boolean): EmbedBuilder {
  return createBaseEmbed("🌐 ROBUX COMMUNITY PAYOUT", EMBED_COLORS.info)
    .setDescription(
      [
        "Robux dikirim melalui Roblox Community Payout.",
        "",
        "Untuk menggunakan layanan ini, user wajib:",
        "• Bergabung ke seluruh Community Roblox.",
        "• Menunggu minimal 14 hari sejak konfirmasi Community.",
        "• Setelah seluruh Community memenuhi masa tunggu, user mendapatkan role Eligible.",
        "",
        "**Community:**",
        "1️⃣ Community 1",
        "2️⃣ Community 2",
        "3️⃣ Community 3",
        "",
        `⚠️ *Status membership dicatat berdasarkan konfirmasi user. Pastikan kamu sudah benar-benar bergabung sebelum melakukan konfirmasi.*`,
        "",
        PANEL_DIVIDER,
        "",
        "💰 **PRICE LIST**",
        buildPriceListBlock(),
        "",
        serviceOpen ? "**Status:** 🟢 OPEN" : "**Status:** 🔴 CLOSED",
      ].join("\n"),
    )
    .setFooter(FOOTER);
}

export function buildCommunityPayoutPanelRowLinks(): ActionRowBuilder<ButtonBuilder> {
  return new ActionRowBuilder<ButtonBuilder>().addComponents(
    ...COMMUNITY_PAYOUT_GROUP_LINKS.map((link, index) =>
      new ButtonBuilder()
        .setLabel(`Community ${index + 1}`)
        .setStyle(ButtonStyle.Link)
        .setURL(link),
    ),
  );
}

export function buildCommunityPayoutPanelRowActions(): ActionRowBuilder<ButtonBuilder> {
  return new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder()
      .setCustomId(buildCustomId("community", "join"))
      .setLabel("Saya Sudah Join")
      .setEmoji("✅")
      .setStyle(ButtonStyle.Primary),
    new ButtonBuilder()
      .setCustomId(buildCustomId("community", "check"))
      .setLabel("Cek Status Eligibility")
      .setEmoji("📊")
      .setStyle(ButtonStyle.Secondary),
    new ButtonBuilder()
      .setCustomId(buildCustomId("community", "order"))
      .setLabel("Order Payout")
      .setEmoji("🛒")
      .setStyle(ButtonStyle.Success),
  );
}

// Keep this for backwards compatibility if needed, though we split rows in product-panel.service.ts
export function buildCommunityPayoutPanelRow(): ActionRowBuilder<ButtonBuilder> {
  return buildCommunityPayoutPanelRowActions();
}

export function buildCommunityDmConfirmationEmbed(): EmbedBuilder {
  return createBaseEmbed("🌐 KONFIRMASI COMMUNITY", EMBED_COLORS.info)
    .setDescription(
      [
        "Kamu akan mencatat bahwa kamu sudah bergabung dengan salah satu Roblox Community.",
        "",
        "⚠️ **Pastikan kamu benar-benar sudah join Community sebelum melakukan konfirmasi.**",
        "",
        "Pilih Community di bawah ini untuk mengonfirmasi keanggotaanmu."
      ].join("\n")
    )
    .setFooter(FOOTER);
}

export function buildCommunityDmConfirmationRow(): ActionRowBuilder<StringSelectMenuBuilder> {
  return new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(
    new StringSelectMenuBuilder()
      .setCustomId(buildCustomId("community", "dm_select"))
      .setPlaceholder("Pilih Community")
      .addOptions(
        COMMUNITY_PAYOUT_GROUP_IDS.map((id, index) => 
          new StringSelectMenuOptionBuilder()
            .setLabel(`Community ${index + 1}`)
            .setValue(id.toString())
        )
      )
  );
}

export function buildCommunityNotEligibleEmbed(result: CommunityEligibilityResult): EmbedBuilder {
  return createBaseEmbed("🟡 STATUS BELUM ELIGIBLE", EMBED_COLORS.warning)
    .setDescription(
      [
        `**Username:** ${result.robloxUsername ?? "-"}`,
        "",
        "**Community:**",
        `Community 1: ${result.community1.isConfirmed ? "✅" : "❌"}`,
        `Community 2: ${result.community2.isConfirmed ? "✅" : "❌"}`,
        `Community 3: ${result.community3.isConfirmed ? "✅" : "❌"}`,
        "",
        "**Masa tunggu:**",
        `Community 1 → ${getCommunityWaitText(result.community1)}`,
        `Community 2 → ${getCommunityWaitText(result.community2)}`,
        `Community 3 → ${getCommunityWaitText(result.community3)}`,
        "",
        "Catatan: Semua Community wajib dikonfirmasi dan memenuhi masa tunggu 14 hari."
      ].join("\n"),
    )
    .setFooter(FOOTER);
}

export function buildCommunityWaitingEmbed(result: CommunityEligibilityResult): EmbedBuilder {
  return createBaseEmbed("🟡 BELUM ELIGIBLE", EMBED_COLORS.warning)
    .setDescription(
      [
        `**Username:** ${result.robloxUsername ?? "-"}`,
        "",
        "**Community:**",
        `Community 1: ${result.community1.isConfirmed ? "✅" : "❌"}`,
        `Community 2: ${result.community2.isConfirmed ? "✅" : "❌"}`,
        `Community 3: ${result.community3.isConfirmed ? "✅" : "❌"}`,
        "",
        "**Masa tunggu:**",
        `Community 1 → ${getCommunityWaitText(result.community1)}`,
        `Community 2 → ${getCommunityWaitText(result.community2)}`,
        `Community 3 → ${getCommunityWaitText(result.community3)}`,
        "",
        "Catatan: Semua Community wajib dikonfirmasi dan memenuhi masa tunggu 14 hari."
      ].join("\n"),
    )
    .setFooter(FOOTER);
}

export function buildCommunityEligibleEmbed(result: CommunityEligibilityResult): EmbedBuilder {
  return createSuccessEmbed("🟢 ELIGIBLE", "")
    .setDescription(
      [
        `**Username:** ${result.robloxUsername ?? "-"}`,
        "",
        "**Community:**",
        "Community 1: ✅",
        "Community 2: ✅",
        "Community 3: ✅",
        "",
        "**Status:**",
        "🟢 ELIGIBLE",
        "",
        "Seluruh Community telah memenuhi masa tunggu 14 hari.",
        "Kamu sekarang sudah dapat menggunakan layanan Robux Community Payout."
      ].join("\n"),
    )
    .setFooter(FOOTER);
}

export function buildCommunityOrderLockedEmbed(): EmbedBuilder {
  return createErrorEmbed(
    "❌ BELUM ELIGIBLE",
    [
      "Kamu belum memenuhi syarat 14 hari pada seluruh Community.",
    ].join("\n"),
  ).setFooter(FOOTER);
}

export function buildCommunityPayoutClosedEmbed(): EmbedBuilder {
  return createErrorEmbed(
    "🔴 LAYANAN SEDANG DITUTUP",
    "Layanan Robux Community Payout sedang tidak tersedia saat ini.\n\nSilakan coba kembali nanti.",
  ).setFooter(FOOTER);
}

export function buildCommunityPackageSelectEmbed(): EmbedBuilder {
  return createBaseEmbed("💸 PILIH PAKET ROBUX", EMBED_COLORS.info)
    .setDescription("Pilih paket Robux Community Payout yang ingin dipesan.")
    .setFooter(FOOTER);
}

export function buildCommunityPackageSelectRow(sessionId?: string): ActionRowBuilder<StringSelectMenuBuilder> {
  const customId = sessionId
    ? buildCustomId("community", "package", sessionId)
    : buildCustomId("community", "package");

  return new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(
    new StringSelectMenuBuilder()
      .setCustomId(customId)
      .setPlaceholder("Pilih paket Robux")
      .addOptions(
        COMMUNITY_PAYOUT_PACKAGES.map((pkg) =>
          new StringSelectMenuOptionBuilder()
            .setLabel(`${pkg.robuxAmount} Robux`)
            .setDescription(formatIdr(pkg.priceIdr))
            .setValue(String(pkg.robuxAmount)),
        ),
      ),
  );
}

export interface CommunityPayoutOrderEmbedData {
  orderCode: string;
  robloxUsername: string;
  robuxAmount: number;
  finalPrice: number;
  customerMention: string;
}

export function sessionToCommunityPayoutEmbedData(
  session: CommunityPayoutOrderSessionDocument,
  customerMention: string,
): CommunityPayoutOrderEmbedData {
  return {
    orderCode: session.orderCode,
    robloxUsername: session.robloxUsername,
    robuxAmount: session.robuxAmount,
    finalPrice: session.finalPrice,
    customerMention,
  };
}

export function buildCommunityPayoutOrderPreviewEmbed(data: CommunityPayoutOrderEmbedData): EmbedBuilder {
  return createBaseEmbed("💸 ROBUX COMMUNITY PAYOUT", EMBED_COLORS.info)
    .setDescription(`Pesanan **#${data.orderCode}**`)
    .addFields(
      { name: "👤 CUSTOMER", value: data.customerMention, inline: false },
      { name: "🎮 ROBLOX USERNAME", value: data.robloxUsername, inline: true },
      { name: "💎 ROBUX", value: `${data.robuxAmount.toLocaleString("id-ID")} Robux`, inline: true },
      { name: "💰 TOTAL PEMBAYARAN", value: formatIdr(data.finalPrice), inline: false },
      { name: "📌 STATUS", value: "🟡 Menunggu Konfirmasi", inline: false },
    )
    .setFooter(FOOTER);
}

export function buildCommunityPayoutOrderPreviewRow(
  sessionId: string,
  disabled = false,
): ActionRowBuilder<ButtonBuilder> {
  return new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder()
      .setCustomId(buildCustomId("community", "confirm", sessionId))
      .setLabel("Konfirmasi Pesanan")
      .setEmoji("✅")
      .setStyle(ButtonStyle.Success)
      .setDisabled(disabled),
    new ButtonBuilder()
      .setCustomId(buildCustomId("community", "edit", sessionId))
      .setLabel("Edit Pesanan")
      .setEmoji("✏️")
      .setStyle(ButtonStyle.Secondary)
      .setDisabled(disabled),
    new ButtonBuilder()
      .setCustomId(buildCustomId("community", "cancel", sessionId))
      .setLabel("Batalkan Pesanan")
      .setEmoji("❌")
      .setStyle(ButtonStyle.Danger)
      .setDisabled(disabled),
  );
}

export function buildCommunityEligibleAnnouncementEmbed(
  discordUserId: string,
  robloxUsername: string,
): EmbedBuilder {
  return createSuccessEmbed("🎉 ROBUX PAYOUT — ELIGIBLE", "")
    .addFields(
      { name: "Customer", value: `<@${discordUserId}>`, inline: true },
      { name: "Username Roblox", value: `\`${robloxUsername}\``, inline: true },
      { name: "Status", value: "🟢 ELIGIBLE", inline: true },
    )
    .setDescription(
      "Seluruh Community telah memenuhi masa tunggu 14 hari.\nKamu sekarang sudah dapat menggunakan layanan Robux Community Payout.",
    )
    .setFooter(FOOTER);
}

export function buildCommunityEligibleDmEmbed(): EmbedBuilder {
  return createSuccessEmbed("🎉 ROBUX PAYOUT — ELIGIBLE", "")
    .setDescription(
      [
        "Selamat!",
        "",
        "Seluruh Community telah memenuhi masa tunggu 14 hari.",
        "",
        "**Status:**",
        "🟢 ELIGIBLE",
        "",
        "Kamu sekarang sudah dapat menggunakan layanan Robux Community Payout.",
      ].join("\n"),
    )
    .setFooter(FOOTER);
}

export function buildCommunityEligibleDmRow(): ActionRowBuilder<ButtonBuilder> {
  return new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder()
      .setLabel("Order Payout")
      .setEmoji("💸")
      .setStyle(ButtonStyle.Link)
      .setURL(`https://discord.com/channels/@me/${COMMUNITY_PAYOUT_PANEL_CHANNEL_ID}`),
  );
}

export function buildCommunityValidationErrorEmbed(message: string): EmbedBuilder {
  return createErrorEmbed("❌ VALIDASI GAGAL", message).setFooter(FOOTER);
}

export function buildCommunityUsernameNotFoundEmbed(username: string): EmbedBuilder {
  return createErrorEmbed(
    "❌ USERNAME TIDAK DITEMUKAN",
    `Roblox username **${username}** tidak ditemukan. Periksa ejaan username Anda.`,
  ).setFooter(FOOTER);
}

export function buildCommunityTicketSuccessEmbed(orderCode: string, channelId: string): EmbedBuilder {
  return createSuccessEmbed(
    "✅ TICKET BERHASIL DIBUAT",
    [`Pesanan **#${orderCode}** telah dikonfirmasi.`, `Silakan lanjutkan di ${`<#${channelId}>`}.`].join("\n"),
  ).setFooter(FOOTER);
}

export function buildCommunityTicketErrorEmbed(code: string): EmbedBuilder {
  const messages: Record<string, string> = {
    TICKET_PERMISSION_DENIED: "Bot tidak memiliki izin untuk membuat ticket.",
    TICKET_CREATE_FAILED: "Gagal membuat ticket. Silakan hubungi staff.",
  };

  return createErrorEmbed("❌ GAGAL MEMBUAT TICKET", messages[code] ?? "Terjadi kesalahan saat membuat ticket.").setFooter(
    FOOTER,
  );
}

export function buildCommunityOrderExpiredEmbed(): EmbedBuilder {
  return createWarningEmbed(
    "⏰ SESI PESANAN KADALUARSA",
    "Sesi pesanan telah kedaluwarsa. Silakan mulai pesanan baru dari panel.",
  ).setFooter(FOOTER);
}

export function buildCommunityOrderCancelledEmbed(orderCode: string): EmbedBuilder {
  return createWarningEmbed("🔴 PESANAN DIBATALKAN", `Pesanan **#${orderCode}** telah dibatalkan.`).setFooter(FOOTER);
}

export function createCommunityErrorEmbed(title: string, description: string): EmbedBuilder {
  return createErrorEmbed(title, description).setFooter(FOOTER);
}
