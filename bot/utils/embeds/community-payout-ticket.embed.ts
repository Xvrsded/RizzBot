import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  EmbedBuilder,
} from "discord.js";
import { GIFT_ADMIN_ROLE_ID, GIFT_OWNER_ROLE_ID } from "../../../shared/products";
import { buildCustomId } from "../../interactions/custom-id";
import { formatIdr } from "../pricing";
import { createBaseEmbed, EMBED_COLORS } from "./base.embed";
import { CommunityPayoutOrderSessionStatus } from "../../../database/models/community-payout-order-session.model";
import type { CommunityPayoutOrderSessionDocument } from "../../../database/models/community-payout-order-session.model";
import {
  buildTicketPaymentMethodFields,
  formatRobloxUsernameCopy,
  formatTicketActiveRobuxValue,
  formatTicketActiveTotal,
  formatTicketPaymentCustomer,
  formatTicketPaymentNotes,
} from "../formatters";
import { getTicketQrImageUrl } from "../ticket-qr";

const FOOTER = { text: "RizzStore • Robux Community Payout" };

function resolvePaymentStatus(status: CommunityPayoutOrderSessionStatus): string {
  if (status === CommunityPayoutOrderSessionStatus.PAID) {
    return "🟢 PAID";
  }

  if (status === CommunityPayoutOrderSessionStatus.COMPLETED) {
    return "🟢 SUCCESS";
  }

  return "🟡 PENDING PAYMENT";
}

function applyAvatar(embed: EmbedBuilder, avatarUrl: string | null): EmbedBuilder {
  if (avatarUrl) {
    embed.setThumbnail(avatarUrl);
  }

  return embed;
}

export function buildCommunityPayoutTicketMentionContent(customerId: string): string {
  return `<@&${GIFT_ADMIN_ROLE_ID}> <@&${GIFT_OWNER_ROLE_ID}> <@${customerId}>`;
}

export function buildCommunityPayoutTicketActionRow(
  ticketId: string,
  delivered = false,
  allDisabled = false,
): ActionRowBuilder<ButtonBuilder> {
  return new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder()
      .setCustomId(buildCustomId("ticket", "deliver", ticketId))
      .setLabel(delivered ? "Transaction Completed" : "Mark Delivered")
      .setEmoji("🚚")
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

export function buildActiveCommunityPayoutTicketEmbed(
  session: CommunityPayoutOrderSessionDocument,
): EmbedBuilder {
  const embed = createBaseEmbed("💸 ROBUX COMMUNITY PAYOUT", EMBED_COLORS.info)
    .addFields(
      { name: "📌 Status", value: resolvePaymentStatus(session.status), inline: false },
      { name: "👤 Username Roblox", value: formatTicketPaymentCustomer(session.robloxUsername), inline: true },
      { name: "💎 Jumlah Robux", value: formatTicketActiveRobuxValue(session.robuxAmount), inline: true },
      { name: "💰 Total Pembayaran", value: formatTicketActiveTotal(session.finalPrice), inline: false },
      { name: "📌 Jenis", value: "Robux Community Payout", inline: true },
      { name: "🆔 Order ID", value: session.orderCode, inline: true },
      { name: "💳 Pembayaran", value: "\u200b", inline: false },
      ...buildTicketPaymentMethodFields(),
      { name: "📌 Catatan", value: formatTicketPaymentNotes(), inline: false },
    )
    .setImage(getTicketQrImageUrl())
    .setFooter(FOOTER);

  return applyAvatar(embed, session.robloxAvatarUrl);
}

export function buildCompletedCommunityPayoutTicketEmbed(
  session: CommunityPayoutOrderSessionDocument,
): EmbedBuilder {
  const embed = createBaseEmbed("💸 ROBUX COMMUNITY PAYOUT — SELESAI", EMBED_COLORS.success)
    .setDescription("Pesanan Community Payout telah selesai diproses.")
    .addFields(
      { name: "👤 Username Roblox", value: formatRobloxUsernameCopy(session.robloxUsername), inline: true },
      { name: "💎 Jumlah Robux", value: formatTicketActiveRobuxValue(session.robuxAmount), inline: true },
      { name: "💰 Total Pembayaran", value: formatIdr(session.finalPrice), inline: false },
      { name: "🆔 Order ID", value: session.orderCode, inline: true },
      { name: "📌 Status", value: "🟢 SUCCESS", inline: true },
    )
    .setFooter(FOOTER);

  return applyAvatar(embed, session.robloxAvatarUrl);
}

export function buildCommunityPayoutPaymentProofProcessingEmbed(orderCode: string): EmbedBuilder {
  return createBaseEmbed("⏳ MEMPROSES BUKTI PEMBAYARAN", EMBED_COLORS.warning)
    .setDescription(`Bukti pembayaran untuk order **#${orderCode}** sedang diproses.`)
    .setFooter(FOOTER);
}

export function buildCommunityPayoutPaymentProofFailedEmbed(): EmbedBuilder {
  return createBaseEmbed("❌ PEMBAYARAN GAGAL DIPROSES", EMBED_COLORS.error)
    .setDescription("Bukti pembayaran tidak dapat diproses. Silakan hubungi Staff.")
    .setFooter(FOOTER);
}

export function buildCommunityPayoutPaymentProofReceivedEmbed(
  session: CommunityPayoutOrderSessionDocument,
  customerMention: string,
): EmbedBuilder {
  return createBaseEmbed("✅ BUKTI PEMBAYARAN DITERIMA", EMBED_COLORS.success)
    .setDescription(`${customerMention}, bukti pembayaran untuk order **#${session.orderCode}** telah diterima.`)
    .addFields(
      { name: "Nominal yang kami terima", value: formatIdr(session.finalPrice), inline: false },
      { name: "Status pesanan", value: "🟢 Paid", inline: true },
    )
    .setFooter(FOOTER);
}

export function buildCommunityPayoutPaymentNotPaidEmbed(): EmbedBuilder {
  return createBaseEmbed("💳 PEMBAYARAN BELUM DITERIMA", EMBED_COLORS.warning)
    .setDescription(
      "Pesanan belum dapat diselesaikan karena status pembayaran masih belum PAID.",
    )
    .setFooter(FOOTER);
}
