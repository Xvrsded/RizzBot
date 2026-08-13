import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  EmbedBuilder,
} from "discord.js";
import { ProductType } from "../../../shared/products";
import { TicketPaymentStatus } from "../../../database/models/ticket.model";
import type { TicketDocument } from "../../../database/models/ticket.model";
import type { TicketOrderItemDocument } from "../../../database/models/ticket-order-item.model";
import type { TicketOrderTotals } from "../../services/ticket-order-item.service";
import { buildCustomId } from "../../interactions/custom-id";
import { formatIdr } from "../pricing";
import { formatRobloxUsernameCopy, formatTicketActiveRobuxValue, formatTicketActiveTotal } from "../formatters";
import { createBaseEmbed, EMBED_COLORS } from "./base.embed";
import { formatVouchProductLabel } from "./vouch.embed";

const BULK_FOOTER = { text: "RizzBlox • Ticket" };
const PRICE_UNSET = "```text\nBELUM DITENTUKAN\n```";

function formatPaymentStatusLabel(status: TicketPaymentStatus, remainingIdr: number): string {
  if (status === TicketPaymentStatus.PAID) {
    return "🟢 PAID";
  }

  if (status === TicketPaymentStatus.PARTIAL) {
    return `🟡 PARTIAL PAYMENT\nSisa: ${formatIdr(remainingIdr)}`;
  }

  return "🟡 PENDING PAYMENT";
}

function formatOrderItemField(item: TicketOrderItemDocument, index: number): string {
  const lines = [`**📦 ORDER #${index + 1}**`, `Order: \`${item.orderCode}\``];

  if (item.gamepassName) {
    lines.push(`Gamepass: ${item.gamepassName}`);
  }

  if (item.itemName) {
    lines.push(`Item: ${item.itemName}`);
  }

  lines.push(`Username: ${item.robloxUsername}`);

  if (item.robuxAmount !== null) {
    lines.push(`Robux: ${item.robuxAmount.toLocaleString("id-ID")} Robux`);
  }

  if (item.price !== null && item.price > 0) {
    lines.push(`Harga: ${formatIdr(item.price)}`);
  } else if (item.productType === ProductType.ITEM_LIMITED) {
    lines.push("Harga: BELUM DITENTUKAN");
  }

  return lines.join("\n");
}

export function buildActiveTicketWarningEmbed(
  ticket: TicketDocument,
  newProductType: ProductType,
): EmbedBuilder {
  const existingLabel = formatVouchProductLabel(ticket.productType);
  const newLabel = formatVouchProductLabel(newProductType);

  return createBaseEmbed("⚠️ TICKET AKTIF DITEMUKAN", EMBED_COLORS.warning)
    .setDescription(
      [
        "Kamu masih memiliki ticket aktif.",
        "",
        `Ticket: <#${ticket.channelId}>`,
        "",
        "Daripada membuat ticket baru, kamu dapat menambahkan pesanan baru ke ticket yang sedang aktif.",
        "",
        "Dengan menggunakan ticket yang sama:",
        "• Semua pesanan berada dalam satu tempat",
        "• Total pembayaran akan digabungkan",
        "• Total Robux akan diperbarui",
        "• Satu payment flow dapat digunakan",
        "• Satu transaction log akan mencatat total akhir",
        ticket.productType !== newProductType
          ? ["", `Ticket aktif: ${existingLabel}`, `Pesanan baru: ${newLabel}`].join("\n")
          : "",
      ]
        .filter(Boolean)
        .join("\n"),
    )
    .setFooter(BULK_FOOTER);
}

export function buildBulkChoiceRow(sessionId: string): ActionRowBuilder<ButtonBuilder> {
  return new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder()
      .setCustomId(buildCustomId("bulk", "add", sessionId))
      .setLabel("TAMBAHKAN KE TICKET")
      .setEmoji("➕")
      .setStyle(ButtonStyle.Success),
    new ButtonBuilder()
      .setCustomId(buildCustomId("bulk", "new", sessionId))
      .setLabel("BUAT TICKET BARU")
      .setEmoji("🆕")
      .setStyle(ButtonStyle.Secondary),
  );
}

