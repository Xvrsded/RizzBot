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
  limitedOrderSessionService,
  validateLimitedItemInput,
  validateLimitedUsernameInput,
} from "../../../services/limited-order-session.service";
import { lookupRobloxUser, RobloxApiError, RobloxUserNotFoundError } from "../../../services/roblox.service";
import { ticketService } from "../../../services/ticket.service";
import { TicketError } from "../../../services/ticket.errors";
import {
  buildLimitedAlreadyCancelledEmbed,
  buildLimitedAlreadyConfirmedEmbed,
  buildLimitedDuplicateTicketEmbed,
  buildLimitedOrderCancelledEmbed,
  buildLimitedOrderExpiredEmbed,
  buildLimitedOrderPreviewEmbed,
  buildLimitedOrderPreviewRow,
  buildLimitedTicketErrorEmbed,
  buildLimitedTicketSuccessEmbed,
  buildLimitedUsernameNotFoundEmbed,
  buildLimitedValidationErrorEmbed,
  createLimitedErrorEmbed,
  sessionToLimitedEmbedData,
} from "../../../utils/embeds/limited.embed";
import { replyEmbedEphemeral } from "../../../utils/reply";
import {
  buildLimitedOrderModal,
  extractLimitedModalInput,
  isLimitedSessionId,
} from "./limited.modal";
import {
  buildActiveTicketWarningEmbed,
  buildBulkChoiceRow,
} from "../../../utils/embeds/bulk-ticket.embed";
import { guardServiceOrderAvailable } from "../../../utils/service-order-guard";
import { logger } from "../../../../shared/logger";

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

