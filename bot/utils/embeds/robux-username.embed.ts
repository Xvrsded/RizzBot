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
import { ROBUX_USERNAME_PACKAGES, type RobuxPackage } from "../../../shared/robux-packages";
import {
  formatOrderCodeLabel,
  formatRobloxUsernameCopy,
  formatTicketActiveRobuxValue,
  formatTicketActiveTotal,
  formatTicketPaymentCustomer,
} from "../formatters";
import {
  createBaseEmbed,
  createErrorEmbed,
  createSuccessEmbed,
  createWarningEmbed,
  EMBED_COLORS,
} from "./base.embed";
import { buildStoreProductPanelEmbed } from "./product-panel.embed";

const ROBUX_FOOTER = { text: "RizzBot • Robux Via Username" };

const ROBUX_VIA_SEND_INFO = [
  "⚡ Fast Process • 🛡️ 100% Safe & Trusted",
  "",
  "📌 Pastikan akun Roblox kamu sudah berusia 18+ agar tidak terkendala verifikasi orang tua saat menerima Robux.",
  "",
  "📌 WAJIB aktifkan V2L agar dapat menerima lebih dari 500 Robux.",
  "",
  "⚠️ Pastikan limit akun masih tersedia sebelum melakukan order agar proses pengiriman Robux dapat berjalan lancar.",
].join("\n");

export function createRobuxErrorEmbed(title: string, description: string): EmbedBuilder {
  return createErrorEmbed(title, description).setFooter(ROBUX_FOOTER);
}

function applyAvatar(embed: EmbedBuilder, avatarUrl: string | null): EmbedBuilder {
  if (avatarUrl) {
    embed.setThumbnail(avatarUrl);
  }

  return embed;
}


export interface RobuxOrderEmbedData {
  orderCode: string;
  robuxAmount: number;
  finalPrice: number;
  robloxUsername: string;
  robloxDisplayName: string;
  robloxAvatarUrl: string | null;
}

export function buildRobuxPanelEmbed(packages: readonly RobuxPackage[] = ROBUX_USERNAME_PACKAGES): EmbedBuilder {
  return buildStoreProductPanelEmbed({
    title: "🛒 ROBUX VIA SEND",
    subtitle: "RIZZSTORE • PRICE LIST VIA SEND",
    welcomeLine: "Silakan pilih paket Robux Via Send yang sesuai dengan kebutuhan kamu.",
    packages,
    infoTitle: "🛡️",
    infoContent: ROBUX_VIA_SEND_INFO,
    footerLabel: "RizzBot • Robux Via Send",
  });
}

export function buildRobuxPanelRow(): ActionRowBuilder<ButtonBuilder> {
  return new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder()
      .setCustomId(buildCustomId("robux", "order"))
      .setLabel("ORDER VIA SEND")
      .setEmoji("🛒")
      .setStyle(ButtonStyle.Primary),
  );
}

export function buildRobuxPackageSelectEmbed(): EmbedBuilder {
  return createBaseEmbed("💎 PILIH PAKET ROBUX", EMBED_COLORS.info)
    .setDescription("Silakan pilih jumlah Robux yang ingin Anda beli.")
    .setFooter(ROBUX_FOOTER);
}

export function buildRobuxPackageSelectRow(
  packages: readonly RobuxPackage[] = ROBUX_USERNAME_PACKAGES,
  sessionId?: string,
): ActionRowBuilder<StringSelectMenuBuilder> {
  const customId = sessionId
    ? buildCustomId("robux", "select-package", sessionId)
    : buildCustomId("robux", "select-package");

  const menu = new StringSelectMenuBuilder()
    .setCustomId(customId)
    .setPlaceholder("Pilih paket Robux")
    .addOptions(
      packages.map((pkg) =>
        new StringSelectMenuOptionBuilder()
          .setLabel(`${pkg.robuxAmount.toLocaleString("id-ID")} ⏣`)
          .setDescription(formatIdr(pkg.priceIdr))
          .setValue(String(pkg.robuxAmount)),
      ),
    );

  return new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(menu);
}

export function buildRobuxOrderPreviewEmbed(
  data: RobuxOrderEmbedData,
  customerMention: string,
): EmbedBuilder {
  const embed = createBaseEmbed("💎 ROBUX VIA SEND", EMBED_COLORS.info)
    .setDescription(
      [
        "Status:",
        "🟡 MENUNGGU KONFIRMASI",
        "",
        formatOrderCodeLabel(data.orderCode),
        "",
        "Periksa detail pesanan sebelum melanjutkan konfirmasi.",
      ].join("\n"),
    )
    .addFields(
      {
        name: "Customer",
        value: customerMention,
        inline: false,
      },
      {
        name: "👤 ROBLOX USERNAME",
        value: formatRobloxUsernameCopy(data.robloxUsername),
        inline: false,
      },
      {
        name: "Display Name",
        value: data.robloxDisplayName,
        inline: true,
      },
      {
        name: "💎 ROBUX",
        value: formatTicketActiveRobuxValue(data.robuxAmount),
        inline: true,
      },
      {
        name: "💰 TOTAL PEMBAYARAN",
        value: formatTicketActiveTotal(data.finalPrice),
        inline: false,
      },
    )
    .setFooter(ROBUX_FOOTER);

  return applyAvatar(embed, data.robloxAvatarUrl);
}