export function buildBulkTicketEmbed(
  items: TicketOrderItemDocument[],
  totals: TicketOrderTotals,
): EmbedBuilder {
  const embed = createBaseEmbed("🛒 PESANAN", EMBED_COLORS.info)
    .addFields(
      {
        name: "📦 TOTAL PESANAN",
        value: String(totals.orderCount),
        inline: true,
      },
      ...(totals.totalRobux > 0
        ? [
            {
              name: "💎 TOTAL ROBUX",
              value: formatTicketActiveRobuxValue(totals.totalRobux),
              inline: true as const,
            },
          ]
        : []),
      {
        name: "💰 TOTAL PEMBAYARAN",
        value:
          totals.totalPaymentIdr > 0
            ? formatTicketActiveTotal(totals.totalPaymentIdr)
            : PRICE_UNSET,
        inline: false,
      },
      {
        name: "💳 PAYMENT STATUS",
        value: formatPaymentStatusLabel(totals.paymentStatus, totals.remainingIdr),
        inline: false,
      },
    )
    .setFooter(BULK_FOOTER);

  if (totals.productTypes.length > 1) {
    embed.addFields({
      name: "🛒 PRODUK",
      value: totals.productTypes.map((type: ProductType) => `• ${formatVouchProductLabel(type)}`).join("\n"),
      inline: false,
    });
  }

  const displayItems = items.slice(-4);
  const startIndex = Math.max(items.length - displayItems.length, 0);

  for (const [offset, item] of displayItems.entries()) {
    embed.addFields({
      name: `\u200b`,
      value: formatOrderItemField(item, startIndex + offset),
      inline: false,
    });
  }

  if (items.length > 4) {
    embed.addFields({
      name: "📋 Catatan",
      value: `Menampilkan 4 pesanan terakhir dari ${items.length} pesanan.`,
      inline: false,
    });
  }

  return embed;
}

export function buildOrderAddedEmbed(
  item: TicketOrderItemDocument,
  totals: TicketOrderTotals,
): EmbedBuilder {
  const lines = [
    "Pesanan baru berhasil ditambahkan ke ticket ini.",
    "",
    ...(item.gamepassName
      ? [`🎮 **GAMEPASS**`, item.gamepassName, ""]
      : item.itemName
        ? [`💎 **ITEM**`, item.itemName, ""]
        : []),
    "👤 **USERNAME**",
    item.robloxUsername,
  ];

  if (item.robuxAmount !== null) {
    lines.push("", "💎 **ROBUX**", `${item.robuxAmount.toLocaleString("id-ID")} Robux`);
  }

  lines.push(
    "",
    "💰 **HARGA**",
    item.price !== null && item.price > 0 ? formatIdr(item.price) : "BELUM DITENTUKAN",
    "",
    "━━━━━━━━━━━━━━━━━━",
    "",
    `📦 **TOTAL PESANAN**`,
    String(totals.orderCount),
  );

  if (totals.totalRobux > 0) {
    lines.push("", "💎 **TOTAL ROBUX**", `${totals.totalRobux.toLocaleString("id-ID")} Robux`);
  }

  lines.push(
    "",
    "💰 **TOTAL PEMBAYARAN**",
    totals.totalPaymentIdr > 0 ? formatIdr(totals.totalPaymentIdr) : "BELUM DITENTUKAN",
  );

  return createBaseEmbed("➕ PESANAN DITAMBAHKAN", EMBED_COLORS.success)
    .setDescription(lines.join("\n"))
    .setFooter(BULK_FOOTER);
}

export function buildBulkPaymentReceivedEmbed(
  totals: TicketOrderTotals,
  customerMention: string,
): EmbedBuilder {
  return createBaseEmbed("✅ PEMBAYARAN DITERIMA", EMBED_COLORS.success)
    .setDescription(
      [
        "Bukti pembayaran berhasil diterima.",
        "",
        `Terima kasih ${customerMention}.`,
        "",
        "💰 **Total Dibayar:**",
        formatIdr(totals.totalPaidIdr),
        "",
        "💰 **Total Diperlukan:**",
        formatIdr(totals.totalPaymentIdr),
        "",
        "Status:",
        formatPaymentStatusLabel(totals.paymentStatus, totals.remainingIdr),
        "",
        totals.paymentStatus === TicketPaymentStatus.PAID
          ? "Staff akan segera memproses pesanan Anda."
          : `Silakan kirim sisa pembayaran sebesar ${formatIdr(totals.remainingIdr)}.`,
      ].join("\n"),
    )
    .setFooter(BULK_FOOTER);
}

export function buildBulkAddSuccessEmbed(channelId: string, orderCode: string): EmbedBuilder {
  return createBaseEmbed("✅ PESANAN DITAMBAHKAN", EMBED_COLORS.success)
    .setDescription(
      [
        `Pesanan **#${orderCode}** berhasil ditambahkan ke ticket aktif.`,
        "",
        `Lanjutkan di ${`<#${channelId}>`}.`,
      ].join("\n"),
    )
    .setFooter(BULK_FOOTER);
}
