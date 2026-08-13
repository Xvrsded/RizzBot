import { ActionRowBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder } from "discord.js";
import {
  GIFT_ADMIN_ROLE_ID,
  GIFT_OWNER_ROLE_ID,
} from "../../../shared/products";
import { buildCustomId } from "../../interactions/custom-id";
import {
  formatRobloxUsernameCopy,
  formatTicketActiveTotal,
  formatTicketPaymentNotes,
  buildTicketPaymentMethodFields,
} from "../formatters";
import { formatIdr } from "../pricing";
import { createBaseEmbed, createErrorEmbed, EMBED_COLORS } from "./base.embed";
import {
  LimitedOrderSessionStatus,
  LimitedPriceStatus,
  type LimitedOrderSessionDocument,
} from "../../../database/models/limited-order-session.model";

const LIMITED_FOOTER = { text: "RizzBlox • Item Limited" };
const LIMITED_PRODUCT_LABEL = "```text\nITEM LIMITED\n```";
const LIMITED_PRICE_UNSET = "```text\nBELUM DITENTUKAN\n```";

const LIMITED_PRICE_DISCUSSION_NOTE = [
  "💬 **PEMBAHASAN HARGA**",
  "",
  "Harga Item Limited tidak memiliki pricelist tetap.",
  "",
  "Silakan diskusikan nominal transaksi dengan staff di ticket ini.",
  "",
  "Setelah nominal disepakati, staff akan menetapkan harga final sebelum pesanan diselesaikan.",
].join("\n");

function applyAvatar(embed: EmbedBuilder, avatarUrl: string | null): EmbedBuilder {
  if (avatarUrl) {
    embed.setThumbnail(avatarUrl);
  }

  return embed;
}

function formatLimitedItemCopy(itemName: string): string {
  return `\`\`\`text\n${itemName.trim()}\n\`\`\``;
}

function resolveLimitedTicketPaymentStatus(session: LimitedOrderSessionDocument): string {
  if (session.status === LimitedOrderSessionStatus.PAID) {
    return "🟢 PAID";
  }

  if (session.status === LimitedOrderSessionStatus.COMPLETED) {
    return "✅ COMPLETED";
  }

  if (session.priceStatus === LimitedPriceStatus.UNSET) {
    return "🟡 MENUNGGU KESEPAKATAN HARGA";
  }

  return "🟡 PENDING PAYMENT";
}

function resolveLimitedPriceDisplay(session: LimitedOrderSessionDocument): string {
  if (session.priceStatus === LimitedPriceStatus.FINAL && session.price !== null && session.price > 0) {
    return formatTicketActiveTotal(session.price);
  }

  return LIMITED_PRICE_UNSET;
}

export function buildLimitedTicketMentionContent(customerId: string): string {
  return `<@&${GIFT_ADMIN_ROLE_ID}> <@&${GIFT_OWNER_ROLE_ID}> <@${customerId}>`;
}

export function buildActiveLimitedTicketEmbed(session: LimitedOrderSessionDocument): EmbedBuilder {
  const embed = createBaseEmbed("💎 ITEM LIMITED", EMBED_COLORS.info)
    .addFields(
      {
        name: "👤 ROBLOX USERNAME",
        value: formatRobloxUsernameCopy(session.robloxUsername),
        inline: false,
      },
      {
        name: "💎 ITEM",
        value: formatLimitedItemCopy(session.itemName),
        inline: false,
      },
      {
        name: "🏷️ PRODUK",
        value: LIMITED_PRODUCT_LABEL,
        inline: false,
      },
      {
        name: "💰 HARGA",
        value: resolveLimitedPriceDisplay(session),
        inline: false,
      },
      {
        name: "💳 STATUS PEMBAYARAN",
        value: resolveLimitedTicketPaymentStatus(session),
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
        value: LIMITED_PRICE_DISCUSSION_NOTE,
        inline: false,
      },
    )
    .setFooter(LIMITED_FOOTER);

  return applyAvatar(embed, session.robloxAvatarUrl);
}

export function buildCompletedLimitedTicketEmbed(session: LimitedOrderSessionDocument): EmbedBuilder {
  const finalPrice = session.price ?? 0;

  return createBaseEmbed("💎 ITEM LIMITED", EMBED_COLORS.success)
    .setDescription("**📦 DETAIL PESANAN**")
    .addFields(
      {
        name: "💎 ITEM",
        value: formatLimitedItemCopy(session.itemName),
        inline: false,
      },
      {
        name: "👤 ROBLOX USERNAME",
        value: formatRobloxUsernameCopy(session.robloxUsername),
        inline: false,
      },
      {
        name: "💰 TOTAL PEMBAYARAN",
        value: formatTicketActiveTotal(finalPrice),
        inline: false,
      },
      {
        name: "💳 STATUS PEMBAYARAN",
        value: "🟢 PAID",
        inline: false,
      },
      {
        name: "📦 STATUS ORDER",
        value: "✅ COMPLETED",
        inline: false,
      },
    )
    .setFooter(LIMITED_FOOTER);
}

export function buildLimitedPaymentProofProcessingEmbed(orderCode: string): EmbedBuilder {
  return createBaseEmbed("⏳ MEMPROSES BUKTI PEMBAYARAN", EMBED_COLORS.info)
    .setDescription(`Pesanan **#${orderCode}** — bukti pembayaran sedang diproses.`)
    .setFooter(LIMITED_FOOTER);
}

export function buildLimitedPaymentProofReceivedEmbed(
  session: LimitedOrderSessionDocument,
  customerMention: string,
): EmbedBuilder {
  const nominalLine =
    session.priceStatus === LimitedPriceStatus.FINAL && session.price !== null && session.price > 0
      ? formatIdr(session.price)
      : "Belum ditetapkan — nominal akan ditetapkan staff saat penyelesaian pesanan.";

  return createBaseEmbed("✅ PEMBAYARAN DITERIMA", EMBED_COLORS.success)
    .setDescription(
      [
        "Bukti pembayaran berhasil diterima.",
        "",
        `Terima kasih ${customerMention}.`,
        "",
        "💰 **Nominal:**",
        nominalLine,
        "",
        "Status:",
        "🟢 **PAID**",
        "",
        "Staff akan segera memproses pesanan Anda.",
      ].join("\n"),
    )
    .setFooter(LIMITED_FOOTER);
}

export function buildLimitedPaymentProofFailedEmbed(): EmbedBuilder {
  return createBaseEmbed("❌ GAGAL MEMPROSES PEMBAYARAN", EMBED_COLORS.error)
    .setDescription("Gagal memperbarui status pembayaran. Silakan hubungi staff.")
    .setFooter(LIMITED_FOOTER);
}

export function buildLimitedPaymentNotPaidEmbed(): EmbedBuilder {
  return createErrorEmbed(
    "⚠️ PEMBAYARAN BELUM DITERIMA",
    [
      "Pesanan belum dapat ditandai sebagai selesai karena status pembayaran masih belum PAID.",
      "",
      "Pastikan customer telah mengirim bukti pembayaran dan status sudah PAID sebelum menyelesaikan pesanan.",
    ].join("\n"),
  ).setFooter(LIMITED_FOOTER);
}

export function buildLimitedInvalidPriceEmbed(): EmbedBuilder {
  return createErrorEmbed(
    "❌ NOMINAL TIDAK VALID",
    [
      "Nominal transaksi harus lebih dari Rp0.",
      "",
      "Masukkan nominal sesuai hasil kesepakatan dengan customer.",
    ].join("\n"),
  ).setFooter(LIMITED_FOOTER);
}

export function buildLimitedTicketActionRow(
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
