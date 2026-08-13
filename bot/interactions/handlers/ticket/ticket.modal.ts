import {
  ActionRowBuilder,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
} from "discord.js";
import { buildCustomId } from "../../custom-id";

export function buildLimitedDeliverPriceModal(ticketId: string): ModalBuilder {
  const priceInput = new TextInputBuilder()
    .setCustomId("final_price")
    .setLabel("Nominal Transaksi Final")
    .setPlaceholder("Contoh: 150000 atau Rp150.000")
    .setStyle(TextInputStyle.Short)
    .setRequired(true)
    .setMaxLength(20);

  return new ModalBuilder()
    .setCustomId(buildCustomId("ticket", "deliver-price", ticketId))
    .setTitle("NOMINAL TRANSAKSI FINAL")
    .addComponents(new ActionRowBuilder<TextInputBuilder>().addComponents(priceInput));
}

export function extractDeliverPriceInput(modal: {
  fields: {
    getTextInputValue: (customId: string) => string;
  };
}): string {
  return modal.fields.getTextInputValue("final_price");
}
