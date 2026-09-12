import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  EmbedBuilder,
} from "discord.js";
import { DEFAULT_GIG_PRICING, type GigPricingConfig } from "../../../shared/products";
import { buildCustomId } from "../../interactions/custom-id";
import { formatIdr } from "../pricing";
import {
  formatGiftGameField,
  formatGiftGamepass,
  formatGiftPayment,
  formatGiftRecipient,
  formatGiftValue,
  formatOrderCodeLabel,
} from "../formatters";
import { createBaseEmbed, createErrorEmbed, createSuccessEmbed, createWarningEmbed, EMBED_COLORS } from "./base.embed";

export interface GiftOrderEmbedData {
  orderCode: string;
  gameName: string;
  gamepassName: string;
  robuxAmount: number;
  rawPrice: number;
  finalPrice: number;
  rateIdr?: number;
  robloxUsername: string;
  robloxDisplayName: string;
  robloxAvatarUrl: string | null;
}

type GiftOrderStatus = "pending" | "confirmed" | "cancelled";

const STATUS_LABEL: Record<GiftOrderStatus, string> = {
  pending: "🟡 MENUNGGU KONFIRMASI",
  confirmed: "🟢 DIKONFIRMASI",
  cancelled: "🔴 DIBATALKAN",
};

function applyAvatar(embed: EmbedBuilder, avatarUrl: string | null): EmbedBuilder {
  if (avatarUrl) {
    embed.setThumbnail(avatarUrl);
  }

  return embed;
}

function buildOrderDescription(orderCode: string, status: GiftOrderStatus, hint: string): string {
  return [formatOrderCodeLabel(orderCode), STATUS_LABEL[status], "", hint].join("\n");
}

export function buildGiftPanelEmbed(pricing: GigPricingConfig = DEFAULT_GIG_PRICING): EmbedBuilder {
  return createBaseEmbed("🎁 GIFT IN GAME", EMBED_COLORS.gift).setDescription(
    [
      "Pesan Gamepass Roblox yang mendukung fitur gifting — tanpa perlu memiliki Robux sendiri.",
      "",
      "━━━━━━━━━━━━━━━━━━━━",
      "",
      `💎 **RATE**`,
      `1 Robux = ${formatIdr(pricing.rateIdr)}`,
      "",
      `Pembayaran dibulatkan ke atas ke kelipatan ${formatIdr(pricing.roundingIdr)}.`,
      "",
      "━━━━━━━━━━━━━━━━━━━━",
      "",
      "📌 **SEBELUM ORDER**",
      "• Pastikan game dan Gamepass sudah benar",
      "• Pastikan Gamepass dapat di-gift",
      "• Periksa username penerima sebelum konfirmasi",
    ].join("\n"),
  );
}

/** @deprecated Use buildGiftPanelEmbed */
export const buildGiftInGamePanelEmbed = buildGiftPanelEmbed;

export function buildGiftInGamePanelRow(): ActionRowBuilder<ButtonBuilder> {
  return new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder()
      .setCustomId(buildCustomId("gift", "order"))
      .setLabel("ORDER SEKARANG")
      .setEmoji("🎁")
      .setStyle(ButtonStyle.Primary),
  );
}

export function buildGiftOrderPreviewEmbed(data: GiftOrderEmbedData): EmbedBuilder {
  const embed = createBaseEmbed("🎁 GIFT IN GAME", EMBED_COLORS.gift)
    .setDescription(
      buildOrderDescription(
        data.orderCode,
        "pending",
        "Periksa seluruh detail di bawah sebelum melanjutkan konfirmasi.",
      ),
    )
    .addFields(
      { name: "👤 PENERIMA", value: formatGiftRecipient(data.robloxUsername, data.robloxDisplayName), inline: true },
      { name: "🎮 GAME", value: formatGiftGameField(data.gameName), inline: true },
      { name: "🎟 GAMEPASS", value: formatGiftGamepass(data.gamepassName, data.robuxAmount), inline: true },
      { name: "💎 VALUE", value: formatGiftValue(data.robuxAmount), inline: true },
      {
        name: "💰 RINGKASAN PEMBAYARAN",
        value: formatGiftPayment(data.robuxAmount, data.rawPrice, data.finalPrice, {
          rateIdr: data.rateIdr ?? DEFAULT_GIG_PRICING.rateIdr,
          roundingIdr: DEFAULT_GIG_PRICING.roundingIdr,
        }),
        inline: false,
      },
    );

  return applyAvatar(embed, data.robloxAvatarUrl);
}

