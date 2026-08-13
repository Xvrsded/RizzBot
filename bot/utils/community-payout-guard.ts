import type { RepliableInteraction } from "discord.js";
import { COMMUNITY_PAYOUT_ELIGIBLE_ROLE_ID } from "../../shared/community-payout";
import { serviceStatusService } from "../services/service-status.service";
import { buildCommunityOrderLockedEmbed, buildCommunityPayoutClosedEmbed } from "./embeds/community-payout.embed";
import { replyEmbedEphemeral } from "./reply";

export async function guardCommunityPayoutOrderAvailable(
  interaction: RepliableInteraction,
  guildId: string,
): Promise<boolean> {
  const enabled = await serviceStatusService.isEnabled(guildId, "communityPayout");

  if (enabled === null) {
    await replyEmbedEphemeral(interaction, buildCommunityPayoutClosedEmbed());
    return false;
  }

  if (!enabled) {
    await replyEmbedEphemeral(interaction, buildCommunityPayoutClosedEmbed());
    return false;
  }

  return true;
}

export async function guardCommunityPayoutEligibleRole(
  interaction: RepliableInteraction,
): Promise<boolean> {
  if (!interaction.inGuild() || !interaction.member || !("roles" in interaction.member)) {
    await replyEmbedEphemeral(interaction, buildCommunityOrderLockedEmbed());
    return false;
  }

  const roleIds =
    "cache" in interaction.member.roles
      ? [...interaction.member.roles.cache.keys()]
      : interaction.member.roles;

  if (!roleIds.includes(COMMUNITY_PAYOUT_ELIGIBLE_ROLE_ID)) {
    await replyEmbedEphemeral(interaction, buildCommunityOrderLockedEmbed());
    return false;
  }

  return true;
}
