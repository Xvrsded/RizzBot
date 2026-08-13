import type { RepliableInteraction } from "discord.js";
import {
  SERVICE_FOOTERS,
  SERVICE_LABELS,
  type ServiceStatusKey,
} from "../../shared/service-status";
import { serviceStatusService } from "../services/service-status.service";
import {
  buildServiceClosedEmbed,
  buildServiceUnavailableEmbed,
} from "./embeds/service-status.embed";
import { replyEmbedEphemeral } from "./reply";

export async function guardServiceOrderAvailable(
  interaction: RepliableInteraction,
  guildId: string,
  key: ServiceStatusKey,
): Promise<boolean> {
  const enabled = await serviceStatusService.isEnabled(guildId, key);

  if (enabled === null) {
    await replyEmbedEphemeral(interaction, buildServiceUnavailableEmbed());
    return false;
  }

  if (!enabled) {
    await replyEmbedEphemeral(
      interaction,
      buildServiceClosedEmbed(SERVICE_LABELS[key], SERVICE_FOOTERS[key]),
    );
    return false;
  }

  return true;
}
