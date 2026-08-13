import {
  ChannelType,
  PermissionFlagsBits,
  SlashCommandBuilder,
} from "discord.js";
import type { Command } from "../../types/command";
import { requireAdmin } from "../../permissions/guards";
import { guildConfigService } from "../../services/guild-config.service";
import { buildTicketConfigSuccessEmbed } from "../../utils/embeds/gift-in-game.embed";
import { replyEmbedEphemeral } from "../../utils/reply";
import { createErrorEmbed } from "../../utils/embeds/base.embed";
import { logger } from "../../../shared/logger";

const command: Command = {
  data: new SlashCommandBuilder()
    .setName("ticket")
    .setDescription("Konfigurasi sistem ticket")
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .addSubcommand((sub) =>
      sub
        .setName("setup")
        .setDescription("Atur kategori channel untuk ticket pesanan")
        .addChannelOption((option) =>
          option
            .setName("category")
            .setDescription("Kategori Discord tempat ticket akan dibuat")
            .addChannelTypes(ChannelType.GuildCategory)
            .setRequired(true),
        ),
    ),

  async execute(interaction) {
    if (!interaction.inGuild() || !interaction.guild) {
      await replyEmbedEphemeral(
        interaction,
        createErrorEmbed("❌ TERJADI KESALAHAN", "Command ini hanya dapat digunakan di dalam server."),
      );
      return;
    }

    if (interaction.options.getSubcommand() !== "setup") {
      await replyEmbedEphemeral(
        interaction,
        createErrorEmbed("❌ TERJADI KESALAHAN", "Subcommand tidak dikenali."),
      );
      return;
    }

    await requireAdmin(interaction, interaction.guild.id);

    const category = interaction.options.getChannel("category", true);

    if (category.type !== ChannelType.GuildCategory) {
      await replyEmbedEphemeral(
        interaction,
        createErrorEmbed("❌ TERJADI KESALAHAN", "Channel yang dipilih harus berupa kategori."),
      );
      return;
    }

    const config = await guildConfigService.upsertGuildConfig(interaction.guild.id, {
      guildName: interaction.guild.name,
      ticketCategoryId: category.id,
    });

    logger.info(
      `Ticket category configured for guild ${interaction.guild.id}: ${category.id} (${category.name})`,
    );

    await replyEmbedEphemeral(
      interaction,
      buildTicketConfigSuccessEmbed(`📁 ${config.ticketCategoryId === category.id ? category.name : category.name}`),
    );
  },
};

export default command;