async function processLimitedOrderForm(
  interaction: ModalSubmitInteraction,
  targetId?: string,
): Promise<void> {
  const { itemName, robloxUsername } = extractLimitedModalInput(interaction);
  logger.info(`[LIMITED] order modal submitted item=${itemName} username=${robloxUsername} targetId=${targetId ?? "new"}`);

  if (!interaction.inGuild() || !interaction.guild) {
    await replyEmbedEphemeral(
      interaction,
      createLimitedErrorEmbed("❌ TERJADI KESALAHAN", "Pesanan hanya dapat dibuat di dalam server."),
    );
    return;
  }

  const itemError = validateLimitedItemInput(itemName);
  if (itemError) {
    await replyEmbedEphemeral(interaction, buildLimitedValidationErrorEmbed(itemError));
    return;
  }

  const usernameError = validateLimitedUsernameInput(robloxUsername);
  if (usernameError) {
    await replyEmbedEphemeral(interaction, buildLimitedValidationErrorEmbed(usernameError));
    return;
  }

  let sessionId: string | undefined;

  if (targetId && isLimitedSessionId(targetId)) {
    sessionId = targetId;
    const existingSession = await limitedOrderSessionService.getSession(sessionId);

    if (!existingSession || existingSession.userId !== interaction.user.id) {
      await replyEmbedEphemeral(
        interaction,
        createLimitedErrorEmbed("❌ TERJADI KESALAHAN", "Sesi pesanan tidak ditemukan."),
      );
      return;
    }

    const usability = limitedOrderSessionService.assertSessionUsable(existingSession, interaction.user.id);

    if (usability !== "ok") {
      await replyEmbedEphemeral(
        interaction,
        createLimitedErrorEmbed("❌ TERJADI KESALAHAN", "Sesi pesanan tidak dapat diperbarui."),
      );
      return;
    }
  }

  await interaction.deferReply({ flags: MessageFlags.Ephemeral });

  let robloxUser;

  try {
    robloxUser = await lookupRobloxUser(robloxUsername);
  } catch (error) {
    if (error instanceof RobloxUserNotFoundError) {
      await interaction.editReply({
        embeds: [buildLimitedUsernameNotFoundEmbed(error.username)],
      });
      return;
    }

    if (error instanceof RobloxApiError && error.status === 429) {
      await interaction.editReply({
        embeds: [
          createLimitedErrorEmbed(
            "⏳ ROBLOX SEDANG SIBUK",
            "Roblox API sedang rate limit. Silakan tunggu beberapa detik lalu coba submit form lagi.",
          ),
        ],
      });
      return;
    }

    logger.error("Roblox lookup failed for limited order", error);
    await interaction.editReply({
      embeds: [
        createLimitedErrorEmbed(
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
    itemName,
    robloxUsername,
    robloxUser,
  };

  const session = sessionId
    ? await limitedOrderSessionService.updateSession(sessionId, payload)
    : await limitedOrderSessionService.createSession(payload);

  if (!session) {
    await interaction.editReply({
      embeds: [createLimitedErrorEmbed("❌ TERJADI KESALAHAN", "Sesi pesanan tidak ditemukan atau sudah tidak valid.")],
    });
    return;
  }

  logger.info(
    `[LIMITED] creating order preview sessionId=${session.sessionId} orderCode=${session.orderCode}`,
  );

  await interaction.editReply({
    embeds: [buildLimitedOrderPreviewEmbed(sessionToLimitedEmbedData(session))],
    components: [buildLimitedOrderPreviewRow(session.sessionId)],
  });
}

export async function handleLimitedButton(
  interaction: ButtonInteraction,
  parsed: ParsedCustomId,
): Promise<void> {
  if (!interaction.inGuild() || !interaction.guild) {
    await replyEmbedEphemeral(
      interaction,
      createLimitedErrorEmbed("❌ TERJADI KESALAHAN", "Interaksi ini hanya tersedia di dalam server."),
    );
    return;
  }

  switch (parsed.action) {
    case "order": {
      if (!(await guardServiceOrderAvailable(interaction, interaction.guild.id, "limitedItem"))) {
        return;
      }

      await interaction.showModal(buildLimitedOrderModal());
      return;
    }

    case "edit": {
      if (!parsed.id) {
        await interaction.showModal(buildLimitedOrderModal());
        return;
      }

      const session = await limitedOrderSessionService.getSession(parsed.id);

      if (!session) {
        await replyEmbedEphemeral(
          interaction,
          createLimitedErrorEmbed("❌ TERJADI KESALAHAN", "Sesi pesanan tidak ditemukan."),
        );
        return;
      }

      const usability = limitedOrderSessionService.assertSessionUsable(session, interaction.user.id);

      if (usability === "expired") {
        await replyEmbedEphemeral(interaction, buildLimitedOrderExpiredEmbed());
        return;
      }

      if (usability !== "ok") {
        await replyEmbedEphemeral(
          interaction,
          createLimitedErrorEmbed("❌ TERJADI KESALAHAN", "Sesi pesanan tidak dapat diedit."),
        );
        return;
      }

      await interaction.showModal(
        buildLimitedOrderModal(session.sessionId, {
          itemName: session.itemName,
          robloxUsername: session.robloxUsername,
        }),
      );
      return;
    }

    case "cancel": {
      if (!parsed.id) {
        await replyEmbedEphemeral(
          interaction,
          createLimitedErrorEmbed("❌ TERJADI KESALAHAN", "Sesi pesanan tidak valid."),
        );
        return;
      }

      await acknowledgePreviewInteraction(interaction);

      const session = await limitedOrderSessionService.getSession(parsed.id);

      if (!session || session.userId !== interaction.user.id) {
        await editPreviewInteraction(interaction, {
          embeds: [createLimitedErrorEmbed("❌ TERJADI KESALAHAN", "Sesi pesanan tidak ditemukan.")],
        });
        return;
      }

      const usability = limitedOrderSessionService.assertSessionUsable(session, interaction.user.id);

      if (usability === "expired") {
        await editPreviewInteraction(interaction, {
          embeds: [buildLimitedOrderExpiredEmbed()],
          components: [buildLimitedOrderPreviewRow(session.sessionId, true)],
        });
        return;
      }

      if (usability !== "ok") {
        await editPreviewInteraction(interaction, {
          embeds: [buildLimitedOrderCancelledEmbed(session.orderCode)],
          components: [buildLimitedOrderPreviewRow(session.sessionId, true)],
        });
        return;
      }

      await limitedOrderSessionService.cancelSession(session.sessionId);
      await editPreviewInteraction(interaction, {
        embeds: [buildLimitedOrderCancelledEmbed(session.orderCode)],
        components: [buildLimitedOrderPreviewRow(session.sessionId, true)],
      });
      return;
    }

    case "confirm": {
      if (!parsed.id) {
        await replyEmbedEphemeral(
          interaction,
          createLimitedErrorEmbed("❌ TERJADI KESALAHAN", "Sesi pesanan tidak valid."),
        );
        return;
      }

      await acknowledgePreviewInteraction(interaction);

      const session = await limitedOrderSessionService.getSession(parsed.id);

      if (!session || session.userId !== interaction.user.id) {
        await editPreviewInteraction(interaction, {
          embeds: [createLimitedErrorEmbed("❌ TERJADI KESALAHAN", "Sesi pesanan tidak ditemukan.")],
        });
        return;
      }

      const usability = limitedOrderSessionService.assertSessionUsable(session, interaction.user.id);

      if (usability === "expired") {
        await editPreviewInteraction(interaction, {
          embeds: [buildLimitedOrderExpiredEmbed()],
          components: [buildLimitedOrderPreviewRow(session.sessionId, true)],
        });
        return;
      }

      if (usability === "cancelled") {
        await editPreviewInteraction(interaction, {
          embeds: [buildLimitedAlreadyCancelledEmbed(session.orderCode)],
          components: [buildLimitedOrderPreviewRow(session.sessionId, true)],
        });
        return;
      }

      if (usability === "confirmed") {
        const existingTicket = await ticketService.findOpenLimitedTicket(session.guildId, session.userId);
        const mention = existingTicket ? `<#${existingTicket.channelId}>` : "ticket Anda";
        await editPreviewInteraction(interaction, {
          embeds: [buildLimitedAlreadyConfirmedEmbed(session.orderCode, mention)],
          components: [buildLimitedOrderPreviewRow(session.sessionId, true)],
        });
        return;
      }

      if (usability !== "ok") {
        await editPreviewInteraction(interaction, {
          embeds: [createLimitedErrorEmbed("❌ TERJADI KESALAHAN", "Sesi pesanan tidak dapat dikonfirmasi.")],
        });
        return;
      }

      if (!session.itemName.trim() || !session.robloxUsername.trim()) {
        await editPreviewInteraction(interaction, {
          embeds: [buildLimitedValidationErrorEmbed("Item dan username Roblox wajib diisi.")],
        });
        return;
      }

      const openTicket = await ticketService.findOpenTicketByUser(session.guildId, session.userId);

      if (openTicket) {
        await editPreviewInteraction(interaction, {
          embeds: [buildActiveTicketWarningEmbed(openTicket, ProductType.ITEM_LIMITED)],
          components: [buildBulkChoiceRow(session.sessionId)],
        });
        return;
      }

      const config = await guildConfigService.getOrCreateGuildConfig(
        interaction.guild.id,
        interaction.guild.name,
      );

      try {
        const confirmedSession = await limitedOrderSessionService.confirmSession(session.sessionId);

        if (!confirmedSession) {
          await editPreviewInteraction(interaction, {
            embeds: [createLimitedErrorEmbed("❌ TERJADI KESALAHAN", "Gagal mengonfirmasi pesanan.")],
          });
          return;
        }

        const ticket = await ticketService.createLimitedTicket(
          interaction.guild,
          config,
          confirmedSession,
          interaction.user.id,
        );

        await editPreviewInteraction(interaction, {
          embeds: [buildLimitedTicketSuccessEmbed(confirmedSession.orderCode, ticket.channelId)],
          components: [buildLimitedOrderPreviewRow(confirmedSession.sessionId, true)],
        });

        logger.order(
          `Item Limited order ${confirmedSession.orderCode} confirmed by ${interaction.user.tag} → ticket ${ticket.ticketId}`,
        );
      } catch (error) {
        if (error instanceof TicketError) {
          logger.error(`Ticket creation failed [${error.code}] for order ${session.orderCode}`, error.cause ?? error);
          await editPreviewInteraction(interaction, {
            embeds: [buildLimitedTicketErrorEmbed(error.code)],
          });
          return;
        }

        logger.error(`Unexpected ticket creation failure for order ${session.orderCode}`, error);
        await editPreviewInteraction(interaction, {
          embeds: [buildLimitedTicketErrorEmbed("TICKET_CREATE_FAILED")],
        });
      }

      return;
    }

    default: {
      await replyEmbedEphemeral(
        interaction,
        createLimitedErrorEmbed("❌ TERJADI KESALAHAN", "Aksi tidak dikenali."),
      );
    }
  }
}

export async function handleLimitedModal(
  interaction: ModalSubmitInteraction,
  parsed: ParsedCustomId,
): Promise<void> {
  if (parsed.action !== "submit") {
    await replyEmbedEphemeral(
      interaction,
      createLimitedErrorEmbed("❌ TERJADI KESALAHAN", "Form tidak dikenali."),
    );
    return;
  }

  if (parsed.id && isLimitedSessionId(parsed.id)) {
    const session = await limitedOrderSessionService.getSession(parsed.id);

    if (!session || session.userId !== interaction.user.id) {
      await replyEmbedEphemeral(
        interaction,
        createLimitedErrorEmbed("❌ TERJADI KESALAHAN", "Sesi pesanan tidak ditemukan."),
      );
      return;
    }

    const usability = limitedOrderSessionService.assertSessionUsable(session, interaction.user.id);

    if (usability === "expired") {
      await replyEmbedEphemeral(interaction, buildLimitedOrderExpiredEmbed());
      return;
    }

    if (usability !== "ok") {
      await replyEmbedEphemeral(
        interaction,
        createLimitedErrorEmbed("❌ TERJADI KESALAHAN", "Sesi pesanan tidak dapat diperbarui."),
      );
      return;
    }
  }

  await processLimitedOrderForm(interaction, parsed.id);
}
