import {
  ActionRowBuilder,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
} from "discord.js";
import { buildCustomId } from "../../interactions/custom-id";
import { createErrorEmbed, createSuccessEmbed } from "./base.embed";
import { formatIdr } from "../pricing";
import type { GigPricingConfig, GigRateType } from "../../../shared/products";

const PRICING_FOOTER = { text: "RizzBot • GIG Config" };

export function buildGigPricingModal(pricing: GigPricingConfig, rateType: GigRateType): ModalBuilder {
  const rateInput = new TextInputBuilder()
    .setCustomId("gig_rate_idr")
    .setLabel("Harga per Robux (Rupiah)")
    .setPlaceholder(rateType === "global" ? "Contoh: 92" : "Contoh: 95")
    .setStyle(TextInputStyle.Short)
    .setRequired(true)
    .setMaxLength(12)
    .setValue(String(rateType === "global" ? pricing.globalRateIdr : pricing.indoRateIdr));

  const roundingInput = new TextInputBuilder()
    .setCustomId("gig_rounding_idr")
    .setLabel("Pembulatan harga (Rupiah)")
    .setPlaceholder("Contoh: 500")
    .setStyle(TextInputStyle.Short)
    .setRequired(true)
    .setMaxLength(12)
    .setValue(String(pricing.roundingIdr));

  return new ModalBuilder()
    .setCustomId(buildCustomId("dashboard", "gig-pricing-save", rateType))
    .setTitle(`GIG ${rateType === "global" ? "Global" : "Indo"} Config`)
    .addComponents(
      new ActionRowBuilder<TextInputBuilder>().addComponents(rateInput),
      new ActionRowBuilder<TextInputBuilder>().addComponents(roundingInput),
    );
}

export function extractGigPricingModalInput(interaction: {
  fields: { getTextInputValue: (customId: string) => string };
}): { rateRaw: string; roundingRaw: string } {
  return {
    rateRaw: interaction.fields.getTextInputValue("gig_rate_idr"),
    roundingRaw: interaction.fields.getTextInputValue("gig_rounding_idr"),
  };
}

export function buildGigPricingInvalidEmbed(): ReturnType<typeof createErrorEmbed> {
  return createErrorEmbed(
    "INPUT TIDAK VALID",
    "Harga per Robux dan pembulatan harus berupa angka Rupiah bulat lebih dari nol.",
  ).setFooter(PRICING_FOOTER);
}

export function buildGigPricingSavedEmbed(
  pricing: GigPricingConfig,
  rateType: GigRateType,
): ReturnType<typeof createSuccessEmbed> {
  return createSuccessEmbed(
    "GIG PRICING UPDATED",
    [
      `Tipe GIG: **${rateType === "global" ? "Global" : "Indo"}**`,
      `Harga per Robux: **${formatIdr(rateType === "global" ? pricing.globalRateIdr : pricing.indoRateIdr)}**`,
      `Pembulatan: **${formatIdr(pricing.roundingIdr)}**`,
      "",
      "Panel GIG dan perhitungan order baru telah diperbarui.",
    ].join("\n"),
  ).setFooter(PRICING_FOOTER);
}
