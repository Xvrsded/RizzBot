import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  EmbedBuilder,
  StringSelectMenuBuilder,
  StringSelectMenuOptionBuilder,
} from "discord.js";
import { buildCustomId } from "../../interactions/custom-id";
import { formatIdr } from "../pricing";
import { calculateMiddlemanFee, MIDDLEMAN_TIERS, type MiddlemanFeeResult } from "../../../shared/middleman";
import type { MiddlemanOrderSessionDocument } from "../../../database/models/middleman-order-session.model";
import {
  createBaseEmbed,
  createErrorEmbed,
  createSuccessEmbed,
  createWarningEmbed,
  EMBED_COLORS,
} from "./base.embed";

const MIDDLEMAN_FOOTER = { text: "RizzBot • Middleman / Rekber" };

export function buildMiddlemanClosedEmbed(): EmbedBuilder {
  return createBaseEmbed("🔴 MIDDLEMAN SEDANG TUTUP", EMBED_COLORS.error)
    .setDescription(
      [
        "Layanan Middleman / Rekber sedang tidak tersedia untuk sementara.",
        "",
        "Silakan coba kembali nanti.",
      ].join("\n"),
    )
    .setFooter(MIDDLEMAN_FOOTER);
}

export function buildServiceUnavailableEmbed(): EmbedBuilder {
  return createWarningEmbed(
    "⚠️ LAYANAN SEMENTARA TIDAK TERSEDIA",
    "Sistem konfigurasi layanan sedang tidak dapat diakses. Silakan coba kembali beberapa saat lagi.",
  ).setFooter(MIDDLEMAN_FOOTER);
}

export function createMiddlemanErrorEmbed(title: string, description: string): EmbedBuilder {
  return createErrorEmbed(title, description).setFooter(MIDDLEMAN_FOOTER);
}

export function buildMiddlemanPanelEmbed(serviceOpen: boolean): EmbedBuilder {
  const description = [
    "RizzStore menyediakan layanan Middleman untuk membantu transaksi antar pihak dengan pengawasan Staff.",
    "",
    "━━━━━━━━━━━━━━━━━━━━",
    "",
    "💰 **FEE TRANSAKSI**",
    "Pilih nominal transaksi pada menu di bawah untuk melihat fee Middleman.",
    "",
    "━━━━━━━━━━━━━━━━━━━━",
    "",
    "🛡️ **KEAMANAN**",
    "• Transaksi diproses melalui Ticket.",
    "• Staff membantu mengawasi proses transaksi.",
    "• Jangan melakukan pembayaran sebelum ticket dibuat.",
    "• Semua detail transaksi dibahas di dalam ticket.",
    "",
    "━━━━━━━━━━━━━━━━━━━━",
    "",
    serviceOpen ? "🟢 **LAYANAN: TERBUKA**" : "🔴 **LAYANAN: TUTUP**",
  ].join("\n");

  return createBaseEmbed("🤝 MIDDLEMAN / REKBER", EMBED_COLORS.info)
    .setDescription(description)
    .setFooter(MIDDLEMAN_FOOTER);
}

export function buildMiddlemanFeeDropdownRow(): ActionRowBuilder<StringSelectMenuBuilder> {
  const menu = new StringSelectMenuBuilder()
    .setCustomId(buildCustomId("middleman", "select-tier"))
    .setPlaceholder("💰 Pilih Nominal Transaksi")
    .addOptions(
      MIDDLEMAN_TIERS.map((tier) => {
        const feeResult = calculateMiddlemanFee(tier.value);
        return new StringSelectMenuOptionBuilder()
          .setLabel(tier.label)
          .setDescription(`Fee Middleman: ${formatIdr(feeResult.fee)}`)
          .setValue(tier.value.toString());
      }),
    );

  return new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(menu);
}

export function buildMiddlemanOrderPromptEmbed(feeInfo: MiddlemanFeeResult, tierLabel: string): EmbedBuilder {
  const description = [
    "💰 **NOMINAL TRANSAKSI**",
    tierLabel,
    "",
    "🧾 **FEE MIDDLEMAN**",
    formatIdr(feeInfo.fee),
    "",
    "💵 **TOTAL**",
    formatIdr(feeInfo.total),
    "",
    "🟢 **LAYANAN TERBUKA**",
    "",
    "Silakan lanjutkan jika nominal transaksi sudah sesuai."
  ].join("\n");

  return createBaseEmbed("🤝 MIDDLEMAN / REKBER", EMBED_COLORS.info)
    .setDescription(description)
    .setFooter(MIDDLEMAN_FOOTER);
}

export function buildMiddlemanOrderPromptRow(nominal: number): ActionRowBuilder<ButtonBuilder> {
  return new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder()
      .setCustomId(buildCustomId("middleman", "order", nominal.toString()))
      .setLabel("ORDER MIDDLEMAN")
      .setEmoji("🤝")
      .setStyle(ButtonStyle.Primary),
  );
}

export interface MiddlemanOrderEmbedData {
  orderCode: string;
  transactionAmountIdr: number;
  middlemanFeeIdr: number;
  finalPrice: number;
  party1Username: string;
  party2Username: string;
  transactionDetail: string;
}

