import { randomUUID } from "node:crypto";
import type { Client, TextChannel } from "discord.js";
import { VOUCH_CHANNEL_ID } from "../../shared/products";
import type { TicketDocument } from "../../database/models/ticket.model";
import {
  VouchSessionStatus,
  type VouchSessionDocument,
} from "../../database/models/vouch-session.model";
import { vouchSessionRepository } from "../../database/repositories/vouch-session.repository";
import { ticketOrderItemRepository } from "../../database/repositories/ticket-order-item.repository";
import {
  buildPublicVouchEmbed,
  buildVouchDmEmbed,
  buildVouchOpenRow,
  buildVouchRequestEmbed,
  type BulkVouchSummary,
} from "../utils/embeds/vouch.embed";
import { logger } from "../../shared/logger";
import { ticketRepository } from "../../database/repositories/ticket.repository";
import { ticketOrderItemService } from "./ticket-order-item.service";

export const vouchService = {
  async getOrCreateVouchSession(
    ticket: TicketDocument,
    robloxUsername: string,
  ): Promise<VouchSessionDocument> {
    const items = await ticketOrderItemRepository.findByTicketId(ticket.ticketId);
    const orderId = items.length > 1 ? ticket.ticketId : ticket.sessionId;

    const existing = await vouchSessionRepository.findByOrderId(orderId);

    if (existing) {
      return existing;
    }

    return vouchSessionRepository.create({
      voucherId: randomUUID(),
      orderId,
      guildId: ticket.guildId,
      customerId: ticket.userId,
      productType: ticket.productType,
      orderCode: ticket.orderCode,
      robloxUsername,
      rating: null,
      review: null,
      status: VouchSessionStatus.PENDING,
      submittedAt: null,
    });
  },

  async sendVouchRequests(
    client: Client<true>,
    ticket: TicketDocument,
    vouchSession: VouchSessionDocument,
  ): Promise<void> {
    const disabled = vouchSession.status === VouchSessionStatus.SUBMITTED;
    const row = buildVouchOpenRow(vouchSession.voucherId, disabled);

    const channel = await client.channels.fetch(ticket.channelId).catch(() => null);

    if (channel?.isTextBased() && !channel.isDMBased()) {
      await (channel as TextChannel).send({
        embeds: [buildVouchRequestEmbed()],
        components: [row],
      });
    } else {
      logger.warn(`[VOUCH] Ticket channel ${ticket.channelId} unavailable for vouch request`);
    }

    try {
      const user = await client.users.fetch(ticket.userId);
      await user.send({
        embeds: [buildVouchDmEmbed(vouchSession.orderCode)],
        components: [row],
      });
    } catch (error) {
      logger.warn("[VOUCH] Unable to DM customer");
    }
  },

  async handleTransactionCompleted(
    client: Client<true>,
    ticket: TicketDocument,
    robloxUsername: string,
  ): Promise<VouchSessionDocument> {
    const vouchSession = await this.getOrCreateVouchSession(ticket, robloxUsername);
    await this.sendVouchRequests(client, ticket, vouchSession);
    logger.info(
      `[VOUCH] Created vouch session ${vouchSession.voucherId} for order ${vouchSession.orderCode}`,
    );
    return vouchSession;
  },

  async publishVouch(
    client: Client<true>,
    vouchSession: VouchSessionDocument,
    customerId: string,
  ): Promise<VouchSessionDocument | null> {
    const channel = await client.channels.fetch(VOUCH_CHANNEL_ID).catch(() => null);

    if (!channel?.isTextBased() || channel.isDMBased()) {
      logger.warn(`[VOUCH] Public vouch channel ${VOUCH_CHANNEL_ID} is unavailable`);
      return vouchSession;
    }

    const customer = await client.users.fetch(customerId).catch(() => null);

    if (!customer) {
      logger.warn(`[VOUCH] Customer ${customerId} not found for public vouch`);
      return vouchSession;
    }

    const submittedAt = vouchSession.submittedAt ?? new Date();
    let bulkSummary: BulkVouchSummary | undefined;

    const ticket = await ticketRepository.findByTicketId(vouchSession.orderId);

    if (ticket) {
      const items = await ticketOrderItemService.getOrderItemsForTicket(ticket);
      const totals = ticketOrderItemService.calculateTotals(items, ticket.totalPaidIdr ?? 0);

      if (items.length > 1) {
        bulkSummary = {
          orderCount: totals.orderCount,
          totalRobux: totals.totalRobux,
          totalPaymentIdr: totals.totalPaymentIdr,
          productTypes: totals.productTypes,
          orderCodes: items.map((item) => item.orderCode),
        };
      }
    }

    await channel.send({
      embeds: [buildPublicVouchEmbed(vouchSession, customer, submittedAt, bulkSummary)],
    });

    return vouchSession;
  },
};
