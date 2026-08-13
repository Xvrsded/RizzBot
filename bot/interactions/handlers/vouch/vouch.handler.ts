import { type ButtonInteraction, type ModalSubmitInteraction } from "discord.js";
import type { ParsedCustomId } from "../../custom-id";
import { VouchSessionStatus } from "../../../../database/models/vouch-session.model";
import { vouchSessionRepository } from "../../../../database/repositories/vouch-session.repository";
import { vouchService } from "../../../services/vouch.service";
import {
  buildVouchAlreadySubmittedEmbed,
  buildVouchEmptyReviewEmbed,
  buildVouchInvalidRatingEmbed,
  buildVouchNotFoundEmbed,
  buildVouchSuccessEmbed,
  buildVouchUnauthorizedEmbed,
} from "../../../utils/embeds/vouch.embed";
import { replyEmbedEphemeral } from "../../../utils/reply";
import {
  buildVouchSubmitModal,
  extractVouchModalInput,
  parseVouchRating,
} from "./vouch.modal";
import { logger } from "../../../../shared/logger";

export async function handleVouchButton(
  interaction: ButtonInteraction,
  parsed: ParsedCustomId,
): Promise<void> {
  if (parsed.action !== "open" || !parsed.id) {
    await replyEmbedEphemeral(
      interaction,
      buildVouchNotFoundEmbed(),
    );
    return;
  }

  const vouchSession = await vouchSessionRepository.findByVoucherId(parsed.id);

  if (!vouchSession) {
    await replyEmbedEphemeral(interaction, buildVouchNotFoundEmbed());
    return;
  }

  if (vouchSession.customerId !== interaction.user.id) {
    await replyEmbedEphemeral(interaction, buildVouchUnauthorizedEmbed());
    return;
  }

  if (vouchSession.status === VouchSessionStatus.SUBMITTED) {
    await replyEmbedEphemeral(interaction, buildVouchAlreadySubmittedEmbed());
    return;
  }

  await interaction.showModal(buildVouchSubmitModal(vouchSession.voucherId));
}

export async function handleVouchModal(
  interaction: ModalSubmitInteraction,
  parsed: ParsedCustomId,
): Promise<void> {
  if (parsed.action !== "submit" || !parsed.id) {
    await replyEmbedEphemeral(interaction, buildVouchNotFoundEmbed());
    return;
  }

  const vouchSession = await vouchSessionRepository.findByVoucherId(parsed.id);

  if (!vouchSession) {
    await replyEmbedEphemeral(interaction, buildVouchNotFoundEmbed());
    return;
  }

  if (vouchSession.customerId !== interaction.user.id) {
    await replyEmbedEphemeral(interaction, buildVouchUnauthorizedEmbed());
    return;
  }

  if (vouchSession.status === VouchSessionStatus.SUBMITTED) {
    await replyEmbedEphemeral(interaction, buildVouchAlreadySubmittedEmbed());
    return;
  }

  const { ratingRaw, review } = extractVouchModalInput(interaction);
  const rating = parseVouchRating(ratingRaw);

  if (rating === null) {
    await replyEmbedEphemeral(interaction, buildVouchInvalidRatingEmbed());
    return;
  }

  if (!review.trim()) {
    await replyEmbedEphemeral(interaction, buildVouchEmptyReviewEmbed());
    return;
  }

  const updatedSession = await vouchSessionRepository.submitVouch(
    vouchSession.voucherId,
    rating,
    review.trim(),
  );

  if (!updatedSession) {
    await replyEmbedEphemeral(interaction, buildVouchAlreadySubmittedEmbed());
    return;
  }

  try {
    await vouchService.publishVouch(interaction.client, updatedSession, interaction.user.id);
    await replyEmbedEphemeral(interaction, buildVouchSuccessEmbed(rating));
    logger.info(
      `[VOUCH] Customer ${interaction.user.id} submitted vouch for order ${updatedSession.orderCode} (rating=${rating})`,
    );
  } catch (error) {
    logger.error(`[VOUCH] Failed to publish vouch for ${updatedSession.voucherId}`, error);
    await replyEmbedEphemeral(interaction, buildVouchSuccessEmbed(rating));
  }
}
