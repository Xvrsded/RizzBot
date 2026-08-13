import { ModalBuilder, TextInputBuilder, TextInputStyle, ActionRowBuilder } from "discord.js";
import { buildCustomId } from "../../custom-id";

const USERNAME_INPUT_ID = "roblox_username";

export function buildCommunityCheckUsernameModal(): ModalBuilder {
  return new ModalBuilder()
    .setCustomId(buildCustomId("community", "check-submit"))
    .setTitle("Cek Eligibility Community")
    .addComponents(
      new ActionRowBuilder<TextInputBuilder>().addComponents(
        new TextInputBuilder()
          .setCustomId(USERNAME_INPUT_ID)
          .setLabel("Roblox Username")
          .setPlaceholder("Masukkan username Roblox Anda")
          .setStyle(TextInputStyle.Short)
          .setRequired(true)
          .setMaxLength(50),
      ),
    );
}

export function buildCommunityDmConfirmUsernameModal(communityId: string): ModalBuilder {
  return new ModalBuilder()
    .setCustomId(buildCustomId("community", "dm_submit", communityId))
    .setTitle("Konfirmasi Roblox Username")
    .addComponents(
      new ActionRowBuilder<TextInputBuilder>().addComponents(
        new TextInputBuilder()
          .setCustomId(USERNAME_INPUT_ID)
          .setLabel("Roblox Username")
          .setPlaceholder("Masukkan username Roblox Anda")
          .setStyle(TextInputStyle.Short)
          .setRequired(true)
          .setMaxLength(50),
      ),
    );
}

export function buildCommunityOrderUsernameModal(sessionId?: string): ModalBuilder {
  const customId = sessionId
    ? buildCustomId("community", "order-submit", sessionId)
    : buildCustomId("community", "order-submit");

  return new ModalBuilder()
    .setCustomId(customId)
    .setTitle("Order Community Payout")
    .addComponents(
      new ActionRowBuilder<TextInputBuilder>().addComponents(
        new TextInputBuilder()
          .setCustomId(USERNAME_INPUT_ID)
          .setLabel("Roblox Username")
          .setPlaceholder("Masukkan username Roblox Anda")
          .setStyle(TextInputStyle.Short)
          .setRequired(true)
          .setMaxLength(50),
      ),
    );
}

export function extractCommunityModalUsername(
  interaction: { fields: { getTextInputValue: (id: string) => string } },
): string {
  return interaction.fields.getTextInputValue(USERNAME_INPUT_ID).trim();
}

export function isCommunitySessionId(value: string): boolean {
  return value.length > 8;
}
