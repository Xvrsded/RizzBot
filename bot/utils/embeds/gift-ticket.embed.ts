import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  EmbedBuilder,
} from "discord.js";
import {
  GIFT_ADMIN_ROLE_ID,
  GIFT_OWNER_ROLE_ID,
  GIFT_TICKET_AUTO_CLOSE_MS,
} from "../../../shared/products";
import { buildCustomId } from "../../interactions/custom-id";
import {
  formatRobloxUsernameCopy,
  formatTicketActiveGamepass,
  formatTicketActiveRobuxValue,
  formatTicketActiveTotal,
  formatTicketGameDisplay,
  buildTicketPaymentMethodFields,
  formatTicketPaymentCustomer,
  formatTicketPaymentNotes,
} from "../formatters";
import { formatIdr } from "../pricing";
import { getTicketQrImageUrl } from "../ticket-qr";
import { createBaseEmbed, createErrorEmbed, createSuccessEmbed, createWarningEmbed, EMBED_COLORS } from "./base.embed";
import { GiftOrderSessionStatus } from "../../../database/models/gift-order-session.model";
import type { GiftOrderSessionDocument } from "../../../database/models/gift-order-session.model";

function applyAvatar(embed: EmbedBuilder, avatarUrl: string | null): EmbedBuilder {
  if (avatarUrl) {
    embed.setThumbnail(avatarUrl);
  }

  return embed;
}

export function buildGiftTicketMentionContent(customerId: string): string {
  return `<@&${GIFT_ADMIN_ROLE_ID}> <@&${GIFT_OWNER_ROLE_ID}> <@${customerId}>`;
}

function resolveTicketPaymentStatusLabel(status: GiftOrderSessionStatus): string {
  if (status === GiftOrderSessionStatus.PAID) {
    return "🟢 PAID";
  }

  return "🟡 PENDING PAYMENT";
}

export function buildActiveGiftTicketEmbed(session: GiftOrderSessionDocument): EmbedBuilder {
  const embed = createBaseEmbed("🎁 Pesanan Gift In Game", EMBED_COLORS.warning)
    .setDescription(
      [
        "Pesanan Anda telah berhasil dibuat.",
        "Silakan lakukan pembayaran sesuai total yang tertera di bawah.",
        "",
        "────────────────────────────",
        "",
        "**📦 Detail Pesanan**",
      ].join("\n"),
    )
    .addFields(
      {
        name: "👤 Customer",
        value: formatTicketPaymentCustomer(session.robloxUsername),
        inline: true,
      },
      {
        name: "🎮 Game / Map",
        value: formatTicketGameDisplay(session.gameName),
        inline: true,
      },
      {
        name: "🎁 Gamepass",
        value: formatTicketActiveGamepass(session.gamepassName),
        inline: true,
      },
      {
        name: "💎 Harga Gamepass",
        value: formatTicketActiveRobuxValue(session.robuxAmount),
        inline: true,
      },
      {
        name: "📦 Product",
        value: "Gift In Game",
        inline: true,
      },
      {
        name: "📌 Status",
        value: resolveTicketPaymentStatusLabel(session.status),
        inline: true,
      },
      {
        name: "💰 Total Pembayaran",
        value: formatTicketActiveTotal(session.finalPrice),
        inline: false,
      },
      {
        name: "💳 Pembayaran",
        value: "\u200b",
        inline: false,
      },
      ...buildTicketPaymentMethodFields(),
      {
        name: "📌 Catatan Pembayaran",
        value: formatTicketPaymentNotes(),
        inline: false,
      },
    )
    .setImage(getTicketQrImageUrl());

  return applyAvatar(embed, session.robloxAvatarUrl);
}

export function buildCompletedGiftTicketEmbed(session: GiftOrderSessionDocument): EmbedBuilder {
  const seconds = Math.round(GIFT_TICKET_AUTO_CLOSE_MS / 1000);

  const embed = createBaseEmbed("🎁 Pesanan Gift In Game", EMBED_COLORS.success)
    .setDescription(
      [
        "Pesanan telah berhasil diproses oleh Staff.",
        "",
        "**Status:**",
        "🟢 Success",
        "",
        `🔒 Ticket akan ditutup otomatis dalam ${seconds} detik.`,
      ].join("\n"),
    )
    .addFields(
      {
        name: "🆔 Order ID",
        value: session.orderCode,
        inline: true,
      },
      {
        name: "👤 Customer",
        value: formatTicketPaymentCustomer(session.robloxUsername),
        inline: true,
      },
      {
        name: "💰 Total Pembayaran",
        value: formatTicketActiveTotal(session.finalPrice),
        inline: false,
      },
    );

  return applyAvatar(embed, session.robloxAvatarUrl);
}

