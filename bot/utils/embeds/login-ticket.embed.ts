import { ActionRowBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder } from "discord.js";
import {
  GIFT_ADMIN_ROLE_ID,
  GIFT_OWNER_ROLE_ID,
} from "../../../shared/products";
import { buildCustomId } from "../../interactions/custom-id";
import {
  formatRobloxUsernameCopy,
  formatTicketActiveRobuxValue,
  formatTicketActiveTotal,
  formatTicketPaymentNotes,
  buildTicketPaymentMethodFields,
} from "../formatters";
import { formatIdr } from "../pricing";
import { createBaseEmbed, EMBED_COLORS } from "./base.embed";
import { LoginOrderSessionStatus } from "../../../database/models/login-order-session.model";
import type { LoginOrderSessionDocument } from "../../../database/models/login-order-session.model";
import { buildTicketActionRow } from "./gift-ticket.embed";

const LOGIN_FOOTER = { text: "RizzBlox • Robux Via Login" };
const LOGIN_PRODUCT_LABEL = "```text\nROBUX VIA LOGIN\n```";

const LOGIN_TICKET_SECURITY_NOTE = [
  "🔐 **CATATAN KEAMANAN**",
  "",
  "Jangan mengirim password, cookie Roblox, security token, atau kode verifikasi melalui channel ini.",
  "",
  "Ikuti instruksi staff untuk proses autentikasi secara aman.",
].join("\n");

function applyAvatar(embed: EmbedBuilder, avatarUrl: string | null): EmbedBuilder {
  if (avatarUrl) {
    embed.setThumbnail(avatarUrl);
  }

  return embed;
}

function resolveLoginTicketPaymentStatus(status: LoginOrderSessionStatus): string {
  if (status === LoginOrderSessionStatus.PAID) {
    return "🟢 PAID";
  }

  if (status === LoginOrderSessionStatus.COMPLETED) {
    return "✅ COMPLETED";
  }

  return "🟡 PENDING PAYMENT";
}

export function buildLoginTicketMentionContent(customerId: string): string {
  return `<@&${GIFT_ADMIN_ROLE_ID}> <@&${GIFT_OWNER_ROLE_ID}> <@${customerId}>`;
}

export function buildActiveLoginTicketEmbed(session: LoginOrderSessionDocument): EmbedBuilder {
  const embed = createBaseEmbed("🔐 ROBUX VIA LOGIN", EMBED_COLORS.info)
    .addFields(
      {
        name: "👤 USERNAME",
        value: formatRobloxUsernameCopy(session.robloxUsername),
        inline: false,
      },
      {
        name: "💎 JUMLAH ROBUX",
        value: formatTicketActiveRobuxValue(session.robuxAmount),
        inline: false,
      },
      {
        name: "💰 TOTAL PEMBAYARAN",
        value: formatTicketActiveTotal(session.finalPrice),
        inline: false,
      },
      {
        name: "🏷️ PRODUK",
        value: LOGIN_PRODUCT_LABEL,
        inline: false,
      },
      {
        name: "💳 STATUS PEMBAYARAN",
        value: resolveLoginTicketPaymentStatus(session.status),
        inline: false,
      },
      ...buildTicketPaymentMethodFields(),
      {
        name: "📋 Catatan Pembayaran",
        value: formatTicketPaymentNotes(),
        inline: false,
      },
      {
        name: "\u200b",
        value: LOGIN_TICKET_SECURITY_NOTE,
        inline: false,
      },
    )
    .setFooter(LOGIN_FOOTER);

  return applyAvatar(embed, session.robloxAvatarUrl);
}

export function buildCompletedLoginTicketEmbed(session: LoginOrderSessionDocument): EmbedBuilder {
  return createBaseEmbed("🔐 ROBUX VIA LOGIN — SELESAI", EMBED_COLORS.success)
    .setDescription("Pesanan Robux Via Login telah selesai diproses.")
    .addFields(
      {
        name: "👤 ROBLOX USERNAME",
        value: formatRobloxUsernameCopy(session.robloxUsername),
        inline: true,
      },
      {
        name: "💎 JUMLAH ROBUX",
        value: `${session.robuxAmount.toLocaleString("id-ID")} Robux`,
        inline: true,
      },
      {
        name: "💰 TOTAL",
        value: formatIdr(session.finalPrice),
        inline: true,
      },
      { name: "📌 Status", value: "✅ COMPLETED", inline: false },
    )
    .setFooter(LOGIN_FOOTER);
}

export function buildLoginPaymentProofProcessingEmbed(orderCode: string): EmbedBuilder {
  return createBaseEmbed("⏳ MEMPROSES BUKTI PEMBAYARAN", EMBED_COLORS.info)
    .setDescription(`Pesanan **#${orderCode}** — bukti pembayaran sedang diproses.`)
    .setFooter(LOGIN_FOOTER);
}

export function buildLoginPaymentProofReceivedEmbed(
  session: LoginOrderSessionDocument,
  customerMention: string,
): EmbedBuilder {
  return createBaseEmbed("✅ PEMBAYARAN DITERIMA", EMBED_COLORS.success)
    .setDescription(
      [
        "Bukti pembayaran berhasil diterima.",
        "",
        `Terima kasih ${customerMention}.`,
        "",
        "💰 **Nominal:**",
        formatIdr(session.finalPrice),
        "",
        "Status:",
        "🟢 **PAID**",
        "",
        "Staff akan segera memproses pesanan Anda.",
      ].join("\n"),
    )
    .setFooter(LOGIN_FOOTER);
}

export function buildLoginPaymentProofFailedEmbed(): EmbedBuilder {
  return createBaseEmbed("❌ GAGAL MEMPROSES PEMBAYARAN", EMBED_COLORS.error)
    .setDescription("Gagal memperbarui status pembayaran. Silakan hubungi staff.")
    .setFooter(LOGIN_FOOTER);
}

export function buildLoginTicketActionRow(
  ticketId: string,
  delivered = false,
  allDisabled = false,
): ActionRowBuilder<ButtonBuilder> {
  return new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder()
      .setCustomId(buildCustomId("ticket", "deliver", ticketId))
      .setLabel(delivered ? "TRANSACTION COMPLETED" : "MARK DELIVERED")
      .setEmoji(delivered ? "✅" : "🚚")
      .setStyle(ButtonStyle.Success)
      .setDisabled(delivered || allDisabled),
    new ButtonBuilder()
      .setCustomId(buildCustomId("ticket", "copy", ticketId))
      .setLabel("COPY USERNAME")
      .setEmoji("📋")
      .setStyle(ButtonStyle.Secondary)
      .setDisabled(allDisabled),
    new ButtonBuilder()
      .setCustomId(buildCustomId("ticket", "close", ticketId))
      .setLabel("CLOSE TICKET")
      .setEmoji("🔒")
      .setStyle(ButtonStyle.Danger)
      .setDisabled(allDisabled),
  );
}

export { buildTicketActionRow };
