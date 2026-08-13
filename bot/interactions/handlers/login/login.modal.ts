import {
  ActionRowBuilder,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
} from "discord.js";
import { buildCustomId } from "../../custom-id";

const SESSION_ID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function isLoginSessionId(value: string): boolean {
  return SESSION_ID_PATTERN.test(value);
}

export function buildLoginUsernameModal(targetId: string, defaultUsername = ""): ModalBuilder {
  const customId = buildCustomId("login", "submit", targetId);

  const usernameInput = new TextInputBuilder()
    .setCustomId("roblox_username")
    .setLabel("Username Roblox")
    .setPlaceholder("Masukkan username Roblox Anda")
    .setStyle(TextInputStyle.Short)
    .setRequired(true)
    .setMaxLength(50);

  if (defaultUsername) {
    usernameInput.setValue(defaultUsername.slice(0, 50));
  }

  return new ModalBuilder()
    .setCustomId(customId)
    .setTitle("USERNAME ROBLOX")
    .addComponents(new ActionRowBuilder<TextInputBuilder>().addComponents(usernameInput));
}

export function extractLoginModalUsername(modal: {
  fields: {
    getTextInputValue: (customId: string) => string;
  };
}): string {
  return modal.fields.getTextInputValue("roblox_username");
}