export function buildTicketActionRow(ticketId: string, delivered = false, allDisabled = false): ActionRowBuilder<ButtonBuilder> {
  return new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder()
      .setCustomId(buildCustomId("ticket", "deliver", ticketId))
      .setLabel(delivered ? "Transaction Completed" : "Mark Delivered")
      .setEmoji(delivered ? "✅" : "💳")
      .setStyle(ButtonStyle.Success)
      .setDisabled(delivered || allDisabled),
    new ButtonBuilder()
      .setCustomId(buildCustomId("ticket", "copy", ticketId))
      .setLabel("Copy Username")
      .setEmoji("📋")
      .setStyle(ButtonStyle.Secondary)
      .setDisabled(allDisabled),
    new ButtonBuilder()
      .setCustomId(buildCustomId("ticket", "close", ticketId))
      .setLabel("Close Ticket")
      .setEmoji("🔒")
      .setStyle(ButtonStyle.Danger)
      .setDisabled(allDisabled),
  );
}

export function buildTicketAccessDeniedEmbed(): EmbedBuilder {
  return createErrorEmbed(
    "⛔ AKSES DITOLAK",
    "Button ini hanya dapat digunakan oleh Admin atau Owner.",
  );
}

export function buildTicketAlreadyCompletedEmbed(): EmbedBuilder {
  return createWarningEmbed(
    "⚠️ TRANSAKSI SUDAH SELESAI",
    "Pesanan ini sudah ditandai sebagai completed.",
  );
}

export function buildCopyUsernameEmbed(username: string): EmbedBuilder {
  return createBaseEmbed("📋 ROBLOX USERNAME", EMBED_COLORS.info).setDescription(
    formatRobloxUsernameCopy(username),
  );
}

export function buildTicketClosedEmbed(staffMention: string): EmbedBuilder {
  return createBaseEmbed("🔒 TICKET DITUTUP", EMBED_COLORS.primary).setDescription(
    `Ticket ini telah ditutup oleh ${staffMention}.`,
  );
}

export function buildTicketDeliveredSuccessEmbed(orderCode: string): EmbedBuilder {
  return createSuccessEmbed(
    "✅ TRANSAKSI SELESAI",
    [`Pesanan **${orderCode}** telah ditandai sebagai completed.`, "Transaction log telah dikirim."].join("\n"),
  );
}

export function buildPaymentProofProcessingEmbed(orderCode: string): EmbedBuilder {
  return createBaseEmbed("⏳ MEMERIKSA PEMBAYARAN", EMBED_COLORS.warning)
    .setDescription("Bukti pembayaran sedang diproses...")
    .addFields(
      {
        name: "ORDER",
        value: `#${orderCode}`,
        inline: false,
      },
      {
        name: "STATUS",
        value: "🟡 VERIFYING PAYMENT",
        inline: false,
      },
    )
    .setFooter({ text: "RizzBlox • Payment Verification" });
}

export function buildPaymentProofFailedEmbed(): EmbedBuilder {
  return createErrorEmbed(
    "❌ PEMBAYARAN GAGAL DIPROSES",
    "Silakan hubungi staff.",
  ).setFooter({ text: "RizzBlox • Payment Verification" });
}

export function buildPaymentProofReceivedEmbed(
  session: GiftOrderSessionDocument,
  customerMention: string,
): EmbedBuilder {
  return createBaseEmbed("✅ PEMBAYARAN DITERIMA", EMBED_COLORS.success)
    .setDescription(
      [
        customerMention,
        "",
        "Bukti pembayaran telah diterima dan pesanan sedang diproses.",
        "",
        "Staff RizzBlox akan memproses pesanan Anda.",
      ].join("\n"),
    )
    .addFields(
      {
        name: "ORDER",
        value: `#${session.orderCode}`,
        inline: false,
      },
      {
        name: "STATUS",
        value: "🟢 PAID",
        inline: false,
      },
      {
        name: "TOTAL PEMBAYARAN",
        value: formatIdr(session.finalPrice),
        inline: false,
      },
    )
    .setFooter({ text: "RizzBlox • Payment Verification" });
}

export function buildPaymentProofAlreadyReceivedEmbed(
  session: GiftOrderSessionDocument,
  customerMention: string,
): EmbedBuilder {
  return createWarningEmbed(
    "ℹ️ Bukti Pembayaran Sudah Diterima",
    [
      `${customerMention}, bukti pembayaran untuk pesanan ini sudah pernah diterima.`,
      "",
      "**Nominal pesanan:**",
      formatTicketActiveTotal(session.finalPrice),
      "",
      "**Status pesanan:**",
      "🟢 Paid",
    ].join("\n"),
  ).setFooter({ text: "RizzBlox • Payment Verification" });
}

/** @deprecated Use buildActiveGiftTicketEmbed */
export function buildTicketWelcomeEmbed(session: GiftOrderSessionDocument): EmbedBuilder {
  return buildActiveGiftTicketEmbed(session);
}
