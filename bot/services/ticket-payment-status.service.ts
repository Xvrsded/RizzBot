import { randomUUID } from "node:crypto";
import { ProductType } from "../../shared/products";
import type { TicketDocument } from "../../database/models/ticket.model";
import { TicketPaymentStatus } from "../../database/models/ticket.model";
import { TicketOrderItemStatus } from "../../database/models/ticket-order-item.model";
import { GiftOrderSessionStatus } from "../../database/models/gift-order-session.model";
import { RobuxOrderSessionStatus } from "../../database/models/robux-order-session.model";
import { LoginOrderSessionStatus } from "../../database/models/login-order-session.model";
import { LimitedOrderSessionStatus } from "../../database/models/limited-order-session.model";
import { MiddlemanOrderSessionStatus } from "../../database/models/middleman-order-session.model";
import { middlemanOrderSessionRepository } from "../../database/repositories/middleman-order-session.repository";
import { CommunityPayoutOrderSessionStatus } from "../../database/models/community-payout-order-session.model";
import { communityPayoutOrderSessionRepository } from "../../database/repositories/community-payout-order-session.repository";
import { TicketPaymentRecordStatus } from "../../database/models/ticket-payment-record.model";
import { ticketRepository } from "../../database/repositories/ticket.repository";
import { ticketOrderItemRepository } from "../../database/repositories/ticket-order-item.repository";
import { ticketPaymentRecordRepository } from "../../database/repositories/ticket-payment-record.repository";
import { giftOrderSessionRepository } from "../../database/repositories/gift-order-session.repository";
import { robuxOrderSessionRepository } from "../../database/repositories/robux-order-session.repository";
import { loginOrderSessionRepository } from "../../database/repositories/login-order-session.repository";
import { limitedOrderSessionRepository } from "../../database/repositories/limited-order-session.repository";
import { ticketOrderItemService } from "./ticket-order-item.service";
import { TicketError } from "./ticket.errors";
import { logger } from "../../shared/logger";

type SessionStatus =
  | GiftOrderSessionStatus
  | RobuxOrderSessionStatus
  | LoginOrderSessionStatus
  | LimitedOrderSessionStatus
  | MiddlemanOrderSessionStatus
  | CommunityPayoutOrderSessionStatus;

function isSessionPaid(status: SessionStatus): boolean {
  return (
    status === GiftOrderSessionStatus.PAID ||
    status === RobuxOrderSessionStatus.PAID ||
    status === LoginOrderSessionStatus.PAID ||
    status === LimitedOrderSessionStatus.PAID ||
    status === MiddlemanOrderSessionStatus.PAID ||
    status === CommunityPayoutOrderSessionStatus.PAID
  );
}

async function loadSessionStatus(productType: ProductType, sessionId: string): Promise<SessionStatus | null> {
  switch (productType) {
    case ProductType.GIFT_IN_GAME: {
      const session = await giftOrderSessionRepository.findBySessionId(sessionId);
      return session?.status ?? null;
    }
    case ProductType.ROBUX_USERNAME: {
      const session = await robuxOrderSessionRepository.findBySessionId(sessionId);
      return session?.status ?? null;
    }
    case ProductType.ROBUX_LOGIN: {
      const session = await loginOrderSessionRepository.findBySessionId(sessionId);
      return session?.status ?? null;
    }
    case ProductType.ITEM_LIMITED: {
      const session = await limitedOrderSessionRepository.findBySessionId(sessionId);
      return session?.status ?? null;
    }
    case ProductType.MIDDLEMAN: {
      const session = await middlemanOrderSessionRepository.findBySessionId(sessionId);
      return session?.status ?? null;
    }
    case ProductType.COMMUNITY_PAYOUT: {
      const session = await communityPayoutOrderSessionRepository.findBySessionId(sessionId);
      return session?.status ?? null;
    }
    default:
      return null;
  }
}

async function loadPrimarySessionStatus(ticket: TicketDocument): Promise<SessionStatus | null> {
  return loadSessionStatus(ticket.productType, ticket.sessionId);
}

