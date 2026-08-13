import {
  ActionRowBuilder,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
  type ModalSubmitInteraction,
} from "discord.js";
import { buildCustomId } from "../../custom-id";

const SESSION_ID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export interface MiddlemanModalDefaults {
  party1Username?: string;
  party2Username?: string;
  transactionDetail?: string;
}

export function isMiddlemanSessionId(value: string): boolean {
  return SESSION_ID_PATTERN.test(value);
}

export function buildMiddlemanOrderModal(
  targetId: string,
  defaults: MiddlemanModalDefaults = {},
): ModalBuilder {
  // targetId could be a sessionId (for edits) or a nominal (for new orders)
  const customId = buildCustomId("middleman", "submit", targetId);

  const party1Input = new TextInputBuilder()
    .setCustomId("mm_party1")
    .setLabel("Username Pihak 1")
    .setPlaceholder("Username pihak pertama")
    .setStyle(TextInputStyle.Short)
    .setRequired(true)
    .setMaxLength(50);

  const party2Input = new TextInputBuilder()
    .setCustomId("mm_party2")
    .setLabel("Username Pihak 2")
    .setPlaceholder("Username pihak kedua")
    .setStyle(TextInputStyle.Short)
    .setRequired(true)
    .setMaxLength(50);

  const detailInput = new TextInputBuilder()
    .setCustomId("mm_detail")
    .setLabel("Detail Transaksi")
    .setPlaceholder("Jelaskan item/jasa yang ditransaksikan")
    .setStyle(TextInputStyle.Paragraph)
    .setRequired(true)
    .setMaxLength(500);

  if (defaults.party1Username) {
    party1Input.setValue(defaults.party1Username.slice(0, 50));
  }

  if (defaults.party2Username) {
    party2Input.setValue(defaults.party2Username.slice(0, 50));
  }

  if (defaults.transactionDetail) {
    detailInput.setValue(defaults.transactionDetail.slice(0, 500));
  }

  return new ModalBuilder()
    .setCustomId(customId)
    .setTitle("Order Middleman / Rekber")
    .addComponents(
      new ActionRowBuilder<TextInputBuilder>().addComponents(party1Input),
      new ActionRowBuilder<TextInputBuilder>().addComponents(party2Input),
      new ActionRowBuilder<TextInputBuilder>().addComponents(detailInput),
    );
}

export function extractMiddlemanModalInput(interaction: ModalSubmitInteraction): MiddlemanModalDefaults {
  return {
    party1Username: interaction.fields.getTextInputValue("mm_party1"),
    party2Username: interaction.fields.getTextInputValue("mm_party2"),
    transactionDetail: interaction.fields.getTextInputValue("mm_detail"),
  };
}
