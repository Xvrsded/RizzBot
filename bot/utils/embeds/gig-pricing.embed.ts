import {
  ActionRowBuilder,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
} from "discord.js";
import { buildCustomId } from "../../interactions/custom-id";
import { createErrorEmbed, createSuccessEmbed } from "./base.embed";
import { formatIdr } from "../pricing";
import type { GigPricingConfig } from "../../../shared/products";

const PRICING_FOOTER = { text: "RizzBot • GIG Config" };

export function buildGigPricingModal(pricing: GigPricingConfig): ModalBuilder {
  const rateInput = new TextInputBuilder()
    .setCustomId("gig_rate_idr")
    .setLabel("Harga per Robux (Rupiah)")
    .setPlaceholder("Contoh: 90")
    .setStyle(TextInputStyle.Short)
    .setRequired(true)
    .setMaxLength(12)
    .setValue(String(pricing.rateIdr));

  const roundingInput = new TextInputBuilder()
    .setCustomId("gig_rounding_idr")
    .setLabel("Pembulatan harga (Rupiah)")
    .setPlaceholder("Contoh: 500")
    .setStyle(TextInputStyle.Short)
    .setRequired(true)
    .setMaxLength(12)
    .setValue(String(pricing.roundingIdr));

  return new ModalBuilder()
    .setCustomId(buildCustomId("dashboard", "gig-pricing-save"))
    .setTitle("GIG Pricing Config")
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

export function buildGigPricingSavedEmbed(pricing: GigPricingConfig): ReturnType<typeof createSuccessEmbed> {
  return createSuccessEmbed(
    "GIG PRICING UPDATED",
    [
      `Harga per Robux: **${formatIdr(pricing.rateIdr)}**`,
      `Pembulatan: **${formatIdr(pricing.roundingIdr)}**`,
      "",
      "Panel GIG dan perhitungan order baru telah diperbarui.",
    ].join("\n"),
  ).setFooter(PRICING_FOOTER);
}
