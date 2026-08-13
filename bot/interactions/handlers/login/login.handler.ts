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
  loginOrderSessionService,
  validateLoginUsernameInput,
} from "../../../services/login-order-session.service";
import { lookupRobloxUser, RobloxApiError, RobloxUserNotFoundError } from "../../../services/roblox.service";
import { ticketService } from "../../../services/ticket.service";
import { TicketError } from "../../../services/ticket.errors";
import { parseLoginPackageAmount, getLoginPackagePrice } from "../../../../shared/login-packages";
import { loginOrderSessionRepository } from "../../../../database/repositories/login-order-session.repository";
import {
  buildLoginAlreadyCancelledEmbed,
  buildLoginAlreadyConfirmedEmbed,
  buildLoginDuplicateTicketEmbed,
  buildLoginOrderCancelledEmbed,
  buildLoginOrderExpiredEmbed,
  buildLoginOrderPreviewEmbed,
  buildLoginOrderPreviewRow,
  buildLoginPackageSelectEmbed,
  buildLoginPackageSelectRow,
  buildLoginProcessingEmbed,
  buildLoginTicketErrorEmbed,
  buildLoginTicketSuccessEmbed,
  buildLoginUsernameNotFoundEmbed,
  buildLoginValidationErrorEmbed,
  createLoginErrorEmbed,
  sessionToLoginEmbedData,
} from "../../../utils/embeds/login.embed";
import { replyEmbedEphemeral } from "../../../utils/reply";
import {
  buildLoginUsernameModal,
  extractLoginModalUsername,
  isLoginSessionId,
} from "./login.modal";
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

