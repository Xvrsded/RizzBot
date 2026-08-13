import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  EmbedBuilder,
} from "discord.js";
import { buildCustomId } from "../../interactions/custom-id";
import {
  ITEM_LIMITED_TRADE_INFO_CHANNEL_ID,
} from "../../../shared/products";
import {
  formatOrderCodeLabel,
  formatRobloxUsernameCopy,
} from "../formatters";
import {
  createBaseEmbed,
  createErrorEmbed,
  createSuccessEmbed,
  createWarningEmbed,
  EMBED_COLORS,
} from "./base.embed";

const LIMITED_FOOTER = { text: "RizzBot • Item Limited" };
const LIMITED_PRODUCT_LABEL = "```text\nITEM LIMITED\n```";
const LIMITED_PRICE_UNSET = "```text\nBELUM DITENTUKAN\n```";
const PANEL_DIVIDER = "━━━━━━━━━━━━━━━━━━━━";

export function createLimitedErrorEmbed(title: string, description: string): EmbedBuilder {
  return createErrorEmbed(title, description).setFooter(LIMITED_FOOTER);
}

function applyAvatar(embed: EmbedBuilder, avatarUrl: string | null): EmbedBuilder {
  if (avatarUrl) {
    embed.setThumbnail(avatarUrl);
  }

  return embed;
}

function formatLimitedItemCopy(itemName: string): string {
  return `\`\`\`text\n${itemName.trim()}\n\`\`\``;
}

export interface LimitedOrderEmbedData {
  orderCode: string;
  itemName: string;
  robloxUsername: string;
  robloxAvatarUrl: string | null;
}

function buildLimitedPanelHeaderBlock(): string {
  return [
    "```text",
    "╔═══════════════════╗",
    "     RIZZBLOX STORE",
    "      ITEM LIMITED",
    "╚═══════════════════╝",
    "```",
  ].join("\n");
}

export function buildLimitedPanelEmbed(): EmbedBuilder {
  return createBaseEmbed("💎 ITEM LIMITED", EMBED_COLORS.info)
    .setDescription(
      [
        buildLimitedPanelHeaderBlock(),
        "",
        "Ingin mendapatkan item Limited Roblox?",
        "",
        "Untuk Item Limited, harga tidak menggunakan pricelist tetap. Harga akan dibicarakan langsung antara customer dan staff melalui ticket.",
      ].join("\n"),
    )
    .addFields(
      {
        name: PANEL_DIVIDER,
        value: "\u200b",
        inline: false,
      },
      {
        name: "📌 INFORMASI & PERSYARATAN",
        value: [
          "• Customer yang ingin melakukan transaksi Item Limited diharapkan sudah menggunakan akun Roblox Premium.",
          "• Customer wajib memiliki item tumbal yang dapat digunakan untuk proses trade.",
          "• Item tumbal yang baru didapatkan memiliki masa tunggu 7 hari sebelum dapat digunakan untuk trade.",
          "• Pastikan item tumbal yang digunakan memang dapat ditrade.",
          "• Informasi mengenai item tumbal dapat dilihat pada channel informasi yang telah disediakan oleh server.",
        ].join("\n"),
        inline: false,
      },
      {
        name: "📚 Informasi Item Tumbal",
        value: `<#${ITEM_LIMITED_TRADE_INFO_CHANNEL_ID}>`,
        inline: false,
      },
      {
        name: PANEL_DIVIDER,
        value: "\u200b",
        inline: false,
      },
      {
        name: "🛒 SIAP MELAKUKAN PEMBELIAN?",
        value: "Klik tombol di bawah untuk memulai pesanan Item Limited.",
        inline: false,
      },
    )
    .setFooter(LIMITED_FOOTER);
}

export function buildLimitedPanelRow(): ActionRowBuilder<ButtonBuilder> {
  return new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder()
      .setCustomId(buildCustomId("limited", "order"))
      .setLabel("ORDER SEKARANG")
      .setEmoji("🛒")
      .setStyle(ButtonStyle.Primary),
  );
}

export function buildLimitedOrderPreviewEmbed(data: LimitedOrderEmbedData): EmbedBuilder {
  const embed = createBaseEmbed("💎 ITEM LIMITED", EMBED_COLORS.info)
    .setDescription(
      [
        "**📦 DETAIL PESANAN**",
        "",
        formatOrderCodeLabel(data.orderCode),
        "",
        "🟡 **STATUS**",
        "MENUNGGU KONFIRMASI",
      ].join("\n"),
    )
    .addFields(
      {
        name: "💎 ITEM",
        value: formatLimitedItemCopy(data.itemName),
        inline: false,
      },
      {
        name: "👤 ROBLOX USERNAME",
        value: formatRobloxUsernameCopy(data.robloxUsername),
        inline: false,
      },
      {
        name: "🏷️ PRODUK",
        value: LIMITED_PRODUCT_LABEL,
        inline: false,
      },
      {
        name: "💰 HARGA",
        value: LIMITED_PRICE_UNSET,
        inline: false,
      },
    )
    .setFooter(LIMITED_FOOTER);

  return applyAvatar(embed, data.robloxAvatarUrl);
}

