import { MessageFlags, type ButtonInteraction, type ModalSubmitInteraction } from "discord.js";
import type { ParsedCustomId } from "../../custom-id";
import { ProductType } from "../../../../shared/products";
import { interactionHasGiftTicketAdminOrOwnerRole } from "../../../permissions/gift-ticket";
import { giftOrderSessionRepository } from "../../../../database/repositories/gift-order-session.repository";
import { robuxOrderSessionRepository } from "../../../../database/repositories/robux-order-session.repository";
import { loginOrderSessionRepository } from "../../../../database/repositories/login-order-session.repository";
import { limitedOrderSessionRepository } from "../../../../database/repositories/limited-order-session.repository";
import { middlemanOrderSessionRepository } from "../../../../database/repositories/middleman-order-session.repository";
import { ticketService } from "../../../services/ticket.service";
import { ticketPaymentStatusService } from "../../../services/ticket-payment-status.service";
import { TicketError } from "../../../services/ticket.errors";
import { TicketStatus } from "../../../../database/models/ticket.model";
import {
  buildCopyUsernameEmbed,
  buildTicketAccessDeniedEmbed,
  buildTicketAlreadyCompletedEmbed,
  buildTicketClosedEmbed,
  buildTicketDeliveredSuccessEmbed,
} from "../../../utils/embeds/gift-ticket.embed";
import {
  buildLimitedInvalidPriceEmbed,
  buildLimitedPaymentNotPaidEmbed,
} from "../../../utils/embeds/limited-ticket.embed";
import { buildCommunityPayoutPaymentNotPaidEmbed } from "../../../utils/embeds/community-payout-ticket.embed";
import { followUpEmbedEphemeral, replyEmbedEphemeral } from "../../../utils/reply";
import { createErrorEmbed } from "../../../utils/embeds/base.embed";
import { parseIdrAmount } from "../../../utils/pricing";
import { logger } from "../../../../shared/logger";
import { buildLimitedDeliverPriceModal, extractDeliverPriceInput } from "./ticket.modal";
import { customerTierService } from "../../../services/customer-tier.service";

async function requireGiftTicketStaff(
  interaction: ButtonInteraction | ModalSubmitInteraction,
): Promise<boolean> {
  if (!interactionHasGiftTicketAdminOrOwnerRole(interaction)) {
    await replyEmbedEphemeral(interaction, buildTicketAccessDeniedEmbed());
    return false;
  }

  return true;
}

