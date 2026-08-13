import { type ButtonInteraction } from "discord.js";
import type { ParsedCustomId } from "../../custom-id";
import { requireDashboardAccess } from "../../../permissions/dashboard";
import { PermissionDeniedError } from "../../../permissions/guards";
import { leaderboardService } from "../../../services/leaderboard.service";
import {
  buildLeaderboardAccessDeniedEmbed,
  buildLeaderboardRefreshFailedEmbed,
  buildLeaderboardRefreshedEmbed,
} from "../../../utils/embeds/leaderboard.embed";
import { replyEmbedEphemeral } from "../../../utils/reply";
import { logger } from "../../../../shared/logger";

export async function handleLeaderboardButton(
  interaction: ButtonInteraction,
  parsed: ParsedCustomId,
): Promise<void> {
  if (!interaction.inGuild() || parsed.action !== "refresh") {
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

  await interaction.deferUpdate();

  const refreshed = await leaderboardService.refreshLeaderboard(interaction.client);

  if (!refreshed) {
    await interaction.followUp({
      embeds: [buildLeaderboardRefreshFailedEmbed()],
      ephemeral: true,
    });
    return;
  }

  await interaction.followUp({
    embeds: [buildLeaderboardRefreshedEmbed()],
    ephemeral: true,
  });

  logger.info(`[LEADERBOARD] Manual refresh by ${interaction.user.id}`);
}
