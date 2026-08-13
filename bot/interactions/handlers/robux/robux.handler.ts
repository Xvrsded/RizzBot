import {
  MessageFlags,
  type ButtonInteraction,
  type InteractionEditReplyOptions,
  type ModalSubmitInteraction,
  type StringSelectMenuInteraction,
} from "discord.js";
import type { ParsedCustomId } from "../../custom-id";
import { ProductType } from "../../../../shared/products";
import { guildConfigService } from "../../../services/guild-config.service";
import {
  robuxOrderSessionService,
  validateRobuxUsernameInput,
} from "../../../services/robux-order-session.service";
import { lookupRobloxUser, RobloxApiError, RobloxUserNotFoundError } from "../../../services/roblox.service";
import { ticketService } from "../../../services/ticket.service";
import { TicketError } from "../../../services/ticket.errors";
import { parseRobuxPackageAmount } from "../../../../shared/robux-packages";
import {
  buildRobuxAlreadyCancelledEmbed,
  buildRobuxAlreadyConfirmedEmbed,
  buildRobuxDismissedEmbed,
  buildRobuxDuplicateTicketEmbed,
  buildRobuxOrderCancelledEmbed,
  buildRobuxOrderExpiredEmbed,
  buildRobuxOrderPreviewEmbed,
  buildRobuxOrderPreviewRow,
  buildRobuxPackageSelectEmbed,
  buildRobuxPackageSelectRow,
  buildRobuxTicketErrorEmbed,
  buildRobuxTicketSuccessEmbed,
  buildRobuxUsernameNotFoundEmbed,
  buildRobuxUsernameNotFoundRow,
  buildRobuxValidationErrorEmbed,
  createRobuxErrorEmbed,
  sessionToRobuxEmbedData,
} from "../../../utils/embeds/robux-username.embed";
import { replyEmbedEphemeral } from "../../../utils/reply";
import { buildRobuxUsernameModal, extractRobuxModalUsername, isRobuxSessionId } from "./robux.modal";
import { logger } from "../../../../shared/logger";
import { getRobuxPackagePrice } from "../../../../shared/robux-packages";
import { robuxOrderSessionRepository } from "../../../../database/repositories/robux-order-session.repository";
import {
  buildActiveTicketWarningEmbed,
  buildBulkChoiceRow,
} from "../../../utils/embeds/bulk-ticket.embed";
import { guardServiceOrderAvailable } from "../../../utils/service-order-guard";

