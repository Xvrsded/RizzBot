import { EmbedBuilder } from "discord.js";
import { ITEM_TUMBAL_ITEMS, type ItemTumbalEntry } from "../../../shared/item-tumbal-items";
import { createBaseEmbed, EMBED_COLORS } from "./base.embed";

const PANEL_FOOTER = { text: "RizzBot • Limited Item Support" };
const MAX_FIELD_VALUE_LENGTH = 1024;
const PANEL_DIVIDER = "━━━━━━━━━━━━━━━━━━━━";

function formatItemLine(item: ItemTumbalEntry): string {
  return `> [${item.name}](${item.url})`;
}

export function chunkItemTumbalLines(
  items: ItemTumbalEntry[],
  maxLength = MAX_FIELD_VALUE_LENGTH,
): string[] {
  const chunks: string[] = [];
  let current = "";

  for (const item of items) {
    const line = `${formatItemLine(item)}\n`;

    if (current.length + line.length > maxLength && current.length > 0) {
      chunks.push(current.trimEnd());
      current = line;
      continue;
    }

    current += line;
  }

  if (current.trim().length > 0) {
    chunks.push(current.trimEnd());
  }

  return chunks;
}

function buildMainEmbed(): EmbedBuilder {
  return createBaseEmbed("🛡️ ITEM TUMBAL — LIMITED TRADE", EMBED_COLORS.info)
    .setDescription(
      [
        "Buat kamu yang ingin membeli Limited Item seperti **8-Bit Royal Crown**, **HP Bar**, dan item Limited lainnya, pastikan akun Roblox kamu sudah memenuhi persyaratan trade.",
        "",
        "Kamu wajib memiliki **minimal 1 item tumbal** sebelum proses trade Limited dapat dilakukan.",
        "",
        "⚠️ Item yang baru dibeli **tidak dapat langsung digunakan untuk trade**. Item tersebut membutuhkan masa tunggu sekitar **7 hari** sebelum dapat digunakan untuk proses trade.",
        "",
        "Jika belum memiliki item tumbal, kamu dapat memilih salah satu item di bawah ini.",
      ].join("\n"),
    )
    .addFields(
      {
        name: "📌 INFORMASI PENTING",
        value: [
          "• Akun Roblox wajib memiliki **Roblox Premium / Roblox Plus** yang diperlukan untuk melakukan trade.",
          "• Wajib memiliki **minimal 1 item tumbal** yang dapat ditrade.",
          "• Item yang baru dibeli membutuhkan **waktu tunggu 7 hari** sebelum dapat digunakan untuk trade.",
          "• Pilih item tumbal yang sesuai dan pastikan item tersebut masih dapat ditrade.",
          "• Informasi item tumbal dapat berubah sewaktu-waktu.",
          "• Sebelum membeli, pastikan item masih tersedia dan dapat digunakan untuk kebutuhan trade.",
        ].join("\n"),
        inline: false,
      },
      {
        name: "💡 Tips",
        value:
          "Pilih item tumbal dengan harga yang lebih murah karena item-item tersebut hanya digunakan sebagai item pendukung untuk proses trade.",
        inline: false,
      },
      {
        name: PANEL_DIVIDER,
        value: "\u200b",
        inline: false,
      },
    );
}

export function buildItemTumbalPanelEmbeds(): EmbedBuilder[] {
  const itemChunks = chunkItemTumbalLines(ITEM_TUMBAL_ITEMS);

  if (itemChunks.length === 0) {
    const embed = buildMainEmbed().setFooter(PANEL_FOOTER).setTimestamp(new Date());
    return [embed];
  }

  if (itemChunks.length === 1) {
    const embed = buildMainEmbed()
      .addFields({
        name: "🧩 DAFTAR ITEM TUMBAL",
        value: itemChunks[0]!,
        inline: false,
      })
      .setFooter(PANEL_FOOTER)
      .setTimestamp(new Date());

    return [embed];
  }

  const embeds: EmbedBuilder[] = [];
  const mainEmbed = buildMainEmbed().addFields({
    name: "🧩 DAFTAR ITEM TUMBAL",
    value: itemChunks[0]!,
    inline: false,
  });
  embeds.push(mainEmbed);

  for (let index = 1; index < itemChunks.length; index += 1) {
    const continuationEmbed = createBaseEmbed("🧩 ITEM TUMBAL — LANJUTAN", EMBED_COLORS.info).addFields({
      name: `🧩 DAFTAR ITEM TUMBAL (${index + 1}/${itemChunks.length})`,
      value: itemChunks[index]!,
      inline: false,
    });
    embeds.push(continuationEmbed);
  }

  const lastEmbed = embeds[embeds.length - 1]!;
  lastEmbed.setFooter(PANEL_FOOTER).setTimestamp(new Date());

  return embeds;
}
