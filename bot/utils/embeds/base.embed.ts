import { EmbedBuilder, type ColorResolvable } from "discord.js";

export const EMBED_COLORS = {
  primary: 0x5865f2 as ColorResolvable,
  success: 0x57f287 as ColorResolvable,
  warning: 0xfee75c as ColorResolvable,
  error: 0xed4245 as ColorResolvable,
  info: 0xeb459e as ColorResolvable,
  gift: 0xe67e22 as ColorResolvable,
} as const;

export function createBaseEmbed(title: string, color: ColorResolvable = EMBED_COLORS.primary): EmbedBuilder {
  return new EmbedBuilder()
    .setColor(color)
    .setTitle(title)
    .setTimestamp()
    .setFooter({ text: "RizzBot • Gift In Game" });
}

export function createErrorEmbed(title: string, description: string): EmbedBuilder {
  return createBaseEmbed(title, EMBED_COLORS.error).setDescription(description);
}

export function createSuccessEmbed(title: string, description: string): EmbedBuilder {
  return createBaseEmbed(title, EMBED_COLORS.success).setDescription(description);
}

export function createWarningEmbed(title: string, description: string): EmbedBuilder {
  return createBaseEmbed(title, EMBED_COLORS.warning).setDescription(description);
}