export interface TicketPaymentEvaluation {
  paid: boolean;
  ticketId: string;
  ticketPaymentStatus: TicketPaymentStatus;
  totalsPaymentStatus: TicketPaymentStatus | null;
  totalPaidIdr: number;
  totalPaymentIdr: number;
  unpaidItemCount: number;
  itemStatuses: Array<{ orderCode: string; sessionId: string; orderStatus: string }>;
  primarySessionStatus: SessionStatus | null;
}

export interface MarkDeliveredDebugContext {
  channelId?: string;
  orderType?: ProductType;
  customerId?: string;
}

function logMarkDeliveredDebug(
  evaluation: TicketPaymentEvaluation,
  context?: MarkDeliveredDebugContext,
): void {
  logger.info(
    [
      "[MARK DELIVERED DEBUG]",
      `channelId=${context?.channelId ?? "unknown"}`,
      `ticketId=${evaluation.ticketId}`,
      `orderType=${context?.orderType ?? "unknown"}`,
      `paymentStatusFromDB=${evaluation.ticketPaymentStatus}`,
      `totalsPaymentStatus=${evaluation.totalsPaymentStatus ?? "none"}`,
      `totalPaidIdr=${evaluation.totalPaidIdr}`,
      `totalPaymentIdr=${evaluation.totalPaymentIdr}`,
      `unpaidItemCount=${evaluation.unpaidItemCount}`,
      `primarySessionStatus=${evaluation.primarySessionStatus ?? "none"}`,
      `itemStatuses=${JSON.stringify(evaluation.itemStatuses)}`,
      `paymentStatusExpected=${TicketPaymentStatus.PAID}`,
      `customerId=${context?.customerId ?? "unknown"}`,
      `isPaid=${evaluation.paid}`,
    ].join(" "),
  );
}