export function buildLimitedOrderPreviewRow(sessionId: string, disabled = false): ActionRowBuilder<ButtonBuilder> {
  return new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder()
      .setCustomId(buildCustomId("limited", "confirm", sessionId))
      .setLabel("KONFIRMASI PESANAN")
      .setEmoji("✅")
      .setStyle(ButtonStyle.Success)
      .setDisabled(disabled),
    new ButtonBuilder()
      .setCustomId(buildCustomId("limited", "edit", sessionId))
      .setLabel("EDIT PESANAN")
      .setEmoji("✏️")
      .setStyle(ButtonStyle.Secondary)
      .setDisabled(disabled),
    new ButtonBuilder()
      .setCustomId(buildCustomId("limited", "cancel", sessionId))
      .setLabel("BATALKAN PESANAN")
      .setEmoji("❌")
      .setStyle(ButtonStyle.Danger)
      .setDisabled(disabled),
  );
}

export function buildLimitedValidationErrorEmbed(message: string): EmbedBuilder {
  return createLimitedErrorEmbed("❌ VALIDASI GAGAL", message);
}

export function buildLimitedUsernameNotFoundEmbed(username: string): EmbedBuilder {
  return createLimitedErrorEmbed(
    "❌ USERNAME ROBLOX TIDAK DITEMUKAN",
    ["Username:", formatRobloxUsernameCopy(username), "", "Pastikan username Roblox yang dimasukkan benar."].join(
      "\n",
    ),
  );
}

export function buildLimitedOrderExpiredEmbed(): EmbedBuilder {
  return createWarningEmbed(
    "⏰ SESI PESANAN KADALUARSA",
    "❌ SESSION EXPIRED\n\nSilakan mulai kembali proses pemesanan.",
  ).setFooter(LIMITED_FOOTER);
}

export function buildLimitedOrderCancelledEmbed(orderCode: string): EmbedBuilder {
  return createWarningEmbed(
    "🔴 PESANAN DIBATALKAN",
    `Pesanan **#${orderCode}** telah dibatalkan.`,
  ).setFooter(LIMITED_FOOTER);
}

export function buildLimitedAlreadyCancelledEmbed(orderCode: string): EmbedBuilder {
  return createWarningEmbed(
    "ℹ️ PESANAN SUDAH DIBATALKAN",
    `Pesanan **#${orderCode}** sudah dibatalkan sebelumnya.`,
  ).setFooter(LIMITED_FOOTER);
}

export function buildLimitedAlreadyConfirmedEmbed(orderCode: string, ticketMention: string): EmbedBuilder {
  return createSuccessEmbed(
    "✅ PESANAN SUDAH DIKONFIRMASI",
    [`Pesanan **#${orderCode}** sudah dikonfirmasi.`, `Ticket: ${ticketMention}`].join("\n"),
  ).setFooter(LIMITED_FOOTER);
}

export function buildLimitedDuplicateTicketEmbed(ticketMention: string): EmbedBuilder {
  return createWarningEmbed(
    "⚠️ TICKET AKTIF DITEMUKAN",
    [`Anda masih memiliki ticket Item Limited yang belum selesai: ${ticketMention}`].join("\n"),
  ).setFooter(LIMITED_FOOTER);
}

export function buildLimitedTicketSuccessEmbed(orderCode: string, channelId: string): EmbedBuilder {
  return createSuccessEmbed(
    "✅ TICKET BERHASIL DIBUAT",
    [`Pesanan **#${orderCode}** telah dikonfirmasi.`, `Silakan lanjutkan di ${`<#${channelId}>`}.`].join("\n"),
  ).setFooter(LIMITED_FOOTER);
}

export function buildLimitedTicketErrorEmbed(code: string): EmbedBuilder {
  const messages: Record<string, string> = {
    TICKET_PERMISSION_DENIED: "Bot tidak memiliki izin untuk membuat ticket.",
    TICKET_CREATE_FAILED: "Gagal membuat ticket. Silakan hubungi staff.",
  };

  return createLimitedErrorEmbed(
    "❌ GAGAL MEMBUAT TICKET",
    messages[code] ?? "Terjadi kesalahan saat membuat ticket.",
  );
}

export function sessionToLimitedEmbedData(session: {
  orderCode: string;
  itemName: string;
  robloxUsername: string;
  robloxAvatarUrl: string | null;
}): LimitedOrderEmbedData {
  return {
    orderCode: session.orderCode,
    itemName: session.itemName,
    robloxUsername: session.robloxUsername,
    robloxAvatarUrl: session.robloxAvatarUrl,
  };
}