/** @deprecated Use buildGiftOrderPreviewEmbed */
export const buildOrderPreviewEmbed = buildGiftOrderPreviewEmbed;

export function buildOrderPreviewRow(sessionId: string, disabled = false): ActionRowBuilder<ButtonBuilder> {
  return new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder()
      .setCustomId(buildCustomId("gift", "confirm", sessionId))
      .setLabel("KONFIRMASI PESANAN")
      .setEmoji("✅")
      .setStyle(ButtonStyle.Success)
      .setDisabled(disabled),
    new ButtonBuilder()
      .setCustomId(buildCustomId("gift", "edit", sessionId))
      .setLabel("EDIT PESANAN")
      .setEmoji("✏️")
      .setStyle(ButtonStyle.Secondary)
      .setDisabled(disabled),
    new ButtonBuilder()
      .setCustomId(buildCustomId("gift", "cancel", sessionId))
      .setLabel("BATALKAN PESANAN")
      .setEmoji("❌")
      .setStyle(ButtonStyle.Danger)
      .setDisabled(disabled),
  );
}

export function buildGiftErrorEmbed(title: string, description: string): EmbedBuilder {
  return createErrorEmbed(title, description);
}

export function buildUsernameNotFoundEmbed(username: string): EmbedBuilder {
  return buildGiftErrorEmbed(
    "❌ USERNAME TIDAK DITEMUKAN",
    [`Username **${username}** tidak ditemukan di Roblox.`, "", "Periksa kembali ejaan username lalu coba lagi."].join(
      "\n",
    ),
  );
}

export function buildUsernameNotFoundRow(): ActionRowBuilder<ButtonBuilder> {
  return new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder()
      .setCustomId(buildCustomId("gift", "order"))
      .setLabel("EDIT PESANAN")
      .setEmoji("✏️")
      .setStyle(ButtonStyle.Secondary),
    new ButtonBuilder()
      .setCustomId(buildCustomId("gift", "dismiss"))
      .setLabel("BATALKAN")
      .setEmoji("❌")
      .setStyle(ButtonStyle.Danger),
  );
}

export function buildValidationErrorEmbed(message: string): EmbedBuilder {
  return buildGiftErrorEmbed("❌ TERJADI KESALAHAN", message);
}

export function buildSessionExpiredEmbed(): EmbedBuilder {
  return createWarningEmbed(
    "⌛ SESI PESANAN KADALUARSA",
    "Sesi pesanan sudah tidak berlaku. Tekan **ORDER SEKARANG** pada panel untuk membuat pesanan baru.",
  );
}

export function buildGiftCancelledEmbed(orderCode: string): EmbedBuilder {
  return createBaseEmbed("🎁 GIFT IN GAME", EMBED_COLORS.error)
    .setDescription(
      [
        formatOrderCodeLabel(orderCode),
        STATUS_LABEL.cancelled,
        "",
        "Pesanan ini telah dibatalkan dan tidak akan diproses.",
      ].join("\n"),
    );
}

/** @deprecated Use buildGiftCancelledEmbed */
export const buildCancelledEmbed = buildGiftCancelledEmbed;

export function buildGiftConfirmedEmbed(orderCode: string, channelMention: string): EmbedBuilder {
  return createSuccessEmbed(
    "🎁 GIFT IN GAME",
    [
      formatOrderCodeLabel(orderCode),
      STATUS_LABEL.confirmed,
      "",
      "Pesanan Anda telah dikonfirmasi.",
      "",
      `Lanjutkan proses melalui ticket: ${channelMention}`,
      "",
      "Tim staff akan segera memproses pesanan Anda.",
    ].join("\n"),
  );
}

/** @deprecated Use buildGiftConfirmedEmbed */
export function buildConfirmedEmbed(channelMention: string): EmbedBuilder {
  return createSuccessEmbed(
    "✅ PESANAN DIKONFIRMASI",
    [`Lanjutkan proses melalui ticket: ${channelMention}`].join("\n"),
  );
}

export function buildDuplicateTicketEmbed(channelMention: string): EmbedBuilder {
  return createWarningEmbed(
    "⚠️ PESANAN MASIH BERJALAN",
    ["Anda masih memiliki pesanan Gift In Game yang sedang diproses.", "", `Lanjutkan melalui ticket: ${channelMention}`].join(
      "\n",
    ),
  );
}

