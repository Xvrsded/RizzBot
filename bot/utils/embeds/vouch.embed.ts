import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  EmbedBuilder,
  type User,
} from "discord.js";
import { ProductType } from "../../../shared/products";
import { buildCustomId } from "../../interactions/custom-id";
import { formatIdr } from "../pricing";
import { createBaseEmbed, createErrorEmbed, createSuccessEmbed, EMBED_COLORS } from "./base.embed";
import type { VouchSessionDocument } from "../../../database/models/vouch-session.model";

export interface BulkVouchSummary {
  orderCount: number;
  totalRobux: number;
  totalPaymentIdr: number;
  productTypes: ProductType[];
  orderCodes: string[];
}

const VOUCH_FOOTER = { text: "RizzBlox • Customer Vouch" };
const PANEL_DIVIDER = "━━━━━━━━━━━━━━━━━━━━";

export function formatStarRating(rating: number): string {
  const safeRating = Math.max(1, Math.min(5, Math.round(rating)));
  return `${"★".repeat(safeRating)}${"☆".repeat(5 - safeRating)}`;
}

export function formatVouchProductLabel(productType: ProductType): string {
  switch (productType) {
    case ProductType.GIFT_IN_GAME:
      return "🎁 GIFT IN GAME";
    case ProductType.ROBUX_USERNAME:
      return "💸 ROBUX VIA SEND";
    case ProductType.ROBUX_LOGIN:
      return "🔐 ROBUX VIA LOGIN";
    case ProductType.ITEM_LIMITED:
      return "💎 ITEM LIMITED";
    case ProductType.MIDDLEMAN:
      return "🤝 MIDDLEMAN / REKBER";
    case ProductType.COMMUNITY_PAYOUT:
      return "💸 ROBUX COMMUNITY PAYOUT";
    default:
      return productType;
  }
}

export function formatVouchPublicDate(date: Date): string {
  return new Intl.DateTimeFormat("en-GB", {
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "Asia/Jakarta",
  }).format(date);
}

export function buildVouchRequestEmbed(): EmbedBuilder {
  return createBaseEmbed("⭐ TRANSAKSI SELESAI", EMBED_COLORS.success)
    .setDescription(
      [
        "Terima kasih telah melakukan transaksi bersama RizzBlox!",
        "",
        "Pesanan kamu telah berhasil diselesaikan.",
        "",
        "Kami sangat menghargai feedback dari kamu.",
        "",
        "Berikan rating dan ulasan untuk membantu kami meningkatkan kualitas pelayanan.",
      ].join("\n"),
    )
    .setFooter(VOUCH_FOOTER);
}

export function buildVouchOpenRow(voucherId: string, disabled = false): ActionRowBuilder<ButtonBuilder> {
  return new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder()
      .setCustomId(buildCustomId("vouch", "open", voucherId))
      .setLabel("BERIKAN VOUCH")
      .setEmoji("⭐")
      .setStyle(ButtonStyle.Primary)
      .setDisabled(disabled),
  );
}

export function buildVouchDmEmbed(orderCode: string): EmbedBuilder {
  return createBaseEmbed("⭐ TERIMA KASIH ATAS TRANSAKSINYA!", EMBED_COLORS.success)
    .setDescription(
      [
        "Pesanan kamu dengan:",
        "",
        "**Order ID:**",
        orderCode,
        "",
        "telah berhasil diselesaikan.",
        "",
        "Kami ingin mendengar pengalaman kamu!",
        "",
        "Silakan berikan rating dan ulasan mengenai pelayanan RizzBlox.",
      ].join("\n"),
    )
    .setFooter(VOUCH_FOOTER);
}

export function buildVouchInvalidRatingEmbed(): EmbedBuilder {
  return createErrorEmbed(
    "❌ RATING TIDAK VALID",
    "Rating harus berupa angka 1 sampai 5.",
  ).setFooter(VOUCH_FOOTER);
}

