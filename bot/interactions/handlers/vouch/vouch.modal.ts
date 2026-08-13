import {
  ActionRowBuilder,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
} from "discord.js";
import { buildCustomId } from "../../custom-id";

export function buildVouchSubmitModal(voucherId: string): ModalBuilder {
  const ratingInput = new TextInputBuilder()
    .setCustomId("vouch_rating")
    .setLabel("Rating transaksi kamu (1-5)")
    .setPlaceholder("Masukkan angka 1 sampai 5")
    .setStyle(TextInputStyle.Short)
    .setRequired(true)
    .setMaxLength(1);

  const reviewInput = new TextInputBuilder()
    .setCustomId("vouch_review")
    .setLabel("Ulasan / feedback")
    .setPlaceholder("Ceritakan pengalaman transaksimu...")
    .setStyle(TextInputStyle.Paragraph)
    .setRequired(true)
    .setMaxLength(1000);

  return new ModalBuilder()
    .setCustomId(buildCustomId("vouch", "submit", voucherId))
    .setTitle("BERIKAN VOUCH")
    .addComponents(
      new ActionRowBuilder<TextInputBuilder>().addComponents(ratingInput),
      new ActionRowBuilder<TextInputBuilder>().addComponents(reviewInput),
    );
}

export function extractVouchModalInput(modal: {
  fields: {
    getTextInputValue: (customId: string) => string;
  };
}): {
  ratingRaw: string;
  review: string;
} {
  return {
    ratingRaw: modal.fields.getTextInputValue("vouch_rating"),
    review: modal.fields.getTextInputValue("vouch_review"),
  };
}

export function parseVouchRating(ratingRaw: string): number | null {
  const trimmed = ratingRaw.trim();

  if (!/^[1-5]$/.test(trimmed)) {
    return null;
  }

  return Number.parseInt(trimmed, 10);
}
