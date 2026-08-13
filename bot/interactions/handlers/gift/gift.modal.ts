import {
  ActionRowBuilder,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
} from "discord.js";
import { buildCustomId } from "../../custom-id";

export interface GiftModalDefaults {
  gameName?: string;
  gamepassName?: string;
  robuxAmount?: string;
  robloxUsername?: string;
}

export function buildGiftOrderModal(sessionId?: string, defaults: GiftModalDefaults = {}): ModalBuilder {
  const customId = sessionId ? buildCustomId("gift", "submit", sessionId) : buildCustomId("gift", "submit");

  const gameInput = new TextInputBuilder()
    .setCustomId("game_name")
    .setLabel("Nama Map / Link Game")
    .setPlaceholder("Masukkan nama game atau link game Roblox")
    .setStyle(TextInputStyle.Short)
    .setRequired(true)
    .setMaxLength(200);

  const gamepassInput = new TextInputBuilder()
    .setCustomId("gamepass_name")
    .setLabel("Nama Gamepass")
    .setPlaceholder("Contoh: VIP, x2 Money, Premium")
    .setStyle(TextInputStyle.Short)
    .setRequired(true)
    .setMaxLength(100);

  const robuxInput = new TextInputBuilder()
    .setCustomId("robux_amount")
    .setLabel("Jumlah Robux")
    .setPlaceholder("Contoh: 55")
    .setStyle(TextInputStyle.Short)
    .setRequired(true)
    .setMaxLength(10);

  const usernameInput = new TextInputBuilder()
    .setCustomId("roblox_username")
    .setLabel("Roblox Username")
    .setPlaceholder("Masukkan username Roblox penerima")
    .setStyle(TextInputStyle.Short)
    .setRequired(true)
    .setMaxLength(50);

  if (defaults.gameName) {
    gameInput.setValue(defaults.gameName.slice(0, 200));
  }

  if (defaults.gamepassName) {
    gamepassInput.setValue(defaults.gamepassName.slice(0, 100));
  }

  if (defaults.robuxAmount) {
    robuxInput.setValue(defaults.robuxAmount.slice(0, 10));
  }

  if (defaults.robloxUsername) {
    usernameInput.setValue(defaults.robloxUsername.slice(0, 50));
  }

  return new ModalBuilder()
    .setCustomId(customId)
    .setTitle(sessionId ? "Edit Pesanan Gift In Game" : "Pesanan Gift In Game")
    .addComponents(
      new ActionRowBuilder<TextInputBuilder>().addComponents(gameInput),
      new ActionRowBuilder<TextInputBuilder>().addComponents(gamepassInput),
      new ActionRowBuilder<TextInputBuilder>().addComponents(robuxInput),
      new ActionRowBuilder<TextInputBuilder>().addComponents(usernameInput),
    );
}

export function extractGiftModalInput(modal: {
  fields: {
    getTextInputValue: (customId: string) => string;
  };
}): {
  gameName: string;
  gamepassName: string;
  robuxAmountRaw: string;
  robloxUsername: string;
} {
  return {
    gameName: modal.fields.getTextInputValue("game_name"),
    gamepassName: modal.fields.getTextInputValue("gamepass_name"),
    robuxAmountRaw: modal.fields.getTextInputValue("robux_amount"),
    robloxUsername: modal.fields.getTextInputValue("roblox_username"),
  };
}