export function sessionToMiddlemanEmbedData(
  session: MiddlemanOrderSessionDocument,
): MiddlemanOrderEmbedData {
  return {
    orderCode: session.orderCode,
    transactionAmountIdr: session.transactionAmountIdr,
    middlemanFeeIdr: session.middlemanFeeIdr,
    finalPrice: session.finalPrice,
    party1Username: session.party1Username,
    party2Username: session.party2Username,
    transactionDetail: session.transactionDetail,
  };
}

export function buildMiddlemanOrderPreviewEmbed(data: MiddlemanOrderEmbedData): EmbedBuilder {
  return createBaseEmbed("🤝 MIDDLEMAN / REKBER", EMBED_COLORS.info)
    .setDescription(
      [
        "Status:",
        "🟡 MENUNGGU KONFIRMASI",
        "",
        `**Order ID:** \`${data.orderCode}\``,
        "",
        "Periksa detail pesanan sebelum melanjutkan konfirmasi.",
      ].join("\n"),
    )
    .addFields(
      { name: "💰 Nominal Transaksi", value: formatIdr(data.transactionAmountIdr), inline: true },
      { name: "🛡️ Biaya Middleman", value: formatIdr(data.middlemanFeeIdr), inline: true },
      { name: "💳 Total Pembayaran", value: formatIdr(data.finalPrice), inline: false },
      { name: "👤 Pihak 1", value: data.party1Username, inline: true },
      { name: "👤 Pihak 2", value: data.party2Username, inline: true },
      { name: "📝 Detail Transaksi", value: data.transactionDetail, inline: false },
    )
    .setFooter(MIDDLEMAN_FOOTER);
}

export function buildMiddlemanOrderPreviewRow(
  sessionId: string,
  disabled = false,
): ActionRowBuilder<ButtonBuilder> {
  return new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder()
      .setCustomId(buildCustomId("middleman", "confirm", sessionId))
      .setLabel("KONFIRMASI PESANAN")
      .setEmoji("✅")
      .setStyle(ButtonStyle.Success)
      .setDisabled(disabled),
    new ButtonBuilder()
      .setCustomId(buildCustomId("middleman", "edit", sessionId))
      .setLabel("EDIT PESANAN")
      .setEmoji("✏️")
      .setStyle(ButtonStyle.Secondary)
      .setDisabled(disabled),
    new ButtonBuilder()
      .setCustomId(buildCustomId("middleman", "cancel", sessionId))
      .setLabel("BATALKAN PESANAN")
      .setEmoji("❌")
      .setStyle(ButtonStyle.Danger)
      .setDisabled(disabled),
  );
}

export function buildMiddlemanValidationErrorEmbed(message: string): EmbedBuilder {
  return createMiddlemanErrorEmbed("❌ VALIDASI GAGAL", message);
}

export function buildMiddlemanOrderExpiredEmbed(): EmbedBuilder {
  return createWarningEmbed(
    "⏰ SESI PESANAN KADALUARSA",
    "Sesi pesanan telah kedaluwarsa. Silakan mulai pesanan baru dari panel.",
  ).setFooter(MIDDLEMAN_FOOTER);
}

export function buildMiddlemanOrderCancelledEmbed(orderCode: string): EmbedBuilder {
  return createWarningEmbed("🔴 PESANAN DIBATALKAN", `Pesanan **#${orderCode}** telah dibatalkan.`).setFooter(
    MIDDLEMAN_FOOTER,
  );
}

export function buildMiddlemanAlreadyCancelledEmbed(orderCode: string): EmbedBuilder {
  return createWarningEmbed(
    "ℹ️ PESANAN SUDAH DIBATALKAN",
    `Pesanan **#${orderCode}** sudah dibatalkan sebelumnya.`,
  ).setFooter(MIDDLEMAN_FOOTER);
}

export function buildMiddlemanAlreadyConfirmedEmbed(
  orderCode: string,
  ticketMention: string,
): EmbedBuilder {
  return createSuccessEmbed(
    "✅ PESANAN SUDAH DIKONFIRMASI",
    [`Pesanan **#${orderCode}** sudah dikonfirmasi.`, `Ticket: ${ticketMention}`].join("\n"),
  ).setFooter(MIDDLEMAN_FOOTER);
}

export function buildMiddlemanDuplicateTicketEmbed(ticketMention: string): EmbedBuilder {
  return createWarningEmbed(
    "⚠️ TICKET AKTIF DITEMUKAN",
    [`Anda masih memiliki ticket Middleman yang belum selesai: ${ticketMention}`].join("\n"),
  ).setFooter(MIDDLEMAN_FOOTER);
}

export function buildMiddlemanTicketSuccessEmbed(orderCode: string, channelId: string): EmbedBuilder {
  return createSuccessEmbed(
    "✅ TICKET BERHASIL DIBUAT",
    [`Pesanan **#${orderCode}** telah dikonfirmasi.`, `Silakan lanjutkan di ${`<#${channelId}>`}.`].join("\n"),
  ).setFooter(MIDDLEMAN_FOOTER);
}

export function buildMiddlemanTicketErrorEmbed(code: string): EmbedBuilder {
  const messages: Record<string, string> = {
    TICKET_PERMISSION_DENIED: "Bot tidak memiliki izin untuk membuat ticket.",
    TICKET_CREATE_FAILED: "Gagal membuat ticket. Silakan hubungi staff.",
  };

  return createMiddlemanErrorEmbed(
    "❌ GAGAL MEMBUAT TICKET",
    messages[code] ?? "Terjadi kesalahan saat membuat ticket.",
  );
}
