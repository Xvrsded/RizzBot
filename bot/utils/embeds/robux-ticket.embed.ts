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
  buildTicketPaymentMethodFields,
  formatRobloxUsernameCopy,
  formatTicketActiveRobuxValue,
  formatTicketActiveTotal,
  formatTicketPaymentCustomer,
  formatTicketPaymentNotes,
} from "../formatters";
import { formatIdr } from "../pricing";
import { getTicketQrImageUrl } from "../ticket-qr";
import { createBaseEmbed, EMBED_COLORS } from "./base.embed";
import { RobuxOrderSessionStatus } from "../../../database/models/robux-order-session.model";
import type { RobuxOrderSessionDocument } from "../../../database/models/robux-order-session.model";
import { buildTicketActionRow } from "./gift-ticket.embed";

const ROBUX_FOOTER = { text: "RizzBlox • Robux Via Username" };

function applyAvatar(embed: EmbedBuilder, avatarUrl: string | null): EmbedBuilder {
  if (avatarUrl) {
    embed.setThumbnail(avatarUrl);
  }

  return embed;
}

function resolveRobuxTicketStatusLabel(status: RobuxOrderSessionStatus): string {
  if (status === RobuxOrderSessionStatus.PAID) {
    return "🟢 PAID";
  }

  if (status === RobuxOrderSessionStatus.COMPLETED) {
    return "✅ COMPLETED";
  }

  return "🟡 PENDING PAYMENT";
}

export function buildRobuxTicketMentionContent(customerId: string): string {
  return `<@&${GIFT_ADMIN_ROLE_ID}> <@&${GIFT_OWNER_ROLE_ID}> <@${customerId}>`;
}

export function buildActiveRobuxTicketEmbed(session: RobuxOrderSessionDocument): EmbedBuilder {
  const embed = createBaseEmbed("💎 ROBUX VIA USERNAME", EMBED_COLORS.info)
    .setDescription(
      [
        "Pesanan Robux Via Username Anda telah berhasil dibuat.",
        "Silakan lakukan pembayaran sesuai total yang tertera di bawah.",
        "",
        "────────────────────────────",
        "",
        "**📦 Detail Pesanan**",
      ].join("\n"),
    )
    .addFields(
      {
        name: "👤 USERNAME ROBLOX",
        value: formatTicketPaymentCustomer(session.robloxUsername),
        inline: true,
      },
      {
        name: "Display Name",
        value: session.robloxDisplayName,
        inline: true,
      },
      {
        name: "💎 JUMLAH ROBUX",
        value: formatTicketActiveRobuxValue(session.robuxAmount),
        inline: true,
      },
      {
        name: "📦 Product",
        value: "Robux Via Username",
        inline: true,
      },
      {
        name: "📌 Status",
        value: resolveRobuxTicketStatusLabel(session.status),
        inline: true,
      },
      {
        name: "🆔 Order ID",
        value: session.orderCode,
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
    .setImage(getTicketQrImageUrl())
    .setFooter(ROBUX_FOOTER);

  return applyAvatar(embed, session.robloxAvatarUrl);
}

export function buildCompletedRobuxTicketEmbed(session: RobuxOrderSessionDocument): EmbedBuilder {
  const seconds = Math.round(GIFT_TICKET_AUTO_CLOSE_MS / 1000);

  const embed = createBaseEmbed("💎 ROBUX VIA USERNAME", EMBED_COLORS.success)
    .setDescription(
      [
        "Pesanan telah berhasil diproses oleh Staff.",
        "",
        "**Status:**",
        "✅ COMPLETED",
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
        name: "👤 Username Roblox",
        value: formatTicketPaymentCustomer(session.robloxUsername),
        inline: true,
      },
      {
        name: "💎 Jumlah Robux",
        value: formatTicketActiveRobuxValue(session.robuxAmount),
        inline: true,
      },
      {
        name: "💰 Total Pembayaran",
        value: formatTicketActiveTotal(session.finalPrice),
        inline: false,
      },
    )
    .setFooter(ROBUX_FOOTER);

  return applyAvatar(embed, session.robloxAvatarUrl);
}

export function buildRobuxPaymentProofProcessingEmbed(orderCode: string): EmbedBuilder {
  return createBaseEmbed("⏳ MEMERIKSA PEMBAYARAN", EMBED_COLORS.warning)
    .setDescription("Bukti pembayaran sedang diproses...")
    .addFields(
      { name: "ORDER", value: `#${orderCode}`, inline: false },
      { name: "STATUS", value: "🟡 VERIFYING PAYMENT", inline: false },
    )
    .setFooter(ROBUX_FOOTER);
}

export function buildRobuxPaymentProofFailedEmbed(): EmbedBuilder {
  return createBaseEmbed("❌ PEMBAYARAN GAGAL DIPROSES", EMBED_COLORS.error)
    .setDescription("Silakan hubungi staff.")
    .setFooter(ROBUX_FOOTER);
}

export function buildRobuxPaymentProofReceivedEmbed(
  session: RobuxOrderSessionDocument,
  customerMention: string,
): EmbedBuilder {
  return createBaseEmbed("✅ PEMBAYARAN DITERIMA", EMBED_COLORS.success)
    .setDescription(
      [
        customerMention,
        "",
        "Bukti pembayaran telah diterima.",
        "",
        "Staff RizzBlox akan memproses pesanan Anda.",
      ].join("\n"),
    )
    .addFields(
      { name: "ORDER", value: `#${session.orderCode}`, inline: false },
      { name: "USERNAME", value: formatRobloxUsernameCopy(session.robloxUsername), inline: false },
      { name: "ROBUX", value: `${session.robuxAmount.toLocaleString("id-ID")} ⏣`, inline: true },
      { name: "TOTAL", value: formatIdr(session.finalPrice), inline: true },
      { name: "STATUS", value: "🟢 PAID", inline: false },
    )
    .setFooter(ROBUX_FOOTER);
}

export { buildTicketActionRow, buildCopyUsernameEmbed } from "./gift-ticket.embed";
