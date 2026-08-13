import { SlashCommandBuilder } from "discord.js";
import type { Command } from "../../types/command";
import { createSuccessEmbed } from "../../utils/embeds/base.embed";

const command: Command = {
  data: new SlashCommandBuilder()
    .setName("ping")
    .setDescription("Check if the bot is responsive"),

  async execute(interaction) {
    await interaction.reply({
      embeds: [createSuccessEmbed("🏓 Pong!", "Bot is responsive and online.")],
    });
  },
};

export default command;
