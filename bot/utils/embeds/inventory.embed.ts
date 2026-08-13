import {
  ActionRowBuilder,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
  type ModalSubmitInteraction,
} from "discord.js";
import { buildCustomId } from "../../interactions/custom-id";
import { createBaseEmbed, createErrorEmbed, createSuccessEmbed, EMBED_COLORS } from "./base.embed";
import { formatStockDisplay } from "../../../shared/rizz-store";

const INVENTORY_FOOTER = { text: "RizzBot • Inventory Management" };

export function buildInventoryManagementEmbed(
  stockViaSend: number,
  stockGig: number,
): ReturnType<typeof createBaseEmbed> {
  return createBaseEmbed("📦 INVENTORY MANAGEMENT", EMBED_COLORS.info)
    .setDescription(
      [
        "Kelola stok Robux yang ditampilkan pada RizzStore.",
        "",
        "**💎 Stock Robux Via Send**",
        formatStockDisplay(stockViaSend),
        "",
        "**🎁 Stock Robux GIG**",
        formatStockDisplay(stockGig),
        "",
        "Tekan **SIMPAN** pada modal untuk memperbarui stok.",
      ].join("\n"),
    )
    .setFooter(INVENTORY_FOOTER);
}

export function buildInventoryModal(
  stockViaSend: number,
  stockGig: number,
): ModalBuilder {
  const viaSendInput = new TextInputBuilder()
    .setCustomId("stock_via_send")
    .setLabel("Stock Robux Via Send")
    .setPlaceholder("Contoh: 500")
    .setStyle(TextInputStyle.Short)
    .setRequired(true)
    .setMaxLength(12)
    .setValue(stockViaSend > 0 ? String(stockViaSend) : "0");

  const gigInput = new TextInputBuilder()
    .setCustomId("stock_gig")
    .setLabel("Stock Robux GIG")
    .setPlaceholder("Contoh: 353639")
    .setStyle(TextInputStyle.Short)
    .setRequired(true)
    .setMaxLength(12)
    .setValue(stockGig > 0 ? String(stockGig) : "0");

  return new ModalBuilder()
    .setCustomId(buildCustomId("dashboard", "inventory-save"))
    .setTitle("📦 Inventory Management")
    .addComponents(
      new ActionRowBuilder<TextInputBuilder>().addComponents(viaSendInput),
      new ActionRowBuilder<TextInputBuilder>().addComponents(gigInput),
    );
}

export function extractInventoryModalInput(interaction: ModalSubmitInteraction): {
  stockViaSendRaw: string;
  stockGigRaw: string;
} {
  return {
    stockViaSendRaw: interaction.fields.getTextInputValue("stock_via_send"),
    stockGigRaw: interaction.fields.getTextInputValue("stock_gig"),
  };
}

export function buildInventoryInvalidEmbed(): ReturnType<typeof createErrorEmbed> {
  return createErrorEmbed(
    "❌ INPUT TIDAK VALID",
    "Stok harus berupa angka bulat nol atau lebih besar (contoh: 500 atau 353639).",
  ).setFooter(INVENTORY_FOOTER);
}

export function buildInventorySavedEmbed(
  stockViaSend: number,
  stockGig: number,
): ReturnType<typeof createSuccessEmbed> {
  return createSuccessEmbed(
    "💾 INVENTORY DISIMPAN",
    [
      "Stok berhasil diperbarui dan RizzStore status channels telah di-update.",
      "",
      "**💎 Stock Robux Via Send**",
      formatStockDisplay(stockViaSend),
      "",
      "**🎁 Stock Robux GIG**",
      formatStockDisplay(stockGig),
    ].join("\n"),
  ).setFooter(INVENTORY_FOOTER);
}

export function buildInventorySaveFailedEmbed(): ReturnType<typeof createErrorEmbed> {
  return createErrorEmbed(
    "❌ GAGAL MENYIMPAN",
    "Stok tidak dapat disimpan saat ini. Silakan coba lagi.",
  ).setFooter(INVENTORY_FOOTER);
}