export function buildVouchEmptyReviewEmbed(): EmbedBuilder {
  return createErrorEmbed(
    "❌ ULASAN TIDAK VALID",
    "Ulasan / feedback wajib diisi.",
  ).setFooter(VOUCH_FOOTER);
}

export function buildVouchUnauthorizedEmbed(): EmbedBuilder {
  return createErrorEmbed(
    "❌ VOUCH TIDAK VALID",
    "Vouch ini bukan milik kamu.",
  ).setFooter(VOUCH_FOOTER);
}

export function buildVouchAlreadySubmittedEmbed(): EmbedBuilder {
  return createBaseEmbed("⭐ VOUCH SUDAH DIBERIKAN", EMBED_COLORS.info)
    .setDescription(
      [
        "Kamu sudah memberikan rating untuk transaksi ini.",
        "",
        "Terima kasih atas feedback-nya!",
      ].join("\n"),
    )
    .setFooter(VOUCH_FOOTER);
}

export function buildVouchNotFoundEmbed(): EmbedBuilder {
  return createErrorEmbed(
    "❌ VOUCH TIDAK DITEMUKAN",
    "Sesi vouch tidak ditemukan atau sudah tidak valid.",
  ).setFooter(VOUCH_FOOTER);
}

export function buildVouchSuccessEmbed(rating: number): EmbedBuilder {
  return createSuccessEmbed(
    "⭐ TERIMA KASIH!",
    [
      "Vouch kamu berhasil dikirim.",
      "",
      "**Rating:**",
      formatStarRating(rating),
      "",
      "Terima kasih sudah mempercayai RizzBlox untuk transaksi kamu!",
    ].join("\n"),
  ).setFooter(VOUCH_FOOTER);
}

export function buildPublicVouchEmbed(
  session: VouchSessionDocument,
  customer: User,
  submittedAt: Date,
  bulkSummary?: BulkVouchSummary,
): EmbedBuilder {
  const review = session.review?.trim() ?? "";
  const rating = session.rating ?? 0;

  const transactionValue = bulkSummary
    ? bulkSummary.productTypes.length > 1
      ? bulkSummary.productTypes.map((type) => formatVouchProductLabel(type)).join("\n")
      : formatVouchProductLabel(session.productType)
    : formatVouchProductLabel(session.productType);

  const orderValue = bulkSummary
    ? bulkSummary.orderCodes.map((code) => `\`${code}\``).join(", ")
    : session.orderCode;

  const embed = createBaseEmbed("⭐ CUSTOMER VOUCH", EMBED_COLORS.success)
    .setDescription(
      [
        formatStarRating(rating),
        "",
        `"${review}"`,
      ].join("\n"),
    )
    .addFields(
      {
        name: "👤 CUSTOMER",
        value: `<@${customer.id}>`,
        inline: true,
      },
      {
        name: "🛒 TRANSAKSI",
        value: transactionValue,
        inline: true,
      },
      {
        name: bulkSummary ? "🆔 ORDERS" : "🆔 ORDER",
        value: orderValue,
        inline: true,
      },
    );

  if (bulkSummary) {
    embed.addFields({
      name: "📦 TOTAL ORDERS",
      value: String(bulkSummary.orderCount),
      inline: true,
    });

    if (bulkSummary.totalRobux > 0) {
      embed.addFields({
        name: "💎 TOTAL ROBUX",
        value: `${bulkSummary.totalRobux.toLocaleString("id-ID")} ROBUX`,
        inline: true,
      });
    }

    if (bulkSummary.totalPaymentIdr > 0) {
      embed.addFields({
        name: "💰 TOTAL PAYMENT",
        value: formatIdr(bulkSummary.totalPaymentIdr),
        inline: true,
      });
    }
  }

  embed.addFields(
    {
      name: "📅 DATE",
      value: formatVouchPublicDate(submittedAt),
      inline: false,
    },
    {
      name: PANEL_DIVIDER,
      value: "Terima kasih telah mempercayai RizzBlox!",
      inline: false,
    },
  )
    .setThumbnail(customer.displayAvatarURL({ size: 256 }))
    .setFooter(VOUCH_FOOTER);

  return embed;
}