function robuxError(title: string, description: string) {
  return createRobuxErrorEmbed(title, description);
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

async function processRobuxUsernameForm(
  interaction: ModalSubmitInteraction,
  targetId: string,
): Promise<void> {
  const robloxUsername = extractRobuxModalUsername(interaction);
  logger.info(`[ROBUX DEBUG] username modal submitted username=${robloxUsername} targetId=${targetId}`);

  if (!interaction.inGuild() || !interaction.guild) {
    await replyEmbedEphemeral(
      interaction,
      robuxError("❌ TERJADI KESALAHAN", "Pesanan hanya dapat dibuat di dalam server."),
    );
    return;
  }

  const validationError = validateRobuxUsernameInput(robloxUsername);

  if (validationError) {
    await replyEmbedEphemeral(interaction, buildRobuxValidationErrorEmbed(validationError));
    return;
  }

  let robuxAmount: number;
  let sessionId: string | undefined;

  if (isRobuxSessionId(targetId)) {
    sessionId = targetId;
    const existingSession = await robuxOrderSessionService.getSession(sessionId);

    if (!existingSession || existingSession.userId !== interaction.user.id) {
      await replyEmbedEphemeral(
        interaction,
        robuxError("❌ TERJADI KESALAHAN", "Sesi pesanan tidak ditemukan."),
      );
      return;
    }

    const usability = robuxOrderSessionService.assertSessionUsable(existingSession, interaction.user.id);

    if (usability !== "ok") {
      await replyEmbedEphemeral(
        interaction,
        robuxError("❌ TERJADI KESALAHAN", "Sesi pesanan tidak dapat diperbarui."),
      );
      return;
    }

    robuxAmount = existingSession.robuxAmount;
  } else {
    const parsedAmount = parseRobuxPackageAmount(targetId);

    if (parsedAmount === null) {
      await replyEmbedEphemeral(
        interaction,
        robuxError("❌ TERJADI KESALAHAN", "Paket Robux tidak valid."),
      );
      return;
    }

    robuxAmount = parsedAmount;
  }

  const packagePrice = getRobuxPackagePrice(robuxAmount);
  logger.info(
    `[ROBUX DEBUG] package=${robuxAmount} price=${packagePrice ?? "invalid"} sessionId=${sessionId ?? "new"}`,
  );

  await interaction.deferReply({ flags: MessageFlags.Ephemeral });

  let robloxUser;

  try {
    robloxUser = await lookupRobloxUser(robloxUsername);
  } catch (error) {
    if (error instanceof RobloxUserNotFoundError) {
      await interaction.editReply({
        embeds: [buildRobuxUsernameNotFoundEmbed(error.username)],
        components: [buildRobuxUsernameNotFoundRow()],
      });
      return;
    }

    if (error instanceof RobloxApiError && error.status === 429) {
      await interaction.editReply({
        embeds: [
          robuxError(
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
        robuxError(
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
    robuxAmount,
    robloxUsername,
    robloxUser,
  };

  const session = sessionId
    ? await robuxOrderSessionService.updateSession(sessionId, payload)
    : await robuxOrderSessionService.createSession(payload);

  if (!session) {
    await interaction.editReply({
      embeds: [robuxError("❌ TERJADI KESALAHAN", "Sesi pesanan tidak ditemukan atau sudah tidak valid.")],
    });
    return;
  }

  logger.info(`[ROBUX DEBUG] creating robux order preview sessionId=${session.sessionId} orderCode=${session.orderCode}`);

  await interaction.editReply({
    embeds: [
      buildRobuxOrderPreviewEmbed(sessionToRobuxEmbedData(session), `<@${interaction.user.id}>`),
    ],
    components: [buildRobuxOrderPreviewRow(session.sessionId)],
  });
}

export async function handleRobuxButton(
  interaction: ButtonInteraction,
  parsed: ParsedCustomId,
): Promise<void> {
  if (!interaction.inGuild() || !interaction.guild) {
    await replyEmbedEphemeral(
      interaction,
      robuxError("❌ TERJADI KESALAHAN", "Interaksi ini hanya tersedia di dalam server."),
    );
    return;
  }

  switch (parsed.action) {
    case "order": {
      if (!(await guardServiceOrderAvailable(interaction, interaction.guild.id, "robuxSend"))) {
        return;
      }

      await interaction.reply({
        embeds: [buildRobuxPackageSelectEmbed()],
        components: [buildRobuxPackageSelectRow()],
        flags: MessageFlags.Ephemeral,
      });
      return;
    }

    case "dismiss": {
      await replyEmbedEphemeral(interaction, buildRobuxDismissedEmbed());
      return;
    }

    case "edit": {
      if (!parsed.id) {
        await interaction.reply({
          embeds: [buildRobuxPackageSelectEmbed()],
          components: [buildRobuxPackageSelectRow()],
          flags: MessageFlags.Ephemeral,
        });
        return;
      }

      const session = await robuxOrderSessionService.getSession(parsed.id);

      if (!session) {
        await replyEmbedEphemeral(
          interaction,
          robuxError("❌ TERJADI KESALAHAN", "Sesi pesanan tidak ditemukan."),
        );
        return;
      }

      const usability = robuxOrderSessionService.assertSessionUsable(session, interaction.user.id);

      if (usability === "expired") {
        await replyEmbedEphemeral(interaction, buildRobuxOrderExpiredEmbed());
        return;
      }

      if (usability !== "ok") {
        await replyEmbedEphemeral(
          interaction,
          robuxError("❌ TERJADI KESALAHAN", "Sesi pesanan tidak dapat diedit."),
        );
        return;
      }

      await interaction.reply({
        embeds: [buildRobuxPackageSelectEmbed()],
        components: [buildRobuxPackageSelectRow(session.sessionId)],
        flags: MessageFlags.Ephemeral,
      });
      return;
    }

    case "cancel": {
      if (!parsed.id) {
        await replyEmbedEphemeral(
          interaction,
          robuxError("❌ TERJADI KESALAHAN", "Sesi pesanan tidak valid."),
        );
        return;
      }

      await acknowledgePreviewInteraction(interaction);

      const session = await robuxOrderSessionService.getSession(parsed.id);

      if (!session || session.userId !== interaction.user.id) {
        await editPreviewInteraction(interaction, {
          embeds: [robuxError("❌ TERJADI KESALAHAN", "Sesi pesanan tidak ditemukan.")],
        });
        return;
      }

      const usability = robuxOrderSessionService.assertSessionUsable(session, interaction.user.id);

      if (usability === "expired") {
        await editPreviewInteraction(interaction, {
          embeds: [buildRobuxOrderExpiredEmbed()],
          components: [buildRobuxOrderPreviewRow(session.sessionId, true)],
        });
        return;
      }

      if (usability !== "ok") {
        await editPreviewInteraction(interaction, {
          embeds: [buildRobuxOrderCancelledEmbed(session.orderCode)],
          components: [buildRobuxOrderPreviewRow(session.sessionId, true)],
        });
        return;
      }

      await robuxOrderSessionService.cancelSession(session.sessionId);
      await editPreviewInteraction(interaction, {
        embeds: [buildRobuxOrderCancelledEmbed(session.orderCode)],
        components: [buildRobuxOrderPreviewRow(session.sessionId, true)],
      });
      return;
    }

    case "confirm": {
      if (!parsed.id) {
        await replyEmbedEphemeral(
          interaction,
          robuxError("❌ TERJADI KESALAHAN", "Sesi pesanan tidak valid."),
        );
        return;
      }

      await acknowledgePreviewInteraction(interaction);

      const session = await robuxOrderSessionService.getSession(parsed.id);

      if (!session || session.userId !== interaction.user.id) {
        await editPreviewInteraction(interaction, {
          embeds: [robuxError("❌ TERJADI KESALAHAN", "Sesi pesanan tidak ditemukan.")],
        });
        return;
      }

      const usability = robuxOrderSessionService.assertSessionUsable(session, interaction.user.id);

      if (usability === "expired") {
        await editPreviewInteraction(interaction, {
          embeds: [buildRobuxOrderExpiredEmbed()],
          components: [buildRobuxOrderPreviewRow(session.sessionId, true)],
        });
        return;
      }

      if (usability === "cancelled") {
        await editPreviewInteraction(interaction, {
          embeds: [buildRobuxAlreadyCancelledEmbed(session.orderCode)],
          components: [buildRobuxOrderPreviewRow(session.sessionId, true)],
        });
        return;
      }

      if (usability === "confirmed") {
        const existingTicket = await ticketService.findOpenRobuxUsernameTicket(
          session.guildId,
          session.userId,
        );
        const mention = existingTicket ? `<#${existingTicket.channelId}>` : "ticket Anda";
        await editPreviewInteraction(interaction, {
          embeds: [buildRobuxAlreadyConfirmedEmbed(session.orderCode, mention)],
          components: [buildRobuxOrderPreviewRow(session.sessionId, true)],
        });
        return;
      }

      if (usability !== "ok") {
        await editPreviewInteraction(interaction, {
          embeds: [robuxError("❌ TERJADI KESALAHAN", "Sesi pesanan tidak dapat dikonfirmasi.")],
        });
        return;
      }

      const openTicket = await ticketService.findOpenTicketByUser(session.guildId, session.userId);

      if (openTicket) {
        await editPreviewInteraction(interaction, {
          embeds: [buildActiveTicketWarningEmbed(openTicket, ProductType.ROBUX_USERNAME)],
          components: [buildBulkChoiceRow(session.sessionId)],
        });
        return;
      }

      const config = await guildConfigService.getOrCreateGuildConfig(
        interaction.guild.id,
        interaction.guild.name,
      );

      try {
        const confirmedSession = await robuxOrderSessionService.confirmSession(session.sessionId);

        if (!confirmedSession) {
          await editPreviewInteraction(interaction, {
            embeds: [robuxError("❌ TERJADI KESALAHAN", "Gagal mengonfirmasi pesanan.")],
          });
          return;
        }

        const ticket = await ticketService.createRobuxUsernameTicket(
          interaction.guild,
          config,
          confirmedSession,
          interaction.user.id,
        );

        await editPreviewInteraction(interaction, {
          embeds: [buildRobuxTicketSuccessEmbed(confirmedSession.orderCode, ticket.channelId)],
          components: [buildRobuxOrderPreviewRow(confirmedSession.sessionId, true)],
        });

        logger.order(
          `Robux Via Username order ${confirmedSession.orderCode} confirmed by ${interaction.user.tag} → ticket ${ticket.ticketId}`,
        );
      } catch (error) {
        if (error instanceof TicketError) {
          logger.error(`Ticket creation failed [${error.code}] for order ${session.orderCode}`, error.cause ?? error);
          await editPreviewInteraction(interaction, {
            embeds: [buildRobuxTicketErrorEmbed(error.code)],
          });
          return;
        }

        logger.error(`Unexpected ticket creation failure for order ${session.orderCode}`, error);
        await editPreviewInteraction(interaction, {
          embeds: [buildRobuxTicketErrorEmbed("TICKET_CREATE_FAILED")],
        });
      }

      return;
    }

    default: {
      await replyEmbedEphemeral(
        interaction,
        robuxError("❌ TERJADI KESALAHAN", "Aksi tidak dikenali."),
      );
    }
  }
}

export async function handleRobuxSelectMenu(
  interaction: StringSelectMenuInteraction,
  parsed: ParsedCustomId,
): Promise<void> {
  if (!interaction.inGuild()) {
    await replyEmbedEphemeral(
      interaction,
      robuxError("❌ TERJADI KESALAHAN", "Interaksi ini hanya tersedia di dalam server."),
    );
    return;
  }

  if (parsed.action !== "select-package") {
    await replyEmbedEphemeral(
      interaction,
      robuxError("❌ TERJADI KESALAHAN", "Menu tidak dikenali."),
    );
    return;
  }

  const selectedAmount = parseRobuxPackageAmount(interaction.values[0] ?? "");

  if (selectedAmount === null) {
    await replyEmbedEphemeral(
      interaction,
      robuxError("❌ TERJADI KESALAHAN", "Paket Robux tidak valid."),
    );
    return;
  }

  const selectedPrice = getRobuxPackagePrice(selectedAmount);
  logger.info(`[ROBUX DEBUG] package selected package=${selectedAmount} price=${selectedPrice ?? "invalid"}`);

  if (parsed.id && isRobuxSessionId(parsed.id)) {
    const session = await robuxOrderSessionService.getSession(parsed.id);

    if (!session || session.userId !== interaction.user.id) {
      await replyEmbedEphemeral(
        interaction,
        robuxError("❌ TERJADI KESALAHAN", "Sesi pesanan tidak ditemukan."),
      );
      return;
    }

    const finalPrice = getRobuxPackagePrice(selectedAmount);

    if (finalPrice === null) {
      await replyEmbedEphemeral(
        interaction,
        robuxError("❌ TERJADI KESALAHAN", "Paket Robux tidak valid."),
      );
      return;
    }

    await robuxOrderSessionRepository.updateBySessionId(session.sessionId, {
      robuxAmount: selectedAmount,
      finalPrice,
      expiresAt: new Date(Date.now() + 15 * 60 * 1000),
    });

    await interaction.showModal(buildRobuxUsernameModal(session.sessionId, session.robloxUsername));
    return;
  }

  await interaction.showModal(buildRobuxUsernameModal(String(selectedAmount)));
}

export async function handleRobuxModal(
  interaction: ModalSubmitInteraction,
  parsed: ParsedCustomId,
): Promise<void> {
  logger.info(
    `[ROBUX DEBUG] robux modal handler action=${parsed.action} id=${parsed.id ?? "none"} customId=${parsed.raw}`,
  );

  if (parsed.action !== "submit") {
    await replyEmbedEphemeral(
      interaction,
      robuxError("❌ TERJADI KESALAHAN", "Form tidak dikenali."),
    );
    return;
  }

  if (!parsed.id) {
    await replyEmbedEphemeral(
      interaction,
      robuxError("❌ TERJADI KESALAHAN", "Paket Robux tidak valid."),
    );
    return;
  }

  if (isRobuxSessionId(parsed.id)) {
    const session = await robuxOrderSessionService.getSession(parsed.id);

    if (!session || session.userId !== interaction.user.id) {
      await replyEmbedEphemeral(
        interaction,
        robuxError("❌ TERJADI KESALAHAN", "Sesi pesanan tidak ditemukan."),
      );
      return;
    }

    const usability = robuxOrderSessionService.assertSessionUsable(session, interaction.user.id);

    if (usability === "expired") {
      await replyEmbedEphemeral(interaction, buildRobuxOrderExpiredEmbed());
      return;
    }

    if (usability !== "ok") {
      await replyEmbedEphemeral(
        interaction,
        robuxError("❌ TERJADI KESALAHAN", "Sesi pesanan tidak dapat diperbarui."),
      );
      return;
    }
  }

  await processRobuxUsernameForm(interaction, parsed.id);
}