export function buildRobuxOrderPreviewRow(sessionId: string, disabled = false): ActionRowBuilder<ButtonBuilder> {
  return new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder()
      .setCustomId(buildCustomId("robux", "confirm", sessionId))
      .setLabel("KONFIRMASI PESANAN")
      .setEmoji("✅")
      .setStyle(ButtonStyle.Success)
      .setDisabled(disabled),
    new ButtonBuilder()
      .setCustomId(buildCustomId("robux", "edit", sessionId))
      .setLabel("EDIT PESANAN")
      .setEmoji("✏️")
      .setStyle(ButtonStyle.Secondary)
      .setDisabled(disabled),
    new ButtonBuilder()
      .setCustomId(buildCustomId("robux", "cancel", sessionId))
      .setLabel("BATALKAN PESANAN")
      .setEmoji("❌")
      .setStyle(ButtonStyle.Danger)
      .setDisabled(disabled),
  );
}

export function buildRobuxUsernameNotFoundEmbed(username: string): EmbedBuilder {
  return createErrorEmbed(
    "❌ USERNAME ROBLOX TIDAK DITEMUKAN",
    ["Username:", formatRobloxUsernameCopy(username), "", "Pastikan username Roblox yang dimasukkan benar."].join(
      "\n",
    ),
  ).setFooter(ROBUX_FOOTER);
}

export function buildRobuxUsernameNotFoundRow(): ActionRowBuilder<ButtonBuilder> {
  return new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder()
      .setCustomId(buildCustomId("robux", "dismiss"))
      .setLabel("Tutup")
      .setStyle(ButtonStyle.Secondary),
  );
}

export function buildRobuxOrderExpiredEmbed(): EmbedBuilder {
  return createWarningEmbed(
    "⏰ SESI PESANAN KADALUARSA",
    "Sesi pesanan telah kedaluwarsa. Silakan mulai pesanan baru dari panel.",
  ).setFooter(ROBUX_FOOTER);
}

export function buildRobuxOrderCancelledEmbed(orderCode: string): EmbedBuilder {
  return createWarningEmbed(
    "🔴 PESANAN DIBATALKAN",
    `Pesanan **#${orderCode}** telah dibatalkan.`,
  ).setFooter(ROBUX_FOOTER);
}

export function buildRobuxAlreadyCancelledEmbed(orderCode: string): EmbedBuilder {
  return createWarningEmbed(
    "ℹ️ PESANAN SUDAH DIBATALKAN",
    `Pesanan **#${orderCode}** sudah dibatalkan sebelumnya.`,
  ).setFooter(ROBUX_FOOTER);
}

export function buildRobuxAlreadyConfirmedEmbed(orderCode: string, ticketMention: string): EmbedBuilder {
  return createSuccessEmbed(
    "✅ PESANAN SUDAH DIKONFIRMASI",
    [`Pesanan **#${orderCode}** sudah dikonfirmasi.`, `Ticket: ${ticketMention}`].join("\n"),
  ).setFooter(ROBUX_FOOTER);
}

export function buildRobuxDuplicateTicketEmbed(ticketMention: string): EmbedBuilder {
  return createWarningEmbed(
    "⚠️ TICKET AKTIF DITEMUKAN",
    [`Anda masih memiliki ticket Robux Via Username yang belum selesai: ${ticketMention}`].join("\n"),
  ).setFooter(ROBUX_FOOTER);
}

export function buildRobuxTicketSuccessEmbed(orderCode: string, channelId: string): EmbedBuilder {
  return createSuccessEmbed(
    "✅ TICKET BERHASIL DIBUAT",
    [`Pesanan **#${orderCode}** telah dikonfirmasi.`, `Silakan lanjutkan di ${`<#${channelId}>`}.`].join("\n"),
  ).setFooter(ROBUX_FOOTER);
}

export function buildRobuxTicketErrorEmbed(code: string): EmbedBuilder {
  const messages: Record<string, string> = {
    TICKET_PERMISSION_DENIED: "Bot tidak memiliki izin untuk membuat ticket.",
    TICKET_CREATE_FAILED: "Gagal membuat ticket. Silakan hubungi staff.",
  };

  return createErrorEmbed(
    "❌ GAGAL MEMBUAT TICKET",
    messages[code] ?? "Terjadi kesalahan saat membuat ticket.",
  ).setFooter(ROBUX_FOOTER);
}

export function buildRobuxDismissedEmbed(): EmbedBuilder {
  return createBaseEmbed("ℹ️ DITUTUP", EMBED_COLORS.info)
    .setDescription("Pesan ditutup.")
    .setFooter(ROBUX_FOOTER);
}

export function buildRobuxValidationErrorEmbed(message: string): EmbedBuilder {
  return createRobuxErrorEmbed("❌ VALIDASI GAGAL", message);
}

export function sessionToRobuxEmbedData(session: {
  orderCode: string;
  robuxAmount: number;
  finalPrice: number;
  robloxUsername: string;
  robloxDisplayName: string;
  robloxAvatarUrl: string | null;
}): RobuxOrderEmbedData {
  return {
    orderCode: session.orderCode,
    robuxAmount: session.robuxAmount,
    finalPrice: session.finalPrice,
    robloxUsername: session.robloxUsername,
    robloxDisplayName: session.robloxDisplayName,
    robloxAvatarUrl: session.robloxAvatarUrl,
  };
}
