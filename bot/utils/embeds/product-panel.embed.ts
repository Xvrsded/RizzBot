import { EmbedBuilder } from "discord.js";
import { formatIdr } from "../pricing";
import { createBaseEmbed, EMBED_COLORS } from "./base.embed";

export interface ProductPanelPackage {
  robuxAmount: number;
  priceIdr: number;
}

export interface StoreProductPanelConfig {
  title: string;
  subtitle: string;
  welcomeLine: string;
  packages: readonly ProductPanelPackage[];
  infoTitle: string;
  infoContent: string;
  footerLabel: string;
}

function formatPanelTimestamp(date: Date): string {
  return new Intl.DateTimeFormat("id-ID", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Asia/Jakarta",
    hour12: false,
  }).format(date);
}

function buildPriceListCodeBlock(packages: readonly ProductPanelPackage[]): string {
  const rows = packages.map((pkg) => ({
    robux: `${pkg.robuxAmount.toLocaleString("id-ID")} ⏣`,
    price: formatIdr(pkg.priceIdr),
  }));
  const maxRobuxLength = Math.max(...rows.map((row) => row.robux.length));
  const lines = rows.map((row) => `${row.robux.padEnd(maxRobuxLength)} = ${row.price}`);

  return ["```text", ...lines, "```"].join("\n");
}

export function buildStoreProductPanelEmbed(config: StoreProductPanelConfig): EmbedBuilder {
  const updatedAt = new Date();

  return createBaseEmbed(config.title, EMBED_COLORS.info)
    .setDescription(
      [
        `**${config.subtitle}**`,
        "",
        "Selamat datang di RizzStore!",
        config.welcomeLine,
        "",
        "📋 **DAFTAR PAKET & HARGA**",
        buildPriceListCodeBlock(config.packages),
        "",
        `${config.infoTitle} **INFORMASI & PERSYARATAN**`,
        "",
        config.infoContent,
      ].join("\n"),
    )
    .setFooter({
      text: `${config.footerLabel} • Last Update: ${formatPanelTimestamp(updatedAt)}`,
    })
    .setTimestamp(updatedAt);
}
