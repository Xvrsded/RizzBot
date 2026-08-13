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
  middlemanOrderSessionService,
  validateMiddlemanTransactionDetail,
  validateMiddlemanUsername,
} from "../../../services/middleman-order-session.service";
import { ticketService } from "../../../services/ticket.service";
import { TicketError } from "../../../services/ticket.errors";
import {
  buildMiddlemanAlreadyCancelledEmbed,
  buildMiddlemanAlreadyConfirmedEmbed,
  buildMiddlemanOrderCancelledEmbed,
  buildMiddlemanOrderExpiredEmbed,
  buildMiddlemanOrderPreviewEmbed,
  buildMiddlemanOrderPreviewRow,
  buildMiddlemanTicketErrorEmbed,
  buildMiddlemanTicketSuccessEmbed,
  buildMiddlemanValidationErrorEmbed,
  buildMiddlemanClosedEmbed,
  createMiddlemanErrorEmbed,
  sessionToMiddlemanEmbedData,
  buildMiddlemanOrderPromptEmbed,
  buildMiddlemanOrderPromptRow,
} from "../../../utils/embeds/middleman.embed";
import { replyEmbedEphemeral } from "../../../utils/reply";
import {
  buildMiddlemanOrderModal,
  extractMiddlemanModalInput,
  isMiddlemanSessionId,
} from "./middleman.modal";
import { guardMiddlemanOrderAvailable } from "../../../utils/middleman-order-guard";
import { serviceStatusService } from "../../../services/service-status.service";
import { MiddlemanOrderSessionStatus } from "../../../../database/models/middleman-order-session.model";
import { middlemanOrderSessionRepository } from "../../../../database/repositories/middleman-order-session.repository";
import { buildActiveTicketWarningEmbed, buildBulkChoiceRow } from "../../../utils/embeds/bulk-ticket.embed";
import { logger } from "../../../../shared/logger";
import { calculateMiddlemanFee, MIDDLEMAN_TIERS } from "../../../../shared/middleman";
import { formatIdr } from "../../../utils/pricing";

