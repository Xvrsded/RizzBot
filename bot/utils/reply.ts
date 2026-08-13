import {
  EmbedBuilder,
  MessageFlags,
  type InteractionEditReplyOptions,
  type InteractionReplyOptions,
  type RepliableInteraction,
} from "discord.js";

function isAlreadyAcknowledgedError(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    (error.code === 40060 || error.code === 10062)
  );
}

export async function replyEmbed(
  interaction: RepliableInteraction,
  embed: EmbedBuilder,
  options: Omit<InteractionReplyOptions, "embeds"> = {},
): Promise<void> {
  const payload: InteractionReplyOptions = {
    embeds: [embed],
    ...options,
  };

  if (interaction.replied || interaction.deferred) {
    await interaction.followUp(payload);
    return;
  }

  try {
    await interaction.reply(payload);
  } catch (error) {
    if (isAlreadyAcknowledgedError(error)) {
      await interaction.followUp(payload).catch(() => undefined);
      return;
    }

    throw error;
  }
}

export async function replyEmbedEphemeral(
  interaction: RepliableInteraction,
  embed: EmbedBuilder,
  options: Omit<InteractionReplyOptions, "embeds" | "flags"> = {},
): Promise<void> {
  await replyEmbed(interaction, embed, {
    ...options,
    flags: MessageFlags.Ephemeral,
  });
}

export async function editReplyEmbed(
  interaction: RepliableInteraction,
  embed: EmbedBuilder,
  options: Omit<InteractionEditReplyOptions, "embeds"> = {},
): Promise<void> {
  await interaction.editReply({
    embeds: [embed],
    ...options,
  });
}

export async function followUpEmbedEphemeral(
  interaction: RepliableInteraction,
  embed: EmbedBuilder,
): Promise<void> {
  await interaction.followUp({
    embeds: [embed],
    flags: MessageFlags.Ephemeral,
  });
}
