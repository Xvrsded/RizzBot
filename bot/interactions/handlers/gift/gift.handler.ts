import {
  MessageFlags,
  type ButtonInteraction,
  type InteractionEditReplyOptions,
  type ModalSubmitInteraction,
} from "discord.js";
import type { ParsedCustomId } from "../../custom-id";
import { ProductType } from "../../../../shared/products";
import { guildConfigService } from "../../../services/guild-config.service";
import {
  giftOrderSessionService,
  parseRobuxAmount,
  validateGiftOrderForm,
} from "../../../services/gift-order-session.service";
import { lookupRobloxUser, RobloxApiError, RobloxUserNotFoundError } from "../../../services/roblox.service";
import { ticketService } from "../../../services/ticket.service";
import { TicketError } from "../../../services/ticket.errors";
import {
  buildAlreadyCancelledEmbed,
  buildAlreadyConfirmedEmbed,
  buildGiftCancelledEmbed,
  buildGiftOrderPreviewEmbed,
  buildGiftTicketSuccessEmbed,
  buildDuplicateTicketEmbed,
  buildOrderExpiredEmbed,
  buildOrderPreviewRow,
  buildSessionExpiredEmbed,
  buildTicketErrorEmbed,
  buildUsernameNotFoundEmbed,
  buildUsernameNotFoundRow,
  buildValidationErrorEmbed,
  buildDismissedEmbed,
} from "../../../utils/embeds/gift-in-game.embed";
import {
  buildActiveTicketWarningEmbed,
  buildBulkChoiceRow,
} from "../../../utils/embeds/bulk-ticket.embed";
import { replyEmbedEphemeral } from "../../../utils/reply";
import { buildGiftOrderModal, extractGiftModalInput } from "./gift.modal";
import { createErrorEmbed } from "../../../utils/embeds/base.embed";
import { guardServiceOrderAvailable } from "../../../utils/service-order-guard";
import { logger } from "../../../../shared/logger";

function sessionToEmbedData(session: {
  orderCode: string;
  gameName: string;
  gamepassName: string;
  robuxAmount: number;
  rawPrice: number;
  finalPrice: number;
  robloxUsername: string;
  robloxDisplayName: string;
  robloxAvatarUrl: string | null;
}) {
  return {
    orderCode: session.orderCode,
    gameName: session.gameName,
    gamepassName: session.gamepassName,
    robuxAmount: session.robuxAmount,
    rawPrice: session.rawPrice,
    finalPrice: session.finalPrice,
    robloxUsername: session.robloxUsername,
    robloxDisplayName: session.robloxDisplayName,
    robloxAvatarUrl: session.robloxAvatarUrl,
  };
}

async function acknowledgePreviewInteraction(interaction: ButtonInteraction): Promise<void> {
  if (interaction.deferred || interaction.replied) {
    return;
  }

  await interaction.deferUpdate();
}

async function editPreviewInteraction(
  interaction: ButtonInteraction,
  payload: InteractionEditReplyOptions,
): Promise<void> {
  await interaction.editReply(payload);
}

async function processGiftOrderForm(
  interaction: ModalSubmitInteraction,
  sessionId?: string,
): Promise<void> {
  if (!interaction.inGuild() || !interaction.guild) {
    await replyEmbedEphemeral(
      interaction,
      createErrorEmbed("❌ TERJADI KESALAHAN", "Pesanan hanya dapat dibuat di dalam server."),
    );
    return;
  }

  const raw = extractGiftModalInput(interaction);
  const robuxAmount = parseRobuxAmount(raw.robuxAmountRaw);

  const validationError = validateGiftOrderForm({
    gameName: raw.gameName,
    gamepassName: raw.gamepassName,
    robuxAmount: robuxAmount ?? 0,
    robloxUsername: raw.robloxUsername,
  });

  if (validationError || robuxAmount === null) {
    await replyEmbedEphemeral(
      interaction,
      buildValidationErrorEmbed(validationError ?? "Jumlah Robux harus berupa angka bulat positif."),
    );
    return;
  }

  await interaction.deferReply({ flags: MessageFlags.Ephemeral });

  let robloxUser;

  try {
    robloxUser = await lookupRobloxUser(raw.robloxUsername);
  } catch (error) {
    if (error instanceof RobloxUserNotFoundError) {
      await interaction.editReply({
        embeds: [buildUsernameNotFoundEmbed(error.username)],
        components: [buildUsernameNotFoundRow()],
      });
      return;
    }

    if (error instanceof RobloxApiError && error.status === 429) {
      await interaction.editReply({
        embeds: [
          createErrorEmbed(
            "⏳ ROBLOX SEDANG SIBUK",
            "Roblox API sedang rate limit. Silakan tunggu beberapa detik lalu coba submit form lagi.",
          ),
        ],
      });
      return;
    }

    logger.error("Roblox lookup failed", error);
    await interaction.editReply({
      embeds: [
        createErrorEmbed(
          "❌ TERJADI KESALAHAN",
          "Gagal menghubungi Roblox API. Silakan coba lagi dalam beberapa saat.",
        ),
      ],
    });
    return;
  }

  const payload = {
    guildId: interaction.guild.id,
    userId: interaction.user.id,
    gameName: raw.gameName,
    gamepassName: raw.gamepassName,
    robuxAmount,
    robloxUsername: raw.robloxUsername,
    robloxUser,
  };

  const session = sessionId
    ? await giftOrderSessionService.updateSession(sessionId, payload)
    : await giftOrderSessionService.createSession(payload);

  if (!session) {
    await interaction.editReply({
      embeds: [createErrorEmbed("❌ TERJADI KESALAHAN", "Sesi pesanan tidak ditemukan atau sudah tidak valid.")],
    });
    return;
  }

  const embed = buildGiftOrderPreviewEmbed(sessionToEmbedData(session));

  await interaction.editReply({
    embeds: [embed],
    components: [buildOrderPreviewRow(session.sessionId)],
  });
}