export async function handleTicketButton(
  interaction: ButtonInteraction,
  parsed: ParsedCustomId,
): Promise<void> {
  if (!interaction.inGuild() || !parsed.id) {
    await replyEmbedEphemeral(
      interaction,
      createErrorEmbed("❌ TERJADI KESALAHAN", "Ticket tidak valid."),
    );
    return;
  }

  const ticketId = parsed.id;
  const ticket = await ticketService.findByTicketId(ticketId);

  if (!ticket) {
    await replyEmbedEphemeral(
      interaction,
      createErrorEmbed("❌ TERJADI KESALAHAN", "Ticket tidak ditemukan."),
    );
    return;
  }

  switch (parsed.action) {
    case "deliver": {
      if (!(await requireGiftTicketStaff(interaction))) {
        return;
      }

      if (ticket.status !== TicketStatus.OPEN) {
        await replyEmbedEphemeral(interaction, buildTicketAlreadyCompletedEmbed());
        return;
      }

      if (ticket.productType === ProductType.ITEM_LIMITED) {
        const paid = await ticketPaymentStatusService.isTicketPaidForDelivery(ticket.ticketId);

        if (!paid) {
          await replyEmbedEphemeral(interaction, buildLimitedPaymentNotPaidEmbed());
          return;
        }

        await interaction.showModal(buildLimitedDeliverPriceModal(ticket.ticketId));
        return;
      }

      await interaction.deferUpdate();

      try {
        const result =
          ticket.productType === ProductType.COMMUNITY_PAYOUT
            ? await ticketService.markCommunityPayoutTicketDelivered(
                interaction.client,
                ticket,
                interaction.user.id,
                `<@${interaction.user.id}>`,
              )
            : ticket.productType === ProductType.MIDDLEMAN
              ? await ticketService.markMiddlemanTicketDelivered(
                  interaction.client,
                  ticket,
                  interaction.user.id,
                  `<@${interaction.user.id}>`,
                )
              : ticket.productType === ProductType.ROBUX_LOGIN
              ? await ticketService.markLoginTicketDelivered(
                  interaction.client,
                  ticket,
                  interaction.user.id,
                  `<@${interaction.user.id}>`,
                )
              : ticket.productType === ProductType.ROBUX_USERNAME
                ? await ticketService.markRobuxUsernameTicketDelivered(
                    interaction.client,
                    ticket,
                    interaction.user.id,
                    `<@${interaction.user.id}>`,
                  )
                : await ticketService.markGiftTicketDelivered(
                    interaction.client,
                    ticket,
                    interaction.user.id,
                    `<@${interaction.user.id}>`,
                  );

        await followUpEmbedEphemeral(interaction, buildTicketDeliveredSuccessEmbed(result.session.orderCode));

        // Auto-sync customer roles asynchronously
        customerTierService.syncCustomerRoles(interaction.client, ticket.guildId, ticket.userId).catch((error) => {
          logger.error(`Failed to auto-sync roles for user ${ticket.userId} after ticket delivered`, error);
        });
      } catch (error) {
        if (error instanceof TicketError) {
          if (error.code === "TICKET_ALREADY_COMPLETED") {
            await followUpEmbedEphemeral(interaction, buildTicketAlreadyCompletedEmbed());
            return;
          }

          if (error.code === "TICKET_PAYMENT_NOT_PAID") {
            await followUpEmbedEphemeral(
              interaction,
              ticket.productType === ProductType.COMMUNITY_PAYOUT
                ? buildCommunityPayoutPaymentNotPaidEmbed()
                : buildLimitedPaymentNotPaidEmbed(),
            );
            return;
          }
        }

        logger.error(`Mark delivered failed for ticket ${ticketId}`, error);
        await followUpEmbedEphemeral(
          interaction,
          createErrorEmbed("❌ TERJADI KESALAHAN", "Gagal menandai transaksi sebagai completed."),
        );
      }

      return;
    }

    case "copy": {
      if (!(await requireGiftTicketStaff(interaction))) {
        return;
      }

      if (ticket.productType === ProductType.MIDDLEMAN) {
        const mmSession = await middlemanOrderSessionRepository.findBySessionId(ticket.sessionId);

        if (!mmSession) {
          await replyEmbedEphemeral(
            interaction,
            createErrorEmbed("❌ TERJADI KESALAHAN", "Data pesanan tidak ditemukan."),
          );
          return;
        }

        await replyEmbedEphemeral(interaction, buildCopyUsernameEmbed(mmSession.party1Username));
        return;
      }

      const session =
        ticket.productType === ProductType.ITEM_LIMITED
          ? await limitedOrderSessionRepository.findBySessionId(ticket.sessionId)
          : ticket.productType === ProductType.ROBUX_LOGIN
            ? await loginOrderSessionRepository.findBySessionId(ticket.sessionId)
            : ticket.productType === ProductType.ROBUX_USERNAME
              ? await robuxOrderSessionRepository.findBySessionId(ticket.sessionId)
              : await giftOrderSessionRepository.findBySessionId(ticket.sessionId);

      if (!session) {
        await replyEmbedEphemeral(
          interaction,
          createErrorEmbed("❌ TERJADI KESALAHAN", "Data pesanan tidak ditemukan."),
        );
        return;
      }

      await replyEmbedEphemeral(interaction, buildCopyUsernameEmbed(session.robloxUsername));
      return;
    }

    case "close": {
      if (!(await requireGiftTicketStaff(interaction))) {
        return;
      }

      if (ticket.status === TicketStatus.CLOSED) {
        await replyEmbedEphemeral(
          interaction,
          createErrorEmbed("❌ TERJADI KESALAHAN", "Ticket sudah ditutup."),
        );
        return;
      }

      await interaction.deferUpdate();

      try {
        const staffMention = `<@${interaction.user.id}>`;
        const channel = interaction.channel;

        if (channel?.isTextBased() && !channel.isDMBased()) {
          await channel.send({ embeds: [buildTicketClosedEmbed(staffMention)] });
        }

        await ticketService.closeGiftTicket(interaction.client, ticketId, interaction.user.id);
      } catch (error) {
        logger.error(`Close ticket failed for ticket ${ticketId}`, error);
        await followUpEmbedEphemeral(
          interaction,
          createErrorEmbed("❌ TERJADI KESALAHAN", "Gagal menutup ticket."),
        );
      }

      return;
    }

    default: {
      await replyEmbedEphemeral(
        interaction,
        createErrorEmbed("❌ TERJADI KESALAHAN", "Aksi ticket tidak dikenali."),
      );
    }
  }
}

