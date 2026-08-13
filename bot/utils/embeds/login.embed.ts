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
import { ROBUX_LOGIN_PACKAGES } from "../../../shared/login-packages";
import {
  formatOrderCodeLabel,
  formatRobloxUsernameCopy,
  formatTicketActiveRobuxValue,
  formatTicketActiveTotal,
} from "../formatters";
import {
  createBaseEmbed,
  createErrorEmbed,
  createSuccessEmbed,
  createWarningEmbed,
  EMBED_COLORS,
} from "./base.embed";
import { buildStoreProductPanelEmbed } from "./product-panel.embed";

const LOGIN_FOOTER = { text: "RizzBot • Robux Via Login" };
const LOGIN_PRODUCT_LABEL = "```text\nROBUX VIA LOGIN\n```";

const ROBUX_VIA_LOGIN_INFO = [
  "⚡ Fast Process • 🔒 Private & Secure",
  "",
  "📌 Username dan password hanya digunakan untuk proses pemesanan dan tidak dicantumkan pada transaction log.",
  "",
  "⚠️ Untuk memperlancar proses, customer disarankan menonaktifkan verifikasi 2 langkah sementara saat proses sedang dilakukan.",
  "",
  "📌 Setelah proses selesai, customer disarankan mengaktifkan kembali keamanan akun.",
  "",
  "⚠️ Pastikan informasi login yang diberikan benar agar proses dapat dilakukan tanpa kendala.",
].join("\n");

export function createLoginErrorEmbed(title: string, description: string): EmbedBuilder {
  return createErrorEmbed(title, description).setFooter(LOGIN_FOOTER);
}

function applyAvatar(embed: EmbedBuilder, avatarUrl: string | null): EmbedBuilder {
  if (avatarUrl) {
    embed.setThumbnail(avatarUrl);
  }

  return embed;
}

export interface LoginOrderEmbedData {
  orderCode: string;
  robuxAmount: number;
  finalPrice: number;
  robloxUsername: string;
  robloxDisplayName: string;
  robloxAvatarUrl: string | null;
}

export function buildLoginPanelEmbed(): EmbedBuilder {
  return buildStoreProductPanelEmbed({
    title: "🔐 ROBUX VIA LOGIN",
    subtitle: "RIZZSTORE • PRICE LIST VIA LOGIN",
    welcomeLine: "Silakan pilih paket Robux Via Login yang sesuai dengan kebutuhan kamu.",
    packages: ROBUX_LOGIN_PACKAGES,
    infoTitle: "🔐",
    infoContent: ROBUX_VIA_LOGIN_INFO,
    footerLabel: "RizzBot • Robux Via Login",
  });
}

export function buildLoginPanelRow(): ActionRowBuilder<ButtonBuilder> {
  return new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder()
      .setCustomId(buildCustomId("login", "order"))
      .setLabel("ORDER VIA LOGIN")
      .setEmoji("🔐")
      .setStyle(ButtonStyle.Primary),
  );
}

export function buildLoginPackageSelectEmbed(): EmbedBuilder {
  return createBaseEmbed("🔐 PILIH PAKET ROBUX", EMBED_COLORS.info)
    .setDescription("Silakan pilih jumlah Robux Via Login yang ingin Anda beli.")
    .setFooter(LOGIN_FOOTER);
}

export function buildLoginPackageSelectRow(sessionId?: string): ActionRowBuilder<StringSelectMenuBuilder> {
  const customId = sessionId
    ? buildCustomId("login", "select-package", sessionId)
    : buildCustomId("login", "select-package");

  const menu = new StringSelectMenuBuilder()
    .setCustomId(customId)
    .setPlaceholder("Pilih paket Robux Via Login")
    .addOptions(
      ROBUX_LOGIN_PACKAGES.map((pkg) =>
        new StringSelectMenuOptionBuilder()
          .setLabel(`${pkg.robuxAmount.toLocaleString("id-ID")} ⏣`)
          .setDescription(formatIdr(pkg.priceIdr))
          .setValue(String(pkg.robuxAmount)),
      ),
    );

  return new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(menu);
}

export function buildLoginProcessingEmbed(): EmbedBuilder {
  return createBaseEmbed("🔐 PROSES PEMROSESAN", EMBED_COLORS.info)
    .setDescription(
      [
        "Username Roblox kamu sudah diterima.",
        "",
        "Silakan ikuti instruksi login yang diberikan staff untuk proses pemesanan.",
        "",
        "Demi keamanan akun, jangan kirim password, cookie, security token, atau kode verifikasi melalui Discord.",
        "",
        "Staff akan memberikan instruksi proses selanjutnya secara langsung.",
      ].join("\n"),
    )
    .setFooter(LOGIN_FOOTER);
}

