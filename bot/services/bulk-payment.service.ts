import { randomUUID } from "node:crypto";
import type { Client, Message, TextChannel } from "discord.js";
import { ProductType } from "../../shared/products";
import type { TicketDocument } from "../../database/models/ticket.model";
import { TicketOrderItemStatus } from "../../database/models/ticket-order-item.model";
import { GiftOrderSessionStatus } from "../../database/models/gift-order-session.model";
import { RobuxOrderSessionStatus } from "../../database/models/robux-order-session.model";
import { LoginOrderSessionStatus } from "../../database/models/login-order-session.model";
import { LimitedOrderSessionStatus } from "../../database/models/limited-order-session.model";
import { MiddlemanOrderSessionStatus } from "../../database/models/middleman-order-session.model";
import { middlemanOrderSessionRepository } from "../../database/repositories/middleman-order-session.repository";
import { communityPayoutOrderSessionRepository } from "../../database/repositories/community-payout-order-session.repository";
import { TicketPaymentRecordStatus } from "../../database/models/ticket-payment-record.model";
import { ticketPaymentRecordRepository } from "../../database/repositories/ticket-payment-record.repository";
import { ticketOrderItemRepository } from "../../database/repositories/ticket-order-item.repository";
import { giftOrderSessionRepository } from "../../database/repositories/gift-order-session.repository";
import { robuxOrderSessionRepository } from "../../database/repositories/robux-order-session.repository";
import { loginOrderSessionRepository } from "../../database/repositories/login-order-session.repository";
import { limitedOrderSessionRepository } from "../../database/repositories/limited-order-session.repository";
import { ticketOrderItemService } from "./ticket-order-item.service";
import { ticketService } from "./ticket.service";
import { buildBulkPaymentReceivedEmbed } from "../utils/embeds/bulk-ticket.embed";
import { buildPaymentProofProcessingEmbed } from "../utils/embeds/gift-ticket.embed";
import { logger } from "../../shared/logger";

async function markSessionPaid(sessionId: string, productType: ProductType): Promise<void> {
  switch (productType) {
    case ProductType.GIFT_IN_GAME:
      await giftOrderSessionRepository.updateStatusToPaidIfConfirmed(sessionId);
      break;
    case ProductType.ROBUX_USERNAME:
      await robuxOrderSessionRepository.updateStatusToPaidIfConfirmed(sessionId);
      break;
    case ProductType.ROBUX_LOGIN:
      await loginOrderSessionRepository.updateStatusToPaidIfConfirmed(sessionId);
      break;
    case ProductType.ITEM_LIMITED:
      await limitedOrderSessionRepository.updateStatusToPaidIfConfirmed(sessionId);
      break;
    case ProductType.MIDDLEMAN:
      await middlemanOrderSessionRepository.updateStatusToPaidIfConfirmed(sessionId);
      break;
    case ProductType.COMMUNITY_PAYOUT:
      await communityPayoutOrderSessionRepository.updateStatusToPaidIfConfirmed(sessionId);
      break;
    default:
      break;
  }
}

export const bulkPaymentService = {
  async processTicketPayment(
    client: Client<true>,
    ticket: TicketDocument,
    message: Message,
    ticketChannel: TextChannel,
  ): Promise<boolean> {
    const existingRecord = await ticketPaymentRecordRepository.findByDiscordMessageId(message.id);

    if (existingRecord) {
      return true;
    }

    const items = await ticketOrderItemService.getOrderItemsForTicket(ticket);
    const pendingItems = items.filter((item) => item.orderStatus === TicketOrderItemStatus.PENDING_PAYMENT);

    if (pendingItems.length === 0) {
      return false;
    }

    const pendingTotal = pendingItems.reduce((sum, item) => sum + (item.price ?? 0), 0);
    const paymentAmount = pendingItems.length === 1 ? (pendingItems[0]!.price ?? 0) : pendingTotal;

    if (paymentAmount <= 0) {
      return false;
    }

    const processingMessage = await ticketChannel.send({
      embeds: [buildPaymentProofProcessingEmbed(pendingItems[0]!.orderCode)],
    });

    const { items: paidItems, appliedAmount } = await ticketOrderItemRepository.markPendingItemsPaidUpToAmount(
      ticket.ticketId,
      paymentAmount,
    );

    if (paidItems.length === 0) {
      await processingMessage.edit({
        embeds: [buildPaymentProofProcessingEmbed(pendingItems[0]!.orderCode)],
      });
      return false;
    }

    for (const item of paidItems) {
      await markSessionPaid(item.sessionId, item.productType);
    }

    await ticketPaymentRecordRepository.create({
      paymentId: randomUUID(),
      ticketId: ticket.ticketId,
      guildId: ticket.guildId,
      customerId: ticket.userId,
      amountIdr: appliedAmount,
      discordMessageId: message.id,
      status: TicketPaymentRecordStatus.RECORDED,
    });

    const totals = await ticketOrderItemService.syncTicketPaymentStatus(ticket.ticketId);
    const refreshedItems = await ticketOrderItemService.getOrderItemsForTicket(ticket);

    if (totals) {
      await ticketService.updateBulkTicketEmbed(client, ticket, refreshedItems, totals, ticketChannel);
    }

    const customerMention = `<@${ticket.userId}>`;

    await processingMessage.edit({
      embeds: [buildBulkPaymentReceivedEmbed(totals!, customerMention)],
    });

    logger.order(
      `[BULK PAYMENT] Ticket ${ticket.ticketId} payment ${appliedAmount} recorded (${paidItems.length} item(s))`,
    );

    return true;
  },
};
