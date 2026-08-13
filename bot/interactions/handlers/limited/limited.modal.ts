import {
  ActionRowBuilder,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
} from "discord.js";
import { buildCustomId } from "../../custom-id";

const SESSION_ID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export interface LimitedModalDefaults {
  itemName?: string;
  robloxUsername?: string;
}

export function isLimitedSessionId(value: string): boolean {
  return SESSION_ID_PATTERN.test(value);
}

export function buildLimitedOrderModal(sessionId?: string, defaults: LimitedModalDefaults = {}): ModalBuilder {
  const customId = sessionId
    ? buildCustomId("limited", "submit", sessionId)
    : buildCustomId("limited", "submit");

  const itemInput = new TextInputBuilder()
    .setCustomId("limited_item")
    .setLabel("Item Limited")
    .setPlaceholder("Jenis item Limited yang ingin dibeli")
    .setStyle(TextInputStyle.Short)
    .setRequired(true)
    .setMaxLength(200);

  const usernameInput = new TextInputBuilder()
    .setCustomId("roblox_username")
    .setLabel("Username Roblox")
    .setPlaceholder("Masukkan username Roblox Anda")
    .setStyle(TextInputStyle.Short)
    .setRequired(true)
    .setMaxLength(50);

  if (defaults.itemName) {
    itemInput.setValue(defaults.itemName.slice(0, 200));
  }

  if (defaults.robloxUsername) {
    usernameInput.setValue(defaults.robloxUsername.slice(0, 50));
  }

  return new ModalBuilder()
    .setCustomId(customId)
    .setTitle("ITEM LIMITED")
    .addComponents(
      new ActionRowBuilder<TextInputBuilder>().addComponents(itemInput),
      new ActionRowBuilder<TextInputBuilder>().addComponents(usernameInput),
    );
}

export function extractLimitedModalInput(modal: {
  fields: {
    getTextInputValue: (customId: string) => string;
  };
}): {
  itemName: string;
  robloxUsername: string;
} {
  return {
    itemName: modal.fields.getTextInputValue("limited_item"),
    robloxUsername: modal.fields.getTextInputValue("roblox_username"),
  };
}
