import { MessageFlags, SlashCommandBuilder } from "discord.js";
import type { Command } from "../../types/command";
import { requireDashboardAccess } from "../../permissions/dashboard";
import { PermissionDeniedError } from "../../permissions/guards";
import { leaderboardService } from "../../services/leaderboard.service";
import {
  buildLeaderboardAccessDeniedEmbed,
  buildLeaderboardCleanupEmbed,
  buildLeaderboardCleanupFailedEmbed,
} from "../../utils/embeds/leaderboard.embed";
import { replyEmbedEphemeral } from "../../utils/reply";
import { createErrorEmbed } from "../../utils/embeds/base.embed";
import { logger } from "../../../shared/logger";

const command: Command = {
  data: new SlashCommandBuilder()
    .setName("leaderboard")
    .setDescription("Maintenance leaderboard RizzStore")
    .addSubcommand((sub) =>
      sub
        .setName("cleanup")
        .setDescription("Hapus semua pesan user di channel leaderboard (pertahankan pesan bot)"),
    ),

  async execute(interaction) {
    if (!interaction.inGuild() || !interaction.guild) {
      await replyEmbedEphemeral(
        interaction,
        createErrorEmbed("❌ TERJADI KESALAHAN", "Command ini hanya dapat digunakan di dalam server."),
      );
      return;
    }

    if (interaction.options.getSubcommand() !== "cleanup") {
      await replyEmbedEphemeral(
        interaction,
        createErrorEmbed("❌ TERJADI KESALAHAN", "Subcommand tidak dikenali."),
      );
      return;
    }

    try {
      requireDashboardAccess(interaction);
    } catch (error) {
      if (error instanceof PermissionDeniedError) {
        await replyEmbedEphemeral(interaction, buildLeaderboardAccessDeniedEmbed());
        return;
      }

      throw error;
    }

    await interaction.deferReply({ flags: MessageFlags.Ephemeral });

    const result = await leaderboardService.clearUserMessagesFromLeaderboardChannel(interaction.client);

    if (!result) {
      await interaction.editReply({ embeds: [buildLeaderboardCleanupFailedEmbed()] });
      return;
    }

    await interaction.editReply({
      embeds: [
        buildLeaderboardCleanupEmbed({
          deletedUserMessages: result.deletedUserMessages,
          keptBotMessages: result.keptBotMessages,
          channelLabel: `#${result.channelName}`,
        }),
      ],
    });

    logger.info(
      `[LEADERBOARD] Cleanup by ${interaction.user.id}: deleted=${result.deletedUserMessages}, kept=${result.keptBotMessages}`,
    );
  },
};

export default command;
