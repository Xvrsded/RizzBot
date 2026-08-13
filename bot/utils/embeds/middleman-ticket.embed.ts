import { ActionRowBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder } from "discord.js";
import { GIFT_ADMIN_ROLE_ID, GIFT_OWNER_ROLE_ID } from "../../../shared/products";
import { buildCustomId } from "../../interactions/custom-id";
import { formatIdr } from "../pricing";
import { createBaseEmbed, EMBED_COLORS } from "./base.embed";
import { MiddlemanOrderSessionStatus } from "../../../database/models/middleman-order-session.model";
import type { MiddlemanOrderSessionDocument } from "../../../database/models/middleman-order-session.model";
import { buildTicketPaymentMethodFields, formatTicketPaymentNotes } from "../formatters";

const MIDDLEMAN_TICKET_FOOTER = { text: "RizzBot • Middleman / Rekber" };

function resolveMiddlemanPaymentStatus(status: MiddlemanOrderSessionStatus): string {
  if (status === MiddlemanOrderSessionStatus.PAID) {
    return "🟢 PAID";
  }

  if (status === MiddlemanOrderSessionStatus.COMPLETED) {
    return "✅ COMPLETED";
  }

  return "🟡 MENUNGGU PROSES";
}

export function buildMiddlemanTicketMentionContent(customerId: string): string {
  return `<@&${GIFT_ADMIN_ROLE_ID}> <@&${GIFT_OWNER_ROLE_ID}> <@${customerId}>`;
}

export function buildMiddlemanTicketActionRow(ticketId: string, disabled = false): ActionRowBuilder<ButtonBuilder> {
  return new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder()
      .setCustomId(buildCustomId("ticket", "deliver", ticketId))
      .setLabel("Mark Delivered")
      .setEmoji("✅")
      .setStyle(ButtonStyle.Success)
      .setDisabled(disabled),
    new ButtonBuilder()
      .setCustomId(buildCustomId("ticket", "close", ticketId))
      .setLabel("Close Ticket")
      .setEmoji("🔒")
      .setStyle(ButtonStyle.Secondary)
      .setDisabled(disabled),
  );
}

export function buildActiveMiddlemanTicketEmbed(session: MiddlemanOrderSessionDocument): EmbedBuilder {
  const description = [
    `👤 **CUSTOMER**\n<@${session.userId}>`,
    "",
    `💰 **NOMINAL**\n${formatIdr(session.transactionAmountIdr)}`,
    "",
    `🧾 **FEE**\n${formatIdr(session.middlemanFeeIdr)}`,
    "",
    `💵 **TOTAL**\n${formatIdr(session.finalPrice)}`,
    "",
    `🟡 **STATUS**\n${resolveMiddlemanPaymentStatus(session.status)}`,
    "",
    "━━━━━━━━━━━━━━━━━━━━",
    "Staff akan membantu mengawasi transaksi melalui ticket ini."
  ].join("\n");

  return createBaseEmbed("🤝 MIDDLEMAN / REKBER", EMBED_COLORS.info)
    .setDescription(description)
    .addFields(
      { name: "👤 Pihak 1", value: session.party1Username, inline: true },
      { name: "👤 Pihak 2", value: session.party2Username, inline: true },
      { name: "📝 Detail Transaksi", value: session.transactionDetail, inline: false },
      ...buildTicketPaymentMethodFields(),
      { name: "📌 Catatan", value: formatTicketPaymentNotes(), inline: false }
    )
    .setFooter(MIDDLEMAN_TICKET_FOOTER);
}

export function buildCompletedMiddlemanTicketEmbed(session: MiddlemanOrderSessionDocument): EmbedBuilder {
  return createBaseEmbed("🤝 MIDDLEMAN / REKBER — SELESAI", EMBED_COLORS.success)
    .setDescription("Pesanan Middleman / Rekber telah selesai diproses.")
    .addFields(
      { name: "🆔 Order ID", value: `\`${session.orderCode}\``, inline: false },
      { name: "💰 Nominal Transaksi", value: formatIdr(session.transactionAmountIdr), inline: true },
      { name: "💳 Total Pembayaran", value: formatIdr(session.finalPrice), inline: true },
      { name: "👤 Pihak 1", value: session.party1Username, inline: true },
      { name: "👤 Pihak 2", value: session.party2Username, inline: true },
    )
    .setFooter(MIDDLEMAN_TICKET_FOOTER);
}

export function buildMiddlemanPaymentProofProcessingEmbed(orderCode: string): EmbedBuilder {
  return createBaseEmbed("⏳ MEMPROSES BUKTI PEMBAYARAN", EMBED_COLORS.warning)
    .setDescription(`Bukti pembayaran untuk order **#${orderCode}** sedang diproses.`)
    .setFooter(MIDDLEMAN_TICKET_FOOTER);
}

export function buildMiddlemanPaymentProofFailedEmbed(): EmbedBuilder {
  return createBaseEmbed("❌ PEMBAYARAN GAGAL DIPROSES", EMBED_COLORS.error)
    .setDescription("Bukti pembayaran tidak dapat diproses. Silakan hubungi Staff.")
    .setFooter(MIDDLEMAN_TICKET_FOOTER);
}

export function buildMiddlemanPaymentProofReceivedEmbed(
  session: MiddlemanOrderSessionDocument,
  customerMention: string,
): EmbedBuilder {
  return createBaseEmbed("✅ PEMBAYARAN DITERIMA", EMBED_COLORS.success)
    .setDescription(`${customerMention}, bukti pembayaran untuk order **#${session.orderCode}** telah diterima.`)
    .addFields({ name: "💳 Status", value: "🟢 PAID", inline: true })
    .setFooter(MIDDLEMAN_TICKET_FOOTER);
}