export async function handleGiftButton(
  interaction: ButtonInteraction,
  parsed: ParsedCustomId,
): Promise<void> {
  if (!interaction.inGuild() || !interaction.guild) {
    await replyEmbedEphemeral(
      interaction,
      createErrorEmbed("❌ TERJADI KESALAHAN", "Interaksi ini hanya tersedia di dalam server."),
    );
    return;
  }

  switch (parsed.action) {
    case "order": {
      if (!(await guardServiceOrderAvailable(interaction, interaction.guild.id, "giftInGame"))) {
        return;
      }

      await interaction.showModal(buildGiftOrderModal());
      return;
    }

    case "dismiss": {
      await replyEmbedEphemeral(interaction, buildDismissedEmbed());
      return;
    }

    case "edit": {
      if (!parsed.id) {
        await interaction.showModal(buildGiftOrderModal());
        return;
      }

      const session = await giftOrderSessionService.getSession(parsed.id);

      if (!session) {
        await replyEmbedEphemeral(
          interaction,
          createErrorEmbed("❌ TERJADI KESALAHAN", "Sesi pesanan tidak ditemukan."),
        );
        return;
      }

      const usability = giftOrderSessionService.assertSessionUsable(session, interaction.user.id);

      if (usability === "expired") {
        await replyEmbedEphemeral(interaction, buildOrderExpiredEmbed());
        return;
      }

      if (usability !== "ok") {
        await replyEmbedEphemeral(
          interaction,
          createErrorEmbed("❌ TERJADI KESALAHAN", "Sesi pesanan tidak dapat diedit."),
        );
        return;
      }

      await interaction.showModal(
        buildGiftOrderModal(session.sessionId, {
          gameName: session.gameName,
          gamepassName: session.gamepassName,
          robuxAmount: String(session.robuxAmount),
          robloxUsername: session.robloxUsername,
        }),
      );
      return;
    }

    case "cancel": {
      if (!parsed.id) {
        await replyEmbedEphemeral(
          interaction,
          createErrorEmbed("❌ TERJADI KESALAHAN", "Sesi pesanan tidak valid."),
        );
        return;
      }

      await acknowledgePreviewInteraction(interaction);

      const session = await giftOrderSessionService.getSession(parsed.id);

      if (!session || session.userId !== interaction.user.id) {
        await editPreviewInteraction(interaction, {
          embeds: [createErrorEmbed("❌ TERJADI KESALAHAN", "Sesi pesanan tidak ditemukan.")],
        });
        return;
      }

      const usability = giftOrderSessionService.assertSessionUsable(session, interaction.user.id);

      if (usability === "expired") {
        await editPreviewInteraction(interaction, {
          embeds: [buildOrderExpiredEmbed()],
          components: [buildOrderPreviewRow(session.sessionId, true)],
        });
        return;
      }

      if (usability !== "ok") {
        await editPreviewInteraction(interaction, {
          embeds: [buildGiftCancelledEmbed(session.orderCode)],
          components: [buildOrderPreviewRow(session.sessionId, true)],
        });
        return;
      }

      await giftOrderSessionService.cancelSession(session.sessionId);
      await editPreviewInteraction(interaction, {
        embeds: [buildGiftCancelledEmbed(session.orderCode)],
        components: [buildOrderPreviewRow(session.sessionId, true)],
      });
      return;
    }

    case "confirm": {
      if (!parsed.id) {
        await replyEmbedEphemeral(
          interaction,
          createErrorEmbed("❌ TERJADI KESALAHAN", "Sesi pesanan tidak valid."),
        );
        return;
      }

      await acknowledgePreviewInteraction(interaction);

      const session = await giftOrderSessionService.getSession(parsed.id);

      if (!session || session.userId !== interaction.user.id) {
        await editPreviewInteraction(interaction, {
          embeds: [createErrorEmbed("❌ TERJADI KESALAHAN", "Sesi pesanan tidak ditemukan.")],
        });
        return;
      }

      const usability = giftOrderSessionService.assertSessionUsable(session, interaction.user.id);

      if (usability === "expired") {
        await editPreviewInteraction(interaction, {
          embeds: [buildOrderExpiredEmbed()],
          components: [buildOrderPreviewRow(session.sessionId, true)],
        });
        return;
      }

      if (usability === "cancelled") {
        await editPreviewInteraction(interaction, {
          embeds: [buildAlreadyCancelledEmbed(session.orderCode)],
          components: [buildOrderPreviewRow(session.sessionId, true)],
        });
        return;
      }

      if (usability === "confirmed") {
        const existingTicket = await ticketService.findOpenGiftTicket(session.guildId, session.userId);
        const mention = existingTicket ? `<#${existingTicket.channelId}>` : "ticket Anda";
        await editPreviewInteraction(interaction, {
          embeds: [buildAlreadyConfirmedEmbed(session.orderCode, mention)],
          components: [buildOrderPreviewRow(session.sessionId, true)],
        });
        return;
      }

      if (usability !== "ok") {
        await editPreviewInteraction(interaction, {
          embeds: [createErrorEmbed("❌ TERJADI KESALAHAN", "Sesi pesanan tidak dapat dikonfirmasi.")],
        });
        return;
      }

      const openTicket = await ticketService.findOpenTicketByUser(session.guildId, session.userId);

      if (openTicket) {
        await editPreviewInteraction(interaction, {
          embeds: [buildActiveTicketWarningEmbed(openTicket, ProductType.GIFT_IN_GAME)],
          components: [buildBulkChoiceRow(session.sessionId)],
        });
        return;
      }

      const config = await guildConfigService.getOrCreateGuildConfig(
        interaction.guild.id,
        interaction.guild.name,
      );

      try {
        const confirmedSession = await giftOrderSessionService.confirmSession(session.sessionId);

        if (!confirmedSession) {
          await editPreviewInteraction(interaction, {
            embeds: [createErrorEmbed("❌ TERJADI KESALAHAN", "Gagal mengonfirmasi pesanan.")],
          });
          return;
        }

        const ticket = await ticketService.createGiftInGameTicket(
          interaction.guild,
          config,
          confirmedSession,
          interaction.user.id,
        );

        await editPreviewInteraction(interaction, {
          embeds: [buildGiftTicketSuccessEmbed(confirmedSession.orderCode, ticket.channelId)],
          components: [buildOrderPreviewRow(confirmedSession.sessionId, true)],
        });

        logger.order(
          `Gift In Game order ${confirmedSession.orderCode} confirmed by ${interaction.user.tag} → ticket ${ticket.ticketId}`,
        );
      } catch (error) {
        if (error instanceof TicketError) {
          logger.error(`Ticket creation failed [${error.code}] for order ${session.orderCode}`, error.cause ?? error);
          await editPreviewInteraction(interaction, {
            embeds: [buildTicketErrorEmbed(error.code)],
          });
          return;
        }

        logger.error(`Unexpected ticket creation failure for order ${session.orderCode}`, error);
        await editPreviewInteraction(interaction, {
          embeds: [buildTicketErrorEmbed("TICKET_CREATE_FAILED")],
        });
      }

      return;
    }

    default: {
      await replyEmbedEphemeral(
        interaction,
        createErrorEmbed("❌ TERJADI KESALAHAN", "Aksi tidak dikenali."),
      );
    }
  }
}

export async function handleGiftModal(
  interaction: ModalSubmitInteraction,
  parsed: ParsedCustomId,
): Promise<void> {
  if (parsed.action !== "submit") {
    await replyEmbedEphemeral(
      interaction,
      createErrorEmbed("❌ TERJADI KESALAHAN", "Form tidak dikenali."),
    );
    return;
  }

  if (parsed.id) {
    const session = await giftOrderSessionService.getSession(parsed.id);

    if (!session || session.userId !== interaction.user.id) {
      await replyEmbedEphemeral(
        interaction,
        createErrorEmbed("❌ TERJADI KESALAHAN", "Sesi pesanan tidak ditemukan."),
      );
      return;
    }

    const usability = giftOrderSessionService.assertSessionUsable(session, interaction.user.id);

    if (usability === "expired") {
      await replyEmbedEphemeral(interaction, buildOrderExpiredEmbed());
      return;
    }

    if (usability !== "ok") {
      await replyEmbedEphemeral(
        interaction,
        createErrorEmbed("❌ TERJADI KESALAHAN", "Sesi pesanan tidak dapat diperbarui."),
      );
      return;
    }
  }

  await processGiftOrderForm(interaction, parsed.id);
}