export function buildLoginOrderPreviewEmbed(data: LoginOrderEmbedData): EmbedBuilder {
  const embed = createBaseEmbed("🔐 ROBUX VIA LOGIN", EMBED_COLORS.info)
    .setDescription(
      [
        "**📦 DETAIL PESANAN**",
        "",
        formatOrderCodeLabel(data.orderCode),
        "",
        "Status:",
        "🟡 MENUNGGU KONFIRMASI",
      ].join("\n"),
    )
    .addFields(
      {
        name: "👤 ROBLOX USERNAME",
        value: formatRobloxUsernameCopy(data.robloxUsername),
        inline: false,
      },
      {
        name: "💎 JUMLAH ROBUX",
        value: formatTicketActiveRobuxValue(data.robuxAmount),
        inline: true,
      },
      {
        name: "💰 TOTAL PEMBAYARAN",
        value: formatTicketActiveTotal(data.finalPrice),
        inline: true,
      },
      {
        name: "🏷️ JENIS PESANAN",
        value: LOGIN_PRODUCT_LABEL,
        inline: false,
      },
    )
    .setFooter(LOGIN_FOOTER);

  return applyAvatar(embed, data.robloxAvatarUrl);
}

export function buildLoginOrderPreviewRow(sessionId: string, disabled = false): ActionRowBuilder<ButtonBuilder> {
  return new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder()
      .setCustomId(buildCustomId("login", "confirm", sessionId))
      .setLabel("KONFIRMASI PESANAN")
      .setEmoji("✅")
      .setStyle(ButtonStyle.Success)
      .setDisabled(disabled),
    new ButtonBuilder()
      .setCustomId(buildCustomId("login", "edit", sessionId))
      .setLabel("EDIT PESANAN")
      .setEmoji("✏️")
      .setStyle(ButtonStyle.Secondary)
      .setDisabled(disabled),
    new ButtonBuilder()
      .setCustomId(buildCustomId("login", "cancel", sessionId))
      .setLabel("BATALKAN PESANAN")
      .setEmoji("❌")
      .setStyle(ButtonStyle.Danger)
      .setDisabled(disabled),
  );
}

export function buildLoginValidationErrorEmbed(message: string): EmbedBuilder {
  return createLoginErrorEmbed("❌ VALIDASI GAGAL", message);
}

export function buildLoginUsernameNotFoundEmbed(username: string): EmbedBuilder {
  return createLoginErrorEmbed(
    "❌ USERNAME ROBLOX TIDAK DITEMUKAN",
    ["Username:", formatRobloxUsernameCopy(username), "", "Pastikan username Roblox yang dimasukkan benar."].join(
      "\n",
    ),
  );
}

export function buildLoginOrderExpiredEmbed(): EmbedBuilder {
  return createWarningEmbed(
    "⏰ SESI PESANAN KADALUARSA",
    "❌ SESSION EXPIRED\n\nSilakan mulai kembali proses pemesanan.",
  ).setFooter(LOGIN_FOOTER);
}

export function buildLoginOrderCancelledEmbed(orderCode: string): EmbedBuilder {
  return createWarningEmbed(
    "🔴 PESANAN DIBATALKAN",
    `Pesanan **#${orderCode}** telah dibatalkan.`,
  ).setFooter(LOGIN_FOOTER);
}

export function buildLoginAlreadyCancelledEmbed(orderCode: string): EmbedBuilder {
  return createWarningEmbed(
    "ℹ️ PESANAN SUDAH DIBATALKAN",
    `Pesanan **#${orderCode}** sudah dibatalkan sebelumnya.`,
  ).setFooter(LOGIN_FOOTER);
}

export function buildLoginAlreadyConfirmedEmbed(orderCode: string, ticketMention: string): EmbedBuilder {
  return createSuccessEmbed(
    "✅ PESANAN SUDAH DIKONFIRMASI",
    [`Pesanan **#${orderCode}** sudah dikonfirmasi.`, `Ticket: ${ticketMention}`].join("\n"),
  ).setFooter(LOGIN_FOOTER);
}

export function buildLoginDuplicateTicketEmbed(ticketMention: string): EmbedBuilder {
  return createWarningEmbed(
    "⚠️ TICKET AKTIF DITEMUKAN",
    [`Anda masih memiliki ticket Robux Via Login yang belum selesai: ${ticketMention}`].join("\n"),
  ).setFooter(LOGIN_FOOTER);
}

export function buildLoginTicketSuccessEmbed(orderCode: string, channelId: string): EmbedBuilder {
  return createSuccessEmbed(
    "✅ TICKET BERHASIL DIBUAT",
    [`Pesanan **#${orderCode}** telah dikonfirmasi.`, `Silakan lanjutkan di ${`<#${channelId}>`}.`].join("\n"),
  ).setFooter(LOGIN_FOOTER);
}

export function buildLoginTicketErrorEmbed(code: string): EmbedBuilder {
  const messages: Record<string, string> = {
    TICKET_PERMISSION_DENIED: "Bot tidak memiliki izin untuk membuat ticket.",
    TICKET_CREATE_FAILED: "Gagal membuat ticket. Silakan hubungi staff.",
  };

  return createLoginErrorEmbed(
    "❌ GAGAL MEMBUAT TICKET",
    messages[code] ?? "Terjadi kesalahan saat membuat ticket.",
  );
}

export function sessionToLoginEmbedData(session: {
  orderCode: string;
  robuxAmount: number;
  finalPrice: number;
  robloxUsername: string;
  robloxDisplayName: string;
  robloxAvatarUrl: string | null;
}): LoginOrderEmbedData {
  return {
    orderCode: session.orderCode,
    robuxAmount: session.robuxAmount,
    finalPrice: session.finalPrice,
    robloxUsername: session.robloxUsername,
    robloxDisplayName: session.robloxDisplayName,
    robloxAvatarUrl: session.robloxAvatarUrl,
  };
}