async function processLoginUsernameForm(
  interaction: ModalSubmitInteraction,
  targetId: string,
): Promise<void> {
  const robloxUsername = extractLoginModalUsername(interaction);
  logger.info(`[LOGIN] username modal submitted username=${robloxUsername} targetId=${targetId}`);

  if (!interaction.inGuild() || !interaction.guild) {
    await replyEmbedEphemeral(
      interaction,
      createLoginErrorEmbed("❌ TERJADI KESALAHAN", "Pesanan hanya dapat dibuat di dalam server."),
    );
    return;
  }

  const validationError = validateLoginUsernameInput(robloxUsername);

  if (validationError) {
    await replyEmbedEphemeral(interaction, buildLoginValidationErrorEmbed(validationError));
    return;
  }

  let robuxAmount: number;
  let sessionId: string | undefined;

  if (isLoginSessionId(targetId)) {
    sessionId = targetId;
    const existingSession = await loginOrderSessionService.getSession(sessionId);

    if (!existingSession || existingSession.userId !== interaction.user.id) {
      await replyEmbedEphemeral(
        interaction,
        createLoginErrorEmbed("❌ TERJADI KESALAHAN", "Sesi pesanan tidak ditemukan."),
      );
      return;
    }

    const usability = loginOrderSessionService.assertSessionUsable(existingSession, interaction.user.id);

    if (usability !== "ok") {
      await replyEmbedEphemeral(
        interaction,
        createLoginErrorEmbed("❌ TERJADI KESALAHAN", "Sesi pesanan tidak dapat diperbarui."),
      );
      return;
    }

    robuxAmount = existingSession.robuxAmount;
  } else {
    const parsedAmount = parseLoginPackageAmount(targetId);

    if (parsedAmount === null) {
      await replyEmbedEphemeral(
        interaction,
        createLoginErrorEmbed("❌ TERJADI KESALAHAN", "Paket Robux tidak valid."),
      );
      return;
    }

    robuxAmount = parsedAmount;
  }

  await interaction.deferReply({ flags: MessageFlags.Ephemeral });

  let robloxUser;

  try {
    robloxUser = await lookupRobloxUser(robloxUsername);
  } catch (error) {
    if (error instanceof RobloxUserNotFoundError) {
      await interaction.editReply({
        embeds: [buildLoginUsernameNotFoundEmbed(error.username)],
      });
      return;
    }

    if (error instanceof RobloxApiError && error.status === 429) {
      await interaction.editReply({
        embeds: [
          createLoginErrorEmbed(
            "⏳ ROBLOX SEDANG SIBUK",
            "Roblox API sedang rate limit. Silakan tunggu beberapa detik lalu coba submit form lagi.",
          ),
        ],
      });
      return;
    }

    logger.error("Roblox lookup failed for login order", error);
    await interaction.editReply({
      embeds: [
        createLoginErrorEmbed(
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
    ? await loginOrderSessionService.updateSession(sessionId, payload)
    : await loginOrderSessionService.createSession(payload);

  if (!session) {
    await interaction.editReply({
      embeds: [createLoginErrorEmbed("❌ TERJADI KESALAHAN", "Sesi pesanan tidak ditemukan atau sudah tidak valid.")],
    });
    return;
  }

  logger.info(
    `[LOGIN] creating order preview sessionId=${session.sessionId} orderCode=${session.orderCode}`,
  );

  await interaction.editReply({
    embeds: [
      buildLoginProcessingEmbed(),
      buildLoginOrderPreviewEmbed(sessionToLoginEmbedData(session)),
    ],
    components: [buildLoginOrderPreviewRow(session.sessionId)],
  });
}

export async function handleLoginButton(
  interaction: ButtonInteraction,
  parsed: ParsedCustomId,
): Promise<void> {
  if (!interaction.inGuild() || !interaction.guild) {
    await replyEmbedEphemeral(
      interaction,
      createLoginErrorEmbed("❌ TERJADI KESALAHAN", "Interaksi ini hanya tersedia di dalam server."),
    );
    return;
  }

  switch (parsed.action) {
    case "order": {
      if (!(await guardServiceOrderAvailable(interaction, interaction.guild.id, "robuxLogin"))) {
        return;
      }

      await interaction.reply({
        embeds: [buildLoginPackageSelectEmbed()],
        components: [buildLoginPackageSelectRow()],
        flags: MessageFlags.Ephemeral,
      });
      return;
    }

    case "edit": {
      if (!parsed.id) {
        await interaction.reply({
          embeds: [buildLoginPackageSelectEmbed()],
          components: [buildLoginPackageSelectRow()],
          flags: MessageFlags.Ephemeral,
        });
        return;
      }

      const session = await loginOrderSessionService.getSession(parsed.id);

      if (!session) {
        await replyEmbedEphemeral(
          interaction,
          createLoginErrorEmbed("❌ TERJADI KESALAHAN", "Sesi pesanan tidak ditemukan."),
        );
        return;
      }

      const usability = loginOrderSessionService.assertSessionUsable(session, interaction.user.id);

      if (usability === "expired") {
        await replyEmbedEphemeral(interaction, buildLoginOrderExpiredEmbed());
        return;
      }

      if (usability !== "ok") {
        await replyEmbedEphemeral(
          interaction,
          createLoginErrorEmbed("❌ TERJADI KESALAHAN", "Sesi pesanan tidak dapat diedit."),
        );
        return;
      }

      await interaction.reply({
        embeds: [buildLoginPackageSelectEmbed()],
        components: [buildLoginPackageSelectRow(session.sessionId)],
        flags: MessageFlags.Ephemeral,
      });
      return;
    }

    case "cancel": {
      if (!parsed.id) {
        await replyEmbedEphemeral(
          interaction,
          createLoginErrorEmbed("❌ TERJADI KESALAHAN", "Sesi pesanan tidak valid."),
        );
        return;
      }

      await acknowledgePreviewInteraction(interaction);

      const session = await loginOrderSessionService.getSession(parsed.id);

      if (!session || session.userId !== interaction.user.id) {
        await editPreviewInteraction(interaction, {
          embeds: [createLoginErrorEmbed("❌ TERJADI KESALAHAN", "Sesi pesanan tidak ditemukan.")],
        });
        return;
      }

      const usability = loginOrderSessionService.assertSessionUsable(session, interaction.user.id);

      if (usability === "expired") {
        await editPreviewInteraction(interaction, {
          embeds: [buildLoginOrderExpiredEmbed()],
          components: [buildLoginOrderPreviewRow(session.sessionId, true)],
        });
        return;
      }

      if (usability !== "ok") {
        await editPreviewInteraction(interaction, {
          embeds: [buildLoginOrderCancelledEmbed(session.orderCode)],
          components: [buildLoginOrderPreviewRow(session.sessionId, true)],
        });
        return;
      }

      await loginOrderSessionService.cancelSession(session.sessionId);
      await editPreviewInteraction(interaction, {
        embeds: [buildLoginOrderCancelledEmbed(session.orderCode)],
        components: [buildLoginOrderPreviewRow(session.sessionId, true)],
      });
      return;
    }

    case "confirm": {
      if (!parsed.id) {
        await replyEmbedEphemeral(
          interaction,
          createLoginErrorEmbed("❌ TERJADI KESALAHAN", "Sesi pesanan tidak valid."),
        );
        return;
      }

      await acknowledgePreviewInteraction(interaction);

      const session = await loginOrderSessionService.getSession(parsed.id);

      if (!session || session.userId !== interaction.user.id) {
        await editPreviewInteraction(interaction, {
          embeds: [createLoginErrorEmbed("❌ TERJADI KESALAHAN", "Sesi pesanan tidak ditemukan.")],
        });
        return;
      }

      const usability = loginOrderSessionService.assertSessionUsable(session, interaction.user.id);

      if (usability === "expired") {
        await editPreviewInteraction(interaction, {
          embeds: [buildLoginOrderExpiredEmbed()],
          components: [buildLoginOrderPreviewRow(session.sessionId, true)],
        });
        return;
      }

      if (usability === "cancelled") {
        await editPreviewInteraction(interaction, {
          embeds: [buildLoginAlreadyCancelledEmbed(session.orderCode)],
          components: [buildLoginOrderPreviewRow(session.sessionId, true)],
        });
        return;
      }

      if (usability === "confirmed") {
        const existingTicket = await ticketService.findOpenLoginTicket(session.guildId, session.userId);
        const mention = existingTicket ? `<#${existingTicket.channelId}>` : "ticket Anda";
        await editPreviewInteraction(interaction, {
          embeds: [buildLoginAlreadyConfirmedEmbed(session.orderCode, mention)],
          components: [buildLoginOrderPreviewRow(session.sessionId, true)],
        });
        return;
      }

      if (usability !== "ok") {
        await editPreviewInteraction(interaction, {
          embeds: [createLoginErrorEmbed("❌ TERJADI KESALAHAN", "Sesi pesanan tidak dapat dikonfirmasi.")],
        });
        return;
      }

      const openTicket = await ticketService.findOpenTicketByUser(session.guildId, session.userId);

      if (openTicket) {
        await editPreviewInteraction(interaction, {
          embeds: [buildActiveTicketWarningEmbed(openTicket, ProductType.ROBUX_LOGIN)],
          components: [buildBulkChoiceRow(session.sessionId)],
        });
        return;
      }

      const config = await guildConfigService.getOrCreateGuildConfig(
        interaction.guild.id,
        interaction.guild.name,
      );

      try {
        const confirmedSession = await loginOrderSessionService.confirmSession(session.sessionId);

        if (!confirmedSession) {
          await editPreviewInteraction(interaction, {
            embeds: [createLoginErrorEmbed("❌ TERJADI KESALAHAN", "Gagal mengonfirmasi pesanan.")],
          });
          return;
        }

        const ticket = await ticketService.createLoginTicket(
          interaction.guild,
          config,
          confirmedSession,
          interaction.user.id,
        );

        await editPreviewInteraction(interaction, {
          embeds: [buildLoginTicketSuccessEmbed(confirmedSession.orderCode, ticket.channelId)],
          components: [buildLoginOrderPreviewRow(confirmedSession.sessionId, true)],
        });

        logger.order(
          `Robux Via Login order ${confirmedSession.orderCode} confirmed by ${interaction.user.tag} → ticket ${ticket.ticketId}`,
        );
      } catch (error) {
        if (error instanceof TicketError) {
          logger.error(`Ticket creation failed [${error.code}] for order ${session.orderCode}`, error.cause ?? error);
          await editPreviewInteraction(interaction, {
            embeds: [buildLoginTicketErrorEmbed(error.code)],
          });
          return;
        }

        logger.error(`Unexpected ticket creation failure for order ${session.orderCode}`, error);
        await editPreviewInteraction(interaction, {
          embeds: [buildLoginTicketErrorEmbed("TICKET_CREATE_FAILED")],
        });
      }

      return;
    }

    default: {
      await replyEmbedEphemeral(
        interaction,
        createLoginErrorEmbed("❌ TERJADI KESALAHAN", "Aksi tidak dikenali."),
      );
    }
  }
}

export async function handleLoginSelectMenu(
  interaction: StringSelectMenuInteraction,
  parsed: ParsedCustomId,
): Promise<void> {
  if (!interaction.inGuild()) {
    await replyEmbedEphemeral(
      interaction,
      createLoginErrorEmbed("❌ TERJADI KESALAHAN", "Interaksi ini hanya tersedia di dalam server."),
    );
    return;
  }

  if (parsed.action !== "select-package") {
    await replyEmbedEphemeral(
      interaction,
      createLoginErrorEmbed("❌ TERJADI KESALAHAN", "Menu tidak dikenali."),
    );
    return;
  }

  const selectedAmount = parseLoginPackageAmount(interaction.values[0] ?? "");

  if (selectedAmount === null) {
    await replyEmbedEphemeral(
      interaction,
      createLoginErrorEmbed("❌ TERJADI KESALAHAN", "Paket Robux tidak valid."),
    );
    return;
  }

  if (parsed.id && isLoginSessionId(parsed.id)) {
    const session = await loginOrderSessionService.getSession(parsed.id);

    if (!session || session.userId !== interaction.user.id) {
      await replyEmbedEphemeral(
        interaction,
        createLoginErrorEmbed("❌ TERJADI KESALAHAN", "Sesi pesanan tidak ditemukan."),
      );
      return;
    }

    const finalPrice = getLoginPackagePrice(selectedAmount);

    if (finalPrice === null) {
      await replyEmbedEphemeral(
        interaction,
        createLoginErrorEmbed("❌ TERJADI KESALAHAN", "Paket Robux tidak valid."),
      );
      return;
    }

    await loginOrderSessionRepository.updateBySessionId(session.sessionId, {
      robuxAmount: selectedAmount,
      finalPrice,
      expiresAt: new Date(Date.now() + 15 * 60 * 1000),
    });

    await interaction.showModal(buildLoginUsernameModal(session.sessionId, session.robloxUsername));
    return;
  }

  logger.info(`[LOGIN] package selected package=${selectedAmount} price=${getLoginPackagePrice(selectedAmount)}`);
  await interaction.showModal(buildLoginUsernameModal(String(selectedAmount)));
}

export async function handleLoginModal(
  interaction: ModalSubmitInteraction,
  parsed: ParsedCustomId,
): Promise<void> {
  if (parsed.action !== "submit") {
    await replyEmbedEphemeral(
      interaction,
      createLoginErrorEmbed("❌ TERJADI KESALAHAN", "Form tidak dikenali."),
    );
    return;
  }

  if (!parsed.id) {
    await replyEmbedEphemeral(
      interaction,
      createLoginErrorEmbed("❌ TERJADI KESALAHAN", "Paket Robux tidak valid."),
    );
    return;
  }

  if (isLoginSessionId(parsed.id)) {
    const session = await loginOrderSessionService.getSession(parsed.id);

    if (!session || session.userId !== interaction.user.id) {
      await replyEmbedEphemeral(
        interaction,
        createLoginErrorEmbed("❌ TERJADI KESALAHAN", "Sesi pesanan tidak ditemukan."),
      );
      return;
    }

    const usability = loginOrderSessionService.assertSessionUsable(session, interaction.user.id);

    if (usability === "expired") {
      await replyEmbedEphemeral(interaction, buildLoginOrderExpiredEmbed());
      return;
    }

    if (usability !== "ok") {
      await replyEmbedEphemeral(
        interaction,
        createLoginErrorEmbed("❌ TERJADI KESALAHAN", "Sesi pesanan tidak dapat diperbarui."),
      );
      return;
    }
  }

  await processLoginUsernameForm(interaction, parsed.id);
}