async function acknowledgePreviewInteraction(interaction: ButtonInteraction | StringSelectMenuInteraction): Promise<void> {
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

async function processMiddlemanOrderForm(
  interaction: ModalSubmitInteraction,
  targetId?: string,
): Promise<void> {
  const input = extractMiddlemanModalInput(interaction);

  if (!interaction.inGuild() || !interaction.guild) {
    await replyEmbedEphemeral(
      interaction,
      createMiddlemanErrorEmbed("❌ TERJADI KESALAHAN", "Pesanan hanya dapat dibuat di dalam server."),
    );
    return;
  }

  if (!(await guardMiddlemanOrderAvailable(interaction, interaction.guild.id))) {
    return;
  }

  const party1Error = validateMiddlemanUsername(input.party1Username ?? "", "Username Pihak 1");
  if (party1Error) {
    await replyEmbedEphemeral(interaction, buildMiddlemanValidationErrorEmbed(party1Error));
    return;
  }

  const party2Error = validateMiddlemanUsername(input.party2Username ?? "", "Username Pihak 2");
  if (party2Error) {
    await replyEmbedEphemeral(interaction, buildMiddlemanValidationErrorEmbed(party2Error));
    return;
  }

  const detailError = validateMiddlemanTransactionDetail(input.transactionDetail ?? "");
  if (detailError) {
    await replyEmbedEphemeral(interaction, buildMiddlemanValidationErrorEmbed(detailError));
    return;
  }

  let sessionId: string | undefined;
  let transactionAmountIdr = 0;

  if (targetId && isMiddlemanSessionId(targetId)) {
    sessionId = targetId;
    const existingSession = await middlemanOrderSessionService.getSession(sessionId);

    if (!existingSession || existingSession.userId !== interaction.user.id) {
      await replyEmbedEphemeral(
        interaction,
        createMiddlemanErrorEmbed("❌ TERJADI KESALAHAN", "Sesi pesanan tidak ditemukan."),
      );
      return;
    }

    const usability = middlemanOrderSessionService.assertSessionUsable(
      existingSession,
      interaction.user.id,
    );

    if (usability !== "ok") {
      await replyEmbedEphemeral(
        interaction,
        createMiddlemanErrorEmbed("❌ TERJADI KESALAHAN", "Sesi pesanan tidak dapat diperbarui."),
      );
      return;
    }

    transactionAmountIdr = existingSession.transactionAmountIdr;
  } else if (targetId) {
    // If it's a new order, targetId holds the nominal
    transactionAmountIdr = parseInt(targetId, 10);
    if (isNaN(transactionAmountIdr)) {
      await replyEmbedEphemeral(
        interaction,
        createMiddlemanErrorEmbed("❌ TERJADI KESALAHAN", "Nominal transaksi tidak valid."),
      );
      return;
    }
  } else {
    await replyEmbedEphemeral(
      interaction,
      createMiddlemanErrorEmbed("❌ TERJADI KESALAHAN", "Data order tidak lengkap."),
    );
    return;
  }

  await interaction.deferReply({ flags: MessageFlags.Ephemeral });

  const payload = {
    guildId: interaction.guild.id,
    userId: interaction.user.id,
    transactionAmountIdr,
    party1Username: input.party1Username ?? "",
    party2Username: input.party2Username ?? "",
    transactionDetail: input.transactionDetail ?? "",
  };

  const session = sessionId
    ? await middlemanOrderSessionService.updateSession(sessionId, payload)
    : await middlemanOrderSessionService.createSession(payload);

  if (!session) {
    await interaction.editReply({
      embeds: [createMiddlemanErrorEmbed("❌ TERJADI KESALAHAN", "Gagal menyimpan pesanan.")],
    });
    return;
  }

  await interaction.editReply({
    embeds: [buildMiddlemanOrderPreviewEmbed(sessionToMiddlemanEmbedData(session))],
    components: [buildMiddlemanOrderPreviewRow(session.sessionId)],
  });
}

export async function handleMiddlemanSelectMenu(
  interaction: StringSelectMenuInteraction,
  parsed: ParsedCustomId,
): Promise<void> {
  logger.info(`[MIDDLEMAN DEBUG] select menu received`);
  logger.info(`[MIDDLEMAN DEBUG] customId=${interaction.customId}`);

  if (!interaction.inGuild() || !interaction.guild) {
    await replyEmbedEphemeral(
      interaction,
      createMiddlemanErrorEmbed("❌ TERJADI KESALAHAN", "Interaksi ini hanya tersedia di dalam server."),
    );
    return;
  }

  if (parsed.action === "select-tier") {
    if (!(await guardMiddlemanOrderAvailable(interaction, interaction.guild.id))) {
      return;
    }

    const valueStr = interaction.values[0];
    if (!valueStr) return;

    logger.info(`[MIDDLEMAN DEBUG] value=${valueStr}`);

    const nominal = parseInt(valueStr, 10);
    if (isNaN(nominal)) {
      logger.error(`[MIDDLEMAN DEBUG] Invalid tier`);
      await replyEmbedEphemeral(interaction, buildMiddlemanValidationErrorEmbed("Nominal transaksi tidak valid."));
      return;
    }

    const tierObj = MIDDLEMAN_TIERS.find((t) => t.value === nominal);
    const tierLabel = tierObj ? tierObj.label : formatIdr(nominal);

    const feeResult = calculateMiddlemanFee(nominal);

    logger.info(`[MIDDLEMAN DEBUG] fee=${feeResult.fee}`);

    // Since this interaction comes from the main non-ephemeral panel,
    // we must reply to it to create the ephemeral prompt.
    await interaction.reply({
      embeds: [buildMiddlemanOrderPromptEmbed(feeResult, tierLabel)],
      components: [buildMiddlemanOrderPromptRow(nominal)],
      flags: MessageFlags.Ephemeral
    });
  }
}

export async function handleMiddlemanButton(
  interaction: ButtonInteraction,
  parsed: ParsedCustomId,
): Promise<void> {
  if (!interaction.inGuild() || !interaction.guild) {
    await replyEmbedEphemeral(
      interaction,
      createMiddlemanErrorEmbed("❌ TERJADI KESALAHAN", "Interaksi ini hanya tersedia di dalam server."),
    );
    return;
  }

  switch (parsed.action) {
    case "order": {
      if (!(await guardMiddlemanOrderAvailable(interaction, interaction.guild.id))) {
        return;
      }

      if (!parsed.id) {
        await replyEmbedEphemeral(
          interaction,
          createMiddlemanErrorEmbed("⚠️ NOMINAL BELUM DIPILIH", "Silakan pilih nominal transaksi terlebih dahulu melalui menu di atas."),
        );
        return;
      }

      const nominal = parsed.id; // Passing nominal to modal
      await interaction.showModal(buildMiddlemanOrderModal(nominal));
      return;
    }

    case "edit": {
      if (!(await guardMiddlemanOrderAvailable(interaction, interaction.guild.id))) {
        return;
      }

      if (!parsed.id) {
        return;
      }

      const session = await middlemanOrderSessionService.getSession(parsed.id);

      if (!session) {
        await replyEmbedEphemeral(
          interaction,
          createMiddlemanErrorEmbed("❌ TERJADI KESALAHAN", "Sesi pesanan tidak ditemukan."),
        );
        return;
      }

      const usability = middlemanOrderSessionService.assertSessionUsable(session, interaction.user.id);

      if (usability === "expired") {
        await replyEmbedEphemeral(interaction, buildMiddlemanOrderExpiredEmbed());
        return;
      }

      if (usability !== "ok") {
        await replyEmbedEphemeral(
          interaction,
          createMiddlemanErrorEmbed("❌ TERJADI KESALAHAN", "Sesi pesanan tidak dapat diedit."),
        );
        return;
      }

      await interaction.showModal(
        buildMiddlemanOrderModal(session.sessionId, {
          party1Username: session.party1Username,
          party2Username: session.party2Username,
          transactionDetail: session.transactionDetail,
        }),
      );
      return;
    }

    case "cancel": {
      if (!parsed.id) {
        await replyEmbedEphemeral(
          interaction,
          createMiddlemanErrorEmbed("❌ TERJADI KESALAHAN", "Sesi pesanan tidak valid."),
        );
        return;
      }

      await acknowledgePreviewInteraction(interaction);

      const session = await middlemanOrderSessionService.getSession(parsed.id);

      if (!session || session.userId !== interaction.user.id) {
        await editPreviewInteraction(interaction, {
          embeds: [createMiddlemanErrorEmbed("❌ TERJADI KESALAHAN", "Sesi pesanan tidak ditemukan.")],
        });
        return;
      }

      const usability = middlemanOrderSessionService.assertSessionUsable(session, interaction.user.id);

      if (usability === "expired") {
        await editPreviewInteraction(interaction, {
          embeds: [buildMiddlemanOrderExpiredEmbed()],
          components: [buildMiddlemanOrderPreviewRow(session.sessionId, true)],
        });
        return;
      }

      if (usability !== "ok") {
        await editPreviewInteraction(interaction, {
          embeds: [buildMiddlemanOrderCancelledEmbed(session.orderCode)],
          components: [buildMiddlemanOrderPreviewRow(session.sessionId, true)],
        });
        return;
      }

      await middlemanOrderSessionService.cancelSession(session.sessionId);

      await editPreviewInteraction(interaction, {
        embeds: [buildMiddlemanOrderCancelledEmbed(session.orderCode)],
        components: [buildMiddlemanOrderPreviewRow(session.sessionId, true)],
      });
      return;
    }

    case "confirm": {
      if (!(await guardMiddlemanOrderAvailable(interaction, interaction.guild.id))) {
        return;
      }

      if (!parsed.id) {
        await replyEmbedEphemeral(
          interaction,
          createMiddlemanErrorEmbed("❌ TERJADI KESALAHAN", "Sesi pesanan tidak valid."),
        );
        return;
      }

      await acknowledgePreviewInteraction(interaction);

      const session = await middlemanOrderSessionService.getSession(parsed.id);

      if (!session || session.userId !== interaction.user.id) {
        await editPreviewInteraction(interaction, {
          embeds: [createMiddlemanErrorEmbed("❌ TERJADI KESALAHAN", "Sesi pesanan tidak ditemukan.")],
        });
        return;
      }

      const usability = middlemanOrderSessionService.assertSessionUsable(session, interaction.user.id);

      if (usability === "expired") {
        await editPreviewInteraction(interaction, {
          embeds: [buildMiddlemanOrderExpiredEmbed()],
          components: [buildMiddlemanOrderPreviewRow(session.sessionId, true)],
        });
        return;
      }

      if (usability === "cancelled") {
        await editPreviewInteraction(interaction, {
          embeds: [buildMiddlemanAlreadyCancelledEmbed(session.orderCode)],
          components: [buildMiddlemanOrderPreviewRow(session.sessionId, true)],
        });
        return;
      }

      if (usability === "confirmed") {
        const existingTicket = await ticketService.findOpenMiddlemanTicket(
          session.guildId,
          session.userId,
        );
        const mention = existingTicket ? `<#${existingTicket.channelId}>` : "ticket Anda";
        await editPreviewInteraction(interaction, {
          embeds: [buildMiddlemanAlreadyConfirmedEmbed(session.orderCode, mention)],
          components: [buildMiddlemanOrderPreviewRow(session.sessionId, true)],
        });
        return;
      }

      if (usability !== "ok") {
        await editPreviewInteraction(interaction, {
          embeds: [createMiddlemanErrorEmbed("❌ TERJADI KESALAHAN", "Sesi pesanan tidak dapat dikonfirmasi.")],
        });
        return;
      }

      const openTicket = await ticketService.findOpenTicketByUser(session.guildId, session.userId);

      if (openTicket) {
        await editPreviewInteraction(interaction, {
          embeds: [buildActiveTicketWarningEmbed(openTicket, ProductType.MIDDLEMAN)],
          components: [buildBulkChoiceRow(session.sessionId)],
        });
        return;
      }

      const config = await guildConfigService.getOrCreateGuildConfig(
        interaction.guild.id,
        interaction.guild.name,
      );

      try {
        if (!(await serviceStatusService.isEnabled(interaction.guild.id, "mmReber"))) {
          await middlemanOrderSessionRepository.updateBySessionId(session.sessionId, {
            status: MiddlemanOrderSessionStatus.PENDING,
          });
          await editPreviewInteraction(interaction, {
            embeds: [buildMiddlemanClosedEmbed()],
            components: [buildMiddlemanOrderPreviewRow(session.sessionId, true)],
          });
          return;
        }

        const confirmedSession = await middlemanOrderSessionService.confirmSession(session.sessionId);

        if (!confirmedSession) {
          await editPreviewInteraction(interaction, {
            embeds: [createMiddlemanErrorEmbed("❌ TERJADI KESALAHAN", "Gagal mengonfirmasi pesanan.")],
          });
          return;
        }

        if (!(await serviceStatusService.isEnabled(interaction.guild.id, "mmReber"))) {
          await middlemanOrderSessionRepository.updateBySessionId(confirmedSession.sessionId, {
            status: MiddlemanOrderSessionStatus.PENDING,
          });
          await editPreviewInteraction(interaction, {
            embeds: [buildMiddlemanClosedEmbed()],
            components: [buildMiddlemanOrderPreviewRow(confirmedSession.sessionId, true)],
          });
          return;
        }

        const ticket = await ticketService.createMiddlemanTicket(
          interaction.guild,
          config,
          confirmedSession,
          interaction.user.id,
        );

        await editPreviewInteraction(interaction, {
          embeds: [buildMiddlemanTicketSuccessEmbed(confirmedSession.orderCode, ticket.channelId)],
          components: [buildMiddlemanOrderPreviewRow(confirmedSession.sessionId, true)],
        });

        logger.order(
          `Middleman order ${confirmedSession.orderCode} confirmed by ${interaction.user.tag} → ticket ${ticket.ticketId}`,
        );
      } catch (error) {
        if (error instanceof TicketError) {
          if (error.message.includes("currently closed")) {
            await middlemanOrderSessionRepository.updateBySessionId(session.sessionId, {
              status: MiddlemanOrderSessionStatus.PENDING,
            });
            await editPreviewInteraction(interaction, {
              embeds: [buildMiddlemanClosedEmbed()],
              components: [buildMiddlemanOrderPreviewRow(session.sessionId, true)],
            });
            return;
          }

          await editPreviewInteraction(interaction, {
            embeds: [buildMiddlemanTicketErrorEmbed(error.code)],
          });
          return;
        }

        logger.error("Middleman confirm failed", error);
        await editPreviewInteraction(interaction, {
          embeds: [createMiddlemanErrorEmbed("❌ TERJADI KESALAHAN", "Gagal membuat ticket Middleman.")],
        });
      }

      return;
    }

    default:
      return;
  }
}

export async function handleMiddlemanModal(
  interaction: ModalSubmitInteraction,
  parsed: ParsedCustomId,
): Promise<void> {
  if (parsed.action !== "submit") {
    return;
  }

  await processMiddlemanOrderForm(interaction, parsed.id);
}
