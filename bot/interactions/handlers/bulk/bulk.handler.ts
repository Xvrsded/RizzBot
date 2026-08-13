import { type ButtonInteraction } from "discord.js";
import type { ParsedCustomId } from "../../custom-id";
import {
  bulkOrderService,
  createNewTicketForSession,
  resolveBulkSessionProductType,
} from "../../../services/bulk-order.service";
import { ticketService } from "../../../services/ticket.service";
import {
  buildBulkAddSuccessEmbed,
} from "../../../utils/embeds/bulk-ticket.embed";
import { createErrorEmbed } from "../../../utils/embeds/base.embed";
import { replyEmbedEphemeral } from "../../../utils/reply";
import { logger } from "../../../../shared/logger";

import { ProductType } from "../../../../shared/products";
import { giftOrderSessionRepository } from "../../../../database/repositories/gift-order-session.repository";
import { robuxOrderSessionRepository } from "../../../../database/repositories/robux-order-session.repository";
import { loginOrderSessionRepository } from "../../../../database/repositories/login-order-session.repository";
import { limitedOrderSessionRepository } from "../../../../database/repositories/limited-order-session.repository";
import { middlemanOrderSessionRepository } from "../../../../database/repositories/middleman-order-session.repository";

async function loadSessionOwner(sessionId: string): Promise<string | null> {
  const productType = await resolveBulkSessionProductType(sessionId);

  if (!productType) {
    return null;
  }

  switch (productType) {
    case ProductType.GIFT_IN_GAME: {
      const session = await giftOrderSessionRepository.findBySessionId(sessionId);
      return session?.userId ?? null;
    }
    case ProductType.ROBUX_USERNAME: {
      const session = await robuxOrderSessionRepository.findBySessionId(sessionId);
      return session?.userId ?? null;
    }
    case ProductType.ROBUX_LOGIN: {
      const session = await loginOrderSessionRepository.findBySessionId(sessionId);
      return session?.userId ?? null;
    }
    case ProductType.ITEM_LIMITED: {
      const session = await limitedOrderSessionRepository.findBySessionId(sessionId);
      return session?.userId ?? null;
    }
    case ProductType.MIDDLEMAN: {
      const session = await middlemanOrderSessionRepository.findBySessionId(sessionId);
      return session?.userId ?? null;
    }
    default:
      return null;
  }
}

export async function handleBulkButton(
  interaction: ButtonInteraction,
  parsed: ParsedCustomId,
): Promise<void> {
  if (!interaction.inGuild() || !interaction.guild || !parsed.id) {
    await replyEmbedEphemeral(
      interaction,
      createErrorEmbed("❌ TERJADI KESALAHAN", "Interaksi tidak valid."),
    );
    return;
  }

  const sessionId = parsed.id;
  const ownerId = await loadSessionOwner(sessionId);

  if (!ownerId || ownerId !== interaction.user.id) {
    await replyEmbedEphemeral(
      interaction,
      createErrorEmbed("❌ TERJADI KESALAHAN", "Sesi pesanan tidak ditemukan."),
    );
    return;
  }

  const productType = await resolveBulkSessionProductType(sessionId);

  if (!productType) {
    await replyEmbedEphemeral(
      interaction,
      createErrorEmbed("❌ TERJADI KESALAHAN", "Sesi pesanan tidak ditemukan."),
    );
    return;
  }

  if (parsed.action === "add") {
    const openTicket = await ticketService.findOpenTicketByUser(interaction.guild.id, interaction.user.id);

    if (!openTicket) {
      await replyEmbedEphemeral(
        interaction,
        createErrorEmbed("❌ TERJADI KESALAHAN", "Ticket aktif tidak ditemukan."),
      );
      return;
    }

    await interaction.deferUpdate();

    const result = await bulkOrderService.addSessionToExistingTicket(
      interaction.client,
      openTicket,
      sessionId,
      productType,
    );

    if (!result) {
      await interaction.editReply({
        embeds: [createErrorEmbed("❌ TERJADI KESALAHAN", "Gagal menambahkan pesanan ke ticket.")],
      });
      return;
    }

    await interaction.editReply({
      embeds: [buildBulkAddSuccessEmbed(openTicket.channelId, result.orderCode)],
    });
    return;
  }

  if (parsed.action === "new") {
    await interaction.deferUpdate();

    const ticket = await createNewTicketForSession(
      interaction.client,
      interaction.guild.id,
      interaction.guild.name,
      sessionId,
      productType,
      interaction.user.id,
    );

    if (!ticket) {
      await interaction.editReply({
        embeds: [createErrorEmbed("❌ TERJADI KESALAHAN", "Gagal membuat ticket baru.")],
      });
      return;
    }

    await interaction.editReply({
      embeds: [buildBulkAddSuccessEmbed(ticket.channelId, ticket.orderCode)],
    });

    logger.order(`[BULK] New ticket ${ticket.ticketId} created via bulk:new for session ${sessionId}`);
    return;
  }

  await replyEmbedEphemeral(
    interaction,
    createErrorEmbed("❌ TERJADI KESALAHAN", "Aksi tidak dikenali."),
  );
}