export function buildTicketErrorEmbed(code: string): EmbedBuilder {
  switch (code) {
    case "TICKET_CATEGORY_NOT_CONFIGURED":
      return buildTicketCategoryMissingEmbed();
    case "TICKET_CATEGORY_NOT_FOUND":
      return createWarningEmbed(
        "⚠️ KATEGORI TICKET TIDAK DITEMUKAN",
        [
          "Kategori ticket yang dikonfigurasi tidak ditemukan di server ini.",
          "",
          "Admin perlu menjalankan `/ticket setup` ulang.",
          "",
          "`Kode: TICKET_CATEGORY_NOT_FOUND`",
        ].join("\n"),
      );
    case "TICKET_CATEGORY_INVALID":
      return createWarningEmbed(
        "⚠️ KATEGORI TICKET TIDAK VALID",
        [
          "Konfigurasi ticket category tidak valid.",
          "",
          "Admin perlu memilih **Category Channel**, bukan text channel biasa.",
          "",
          "`Kode: TICKET_CATEGORY_INVALID`",
        ].join("\n"),
      );
    case "TICKET_PERMISSION_DENIED":
      return createWarningEmbed(
        "⚠️ TICKET TIDAK DAPAT DIBUAT",
        [
          "Bot tidak memiliki permission yang diperlukan untuk membuat ticket.",
          "",
          "Silakan hubungi Staff.",
        ].join("\n"),
      );
    case "TICKET_CREATE_FAILED":
      return createErrorEmbed(
        "❌ TICKET GAGAL DIBUAT",
        [
          "Terjadi kesalahan saat membuat ticket.",
          "",
          "Pesanan Anda masih **PENDING** — silakan coba konfirmasi kembali.",
          "",
          "`Kode: TICKET_CREATE_FAILED`",
        ].join("\n"),
      );
    default:
      return createErrorEmbed("❌ TERJADI KESALAHAN", "Terjadi kesalahan saat memproses ticket.");
  }
}

export function buildGiftTicketSuccessEmbed(orderCode: string, channelId: string): EmbedBuilder {
  return createSuccessEmbed(
    "🎉 PESANAN BERHASIL DIBUAT",
    [
      formatOrderCodeLabel(orderCode),
      "🟢 PESANAN DIKONFIRMASI",
      "",
      "Ticket telah dibuat.",
      "",
      `**Channel:** <#${channelId}>`,
      "",
      "Silakan lanjutkan proses melalui ticket tersebut.",
    ].join("\n"),
  );
}

export function buildAlreadyConfirmedEmbed(orderCode: string, channelMention: string): EmbedBuilder {
  return createWarningEmbed(
    "⚠️ PESANAN SUDAH DIKONFIRMASI",
    [
      formatOrderCodeLabel(orderCode),
      "",
      "Pesanan ini sudah memiliki ticket aktif.",
      "",
      `Lanjutkan melalui: ${channelMention}`,
    ].join("\n"),
  );
}

export function buildAlreadyCancelledEmbed(orderCode: string): EmbedBuilder {
  return createWarningEmbed(
    "⚠️ PESANAN SUDAH DIBATALKAN",
    [formatOrderCodeLabel(orderCode), "", "Pesanan ini sudah dibatalkan dan tidak dapat dikonfirmasi."].join("\n"),
  );
}

export function buildOrderExpiredEmbed(): EmbedBuilder {
  return createWarningEmbed(
    "⌛ PESANAN SUDAH KADALUARSA",
    "Sesi pesanan sudah tidak berlaku. Silakan buat pesanan baru dari panel Gift In Game.",
  );
}
export function buildTicketCategoryMissingEmbed(): EmbedBuilder {
  return createWarningEmbed(
    "⚠️ TICKET BELUM SIAP",
    [
      "Sistem ticket server belum selesai dikonfigurasi.",
      "",
      "Silakan hubungi **Staff/Admin** server untuk menyelesaikan konfigurasi terlebih dahulu.",
      "",
      "Admin dapat menjalankan `/ticket setup` untuk mengatur kategori ticket.",
      "",
      "`Kode: TICKET_CATEGORY_NOT_CONFIGURED`",
    ].join("\n"),
  );
}

export function buildTicketConfigSuccessEmbed(categoryName: string): EmbedBuilder {
  return createSuccessEmbed(
    "⚙️ TICKET CONFIGURATION",
    ["Ticket category berhasil dikonfigurasi.", "", `**Category:**`, categoryName, "", "**Status:**", "● ACTIVE"].join(
      "\n",
    ),
  );
}

export function buildDismissedEmbed(): EmbedBuilder {
  return createBaseEmbed("ℹ️ DIBATALKAN", EMBED_COLORS.primary).setDescription(
    "Pesanan dibatalkan. Anda dapat memulai pesanan baru dari panel Gift In Game.",
  );
}
