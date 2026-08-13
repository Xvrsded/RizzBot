import { MessageFlags, SlashCommandBuilder } from "discord.js";
import type { Command } from "../../types/command";
import { requireDashboardAccess } from "../../permissions/dashboard";
import { PermissionDeniedError } from "../../permissions/guards";
import { customerTierService } from "../../services/customer-tier.service";
import {
  buildSyncTierAccessDeniedEmbed,
  buildSyncTierFailedEmbed,
  buildSyncTierSuccessEmbed,
} from "../../utils/embeds/sync-tier.embed";
import { replyEmbedEphemeral } from "../../utils/reply";
import { createErrorEmbed } from "../../utils/embeds/base.embed";

const command: Command = {
  data: new SlashCommandBuilder()
    .setName("sync-tier")
    .setDescription("Sync customer tier based on total spend")
    .addUserOption((option) =>
      option
        .setName("user")
        .setDescription("Customer to sync")
        .setRequired(true)
    ),

  async execute(interaction) {
    if (!interaction.inGuild() || !interaction.guild) {
      await replyEmbedEphemeral(
        interaction,
        createErrorEmbed("❌ TERJADI KESALAHAN", "Command ini hanya dapat digunakan di dalam server."),
      );
      return;
    }

    try {
      requireDashboardAccess(interaction);
    } catch (error) {
      if (error instanceof PermissionDeniedError) {
        await replyEmbedEphemeral(interaction, buildSyncTierAccessDeniedEmbed());
        return;
      }
      throw error;
    }

    await interaction.deferReply({ flags: MessageFlags.Ephemeral });

    const targetUser = interaction.options.getUser("user", true);

    const result = await customerTierService.syncCustomerRoles(
      interaction.client,
      interaction.guild.id,
      targetUser.id,
    );

    if (!result) {
      await interaction.editReply({ embeds: [buildSyncTierFailedEmbed()] });
      return;
    }

    await interaction.editReply({
      embeds: [
        buildSyncTierSuccessEmbed(`<@${targetUser.id}>`, result),
      ],
    });
  },
};

export default command;
