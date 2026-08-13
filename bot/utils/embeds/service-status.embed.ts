import { EmbedBuilder } from "discord.js";
import {
  SERVICE_LABELS,
  type ServiceStatusKey,
} from "../../../shared/service-status";
import { createBaseEmbed, createErrorEmbed, createSuccessEmbed, createWarningEmbed, EMBED_COLORS } from "./base.embed";

const PANEL_DIVIDER = "━━━━━━━━━━━━━━━━━━━━";

export function buildServiceClosedEmbed(serviceLabel: string, footer: string): EmbedBuilder {
  return createBaseEmbed("🔴 LAYANAN SEDANG DITUTUP", EMBED_COLORS.error)
    .setDescription(
      [
        `Layanan **${serviceLabel}** sedang tidak tersedia untuk sementara.`,
        "",
        "Silakan mencoba kembali nanti.",
        "",
        PANEL_DIVIDER,
        "",
        "Mohon tunggu hingga layanan kembali dibuka oleh Staff.",
      ].join("\n"),
    )
    .setFooter({ text: footer });
}

export function buildServiceUnavailableEmbed(): EmbedBuilder {
  return createWarningEmbed(
    "⚠️ LAYANAN SEMENTARA TIDAK TERSEDIA",
    [
      "Sistem konfigurasi layanan sedang tidak dapat diakses.",
      "",
      "Silakan coba kembali beberapa saat lagi.",
    ].join("\n"),
  ).setFooter({ text: "RizzBot • Service Status" });
}

export function buildDashboardAccessDeniedEmbed(): EmbedBuilder {
  return createWarningEmbed(
    "⚠️ AKSES DASHBOARD DITOLAK",
    [
      "Anda tidak memiliki izin untuk mengelola dashboard RizzBot.",
      "",
      "Dashboard hanya dapat digunakan oleh Owner dan Admin.",
    ].join("\n"),
  ).setFooter({ text: "RizzBot • Dashboard Management" });
}

export function buildServiceAccessDeniedEmbed(): EmbedBuilder {
  return createErrorEmbed(
    "❌ AKSES DITOLAK",
    "Anda tidak memiliki izin untuk mengubah status layanan.",
  ).setFooter({ text: "RizzBot • Control Center" });
}

export function buildServiceUpdatedEmbed(key: ServiceStatusKey, enabled: boolean): EmbedBuilder {
  const label = SERVICE_LABELS[key];
  const statusLabel = enabled ? "🟢 OPEN" : "🔴 CLOSED";
  const detail = enabled
    ? "Layanan sekarang dapat menerima order baru."
    : "Layanan sekarang tidak dapat menerima order baru.";

  return createSuccessEmbed("⚙️ SERVICE UPDATED", [
    `**${label}**`,
    "",
    "**Status:**",
    statusLabel,
    "",
    detail,
    "",
    "Perubahan berhasil disimpan.",
  ].join("\n")).setFooter({ text: "RizzBot • Control Center" });
}

export function buildDashboardStubEmbed(featureLabel: string): EmbedBuilder {
  return createBaseEmbed("⚙️ MANAGEMENT", EMBED_COLORS.info)
    .setDescription(
      [
        `Panel **${featureLabel}** akan segera tersedia melalui dashboard.`,
        "",
        "Fitur ini belum diaktifkan pada versi bot saat ini.",
      ].join("\n"),
    )
    .setFooter({ text: "RizzBot • Control Center" });
}

export function buildDashboardRefreshedEmbed(): EmbedBuilder {
  return createSuccessEmbed(
    "🔄 DASHBOARD REFRESHED",
    "Dashboard berhasil diperbarui dengan data terbaru dari database.",
  ).setFooter({ text: "RizzBot • Control Center" });
}
