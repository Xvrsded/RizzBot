import type { RepliableInteraction } from "discord.js";
import { serviceStatusService } from "../services/service-status.service";
import { buildMiddlemanClosedEmbed, buildServiceUnavailableEmbed } from "./embeds/middleman.embed";
import { replyEmbedEphemeral } from "./reply";

export async function guardMiddlemanOrderAvailable(
  interaction: RepliableInteraction,
  guildId: string,
): Promise<boolean> {
  const enabled = await serviceStatusService.isEnabled(guildId, "mmReber");

  if (enabled === null) {
    await replyEmbedEphemeral(interaction, buildServiceUnavailableEmbed());
    return false;
  }

  if (!enabled) {
    await replyEmbedEphemeral(interaction, buildMiddlemanClosedEmbed());
    return false;
  }

  return true;
}