export async function handleTicketModal(
  interaction: ModalSubmitInteraction,
  parsed: ParsedCustomId,
): Promise<void> {
  if (parsed.action !== "deliver-price" || !parsed.id) {
    await replyEmbedEphemeral(
      interaction,
      createErrorEmbed("❌ TERJADI KESALAHAN", "Form tidak dikenali."),
    );
    return;
  }

  if (!(await requireGiftTicketStaff(interaction))) {
    return;
  }

  const ticketId = parsed.id;
  const ticket = await ticketService.findByTicketId(ticketId);

  if (!ticket || ticket.productType !== ProductType.ITEM_LIMITED) {
    await replyEmbedEphemeral(
      interaction,
      createErrorEmbed("❌ TERJADI KESALAHAN", "Ticket tidak valid."),
    );
    return;
  }

  if (ticket.status !== TicketStatus.OPEN) {
    await replyEmbedEphemeral(interaction, buildTicketAlreadyCompletedEmbed());
    return;
  }

  const finalPrice = parseIdrAmount(extractDeliverPriceInput(interaction));

  if (finalPrice === null) {
    await replyEmbedEphemeral(interaction, buildLimitedInvalidPriceEmbed());
    return;
  }

  await interaction.deferReply({ flags: MessageFlags.Ephemeral });

  try {
    const result = await ticketService.markLimitedTicketDelivered(
      interaction.client,
      ticket,
      interaction.user.id,
      `<@${interaction.user.id}>`,
      finalPrice,
    );

    await interaction.editReply({
      embeds: [buildTicketDeliveredSuccessEmbed(result.session.orderCode)],
    });

    // Auto-sync customer roles asynchronously
    customerTierService.syncCustomerRoles(interaction.client, ticket.guildId, ticket.userId).catch((error) => {
      logger.error(`Failed to auto-sync roles for user ${ticket.userId} after ticket delivered`, error);
    });
  } catch (error) {
    if (error instanceof TicketError) {
      if (error.code === "TICKET_ALREADY_COMPLETED") {
        await interaction.editReply({ embeds: [buildTicketAlreadyCompletedEmbed()] });
        return;
      }

      if (error.code === "TICKET_PAYMENT_NOT_PAID") {
        await interaction.editReply({ embeds: [buildLimitedPaymentNotPaidEmbed()] });
        return;
      }
    }

    logger.error(`Mark delivered failed for Item Limited ticket ${ticketId}`, error);
    await interaction.editReply({
      embeds: [createErrorEmbed("❌ TERJADI KESALAHAN", "Gagal menandai transaksi sebagai completed.")],
    });
  }
}