export const ticketPaymentStatusService = {
  async syncAfterLegacySessionPaid(ticket: TicketDocument, discordMessageId: string): Promise<void> {
    const items = await ticketOrderItemRepository.findByTicketId(ticket.ticketId);

    if (items.length === 0) {
      return;
    }

    await ticketOrderItemService.markItemPaid(ticket.sessionId);

    const primaryItem = items.find((item) => item.sessionId === ticket.sessionId) ?? items[0]!;
    const paymentAmount = primaryItem.price ?? 0;

    const existingRecord = await ticketPaymentRecordRepository.findByDiscordMessageId(discordMessageId);

    if (!existingRecord && paymentAmount > 0) {
      await ticketPaymentRecordRepository.create({
        paymentId: randomUUID(),
        ticketId: ticket.ticketId,
        guildId: ticket.guildId,
        customerId: ticket.userId,
        amountIdr: paymentAmount,
        discordMessageId,
        status: TicketPaymentRecordStatus.RECORDED,
      });
    }

    const totals = await ticketOrderItemService.syncTicketPaymentStatus(ticket.ticketId);
    const refreshedItems = await ticketOrderItemRepository.findByTicketId(ticket.ticketId);
    const unpaid = refreshedItems.filter(
      (item) => item.orderStatus === TicketOrderItemStatus.PENDING_PAYMENT,
    );

    if (unpaid.length === 0 && totals && totals.paymentStatus !== TicketPaymentStatus.PAID) {
      await ticketRepository.updateByTicketId(ticket.ticketId, {
        paymentStatus: TicketPaymentStatus.PAID,
      });
    }

    logger.order(
      `[PAYMENT SYNC] Legacy payment synced to order items for ticket ${ticket.ticketId} (session ${ticket.sessionId})`,
    );
  },

  async healDesyncedOrderItems(ticketId: string): Promise<boolean> {
    const items = await ticketOrderItemRepository.findByTicketId(ticketId);
    const unpaid = items.filter((item) => item.orderStatus === TicketOrderItemStatus.PENDING_PAYMENT);

    if (unpaid.length === 0) {
      return false;
    }

    let healed = false;

    for (const item of unpaid) {
      const sessionStatus = await loadSessionStatus(item.productType, item.sessionId);

      if (sessionStatus && isSessionPaid(sessionStatus)) {
        await ticketOrderItemService.markItemPaid(item.sessionId);
        healed = true;
      }
    }

    if (!healed) {
      return false;
    }

    await ticketOrderItemService.syncTicketPaymentStatus(ticketId);

    const refreshedItems = await ticketOrderItemRepository.findByTicketId(ticketId);
    const stillUnpaid = refreshedItems.filter(
      (item) => item.orderStatus === TicketOrderItemStatus.PENDING_PAYMENT,
    );

    if (stillUnpaid.length === 0) {
      const totalPaidIdr = await ticketPaymentRecordRepository.sumAmountByTicketId(ticketId);
      const totals = ticketOrderItemService.calculateTotals(refreshedItems, totalPaidIdr);

      if (totals.paymentStatus !== TicketPaymentStatus.PAID) {
        await ticketRepository.updateByTicketId(ticketId, {
          paymentStatus: TicketPaymentStatus.PAID,
        });
      }
    }

    logger.order(`[PAYMENT SYNC] Healed desynced order items for ticket ${ticketId}`);
    return true;
  },

  async evaluateForDelivery(ticketId: string): Promise<TicketPaymentEvaluation | null> {
    const ticket = await ticketRepository.findByTicketId(ticketId);

    if (!ticket) {
      return null;
    }

    const items = await ticketOrderItemRepository.findByTicketId(ticketId);
    const totalPaidIdr = await ticketPaymentRecordRepository.sumAmountByTicketId(ticketId);
    const totals = items.length > 0 ? ticketOrderItemService.calculateTotals(items, totalPaidIdr) : null;
    const primarySessionStatus = await loadPrimarySessionStatus(ticket);
    const unpaidItems = items.filter(
      (item) => item.orderStatus === TicketOrderItemStatus.PENDING_PAYMENT,
    );

    let paid = false;

    if (items.length > 0) {
      if (
        unpaidItems.length === 0 &&
        items.every(
          (item) =>
            item.orderStatus === TicketOrderItemStatus.PAID ||
            item.orderStatus === TicketOrderItemStatus.COMPLETED,
        )
      ) {
        paid = true;
      }

      if (!paid && totals?.paymentStatus === TicketPaymentStatus.PAID) {
        paid = true;
      }

      if (!paid && ticket.paymentStatus === TicketPaymentStatus.PAID) {
        paid = true;
      }
    } else if (primarySessionStatus && isSessionPaid(primarySessionStatus)) {
      paid = true;
    }

    return {
      paid,
      ticketId,
      ticketPaymentStatus: ticket.paymentStatus,
      totalsPaymentStatus: totals?.paymentStatus ?? null,
      totalPaidIdr,
      totalPaymentIdr: totals?.totalPaymentIdr ?? 0,
      unpaidItemCount: unpaidItems.length,
      itemStatuses: items.map((item) => ({
        orderCode: item.orderCode,
        sessionId: item.sessionId,
        orderStatus: item.orderStatus,
      })),
      primarySessionStatus,
    };
  },

  async isTicketPaidForDelivery(ticketId: string): Promise<boolean> {
    await this.healDesyncedOrderItems(ticketId);
    const evaluation = await this.evaluateForDelivery(ticketId);
    return evaluation?.paid ?? false;
  },

  async assertPaidForDelivery(ticketId: string, context?: MarkDeliveredDebugContext): Promise<void> {
    await this.healDesyncedOrderItems(ticketId);

    const evaluation = await this.evaluateForDelivery(ticketId);

    if (!evaluation) {
      throw new TicketError("TICKET_CREATE_FAILED", "ORDER_NOT_FOUND");
    }

    logMarkDeliveredDebug(evaluation, context);

    if (!evaluation.paid) {
      throw new TicketError(
        "TICKET_PAYMENT_NOT_PAID",
        "Pesanan belum dapat ditandai sebagai selesai karena status pembayaran masih belum PAID.",
      );
    }
  },
};
