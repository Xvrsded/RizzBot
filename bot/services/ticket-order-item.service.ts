import { randomUUID } from "node:crypto";
import { ProductType } from "../../shared/products";
import type { TicketDocument } from "../../database/models/ticket.model";
import { TicketPaymentStatus } from "../../database/models/ticket.model";
import {
  TicketOrderItemStatus,
  type TicketOrderItemDocument,
} from "../../database/models/ticket-order-item.model";
import { GiftOrderSessionStatus } from "../../database/models/gift-order-session.model";
import { RobuxOrderSessionStatus } from "../../database/models/robux-order-session.model";
import { LoginOrderSessionStatus } from "../../database/models/login-order-session.model";
import { LimitedOrderSessionStatus, LimitedPriceStatus } from "../../database/models/limited-order-session.model";
import type { GiftOrderSessionDocument } from "../../database/models/gift-order-session.model";
import type { RobuxOrderSessionDocument } from "../../database/models/robux-order-session.model";
import type { LoginOrderSessionDocument } from "../../database/models/login-order-session.model";
import type { LimitedOrderSessionDocument } from "../../database/models/limited-order-session.model";
import type { MiddlemanOrderSessionDocument } from "../../database/models/middleman-order-session.model";
import { MiddlemanOrderSessionStatus } from "../../database/models/middleman-order-session.model";
import { middlemanOrderSessionRepository } from "../../database/repositories/middleman-order-session.repository";
import type { CommunityPayoutOrderSessionDocument } from "../../database/models/community-payout-order-session.model";
import { CommunityPayoutOrderSessionStatus } from "../../database/models/community-payout-order-session.model";
import { communityPayoutOrderSessionRepository } from "../../database/repositories/community-payout-order-session.repository";
import { ticketOrderItemRepository } from "../../database/repositories/ticket-order-item.repository";
import { ticketPaymentRecordRepository } from "../../database/repositories/ticket-payment-record.repository";
import { ticketRepository } from "../../database/repositories/ticket.repository";
import { giftOrderSessionRepository } from "../../database/repositories/gift-order-session.repository";
import { robuxOrderSessionRepository } from "../../database/repositories/robux-order-session.repository";
import { loginOrderSessionRepository } from "../../database/repositories/login-order-session.repository";
import { limitedOrderSessionRepository } from "../../database/repositories/limited-order-session.repository";

export interface TicketOrderTotals {
  orderCount: number;
  totalRobux: number;
  totalPaymentIdr: number;
  totalPaidIdr: number;
  remainingIdr: number;
  paymentStatus: TicketPaymentStatus;
  productTypes: ProductType[];
}

type OrderSessionDocument =
  | GiftOrderSessionDocument
  | RobuxOrderSessionDocument
  | LoginOrderSessionDocument
  | LimitedOrderSessionDocument
  | MiddlemanOrderSessionDocument
  | CommunityPayoutOrderSessionDocument;

async function loadSessionForTicket(ticket: TicketDocument): Promise<OrderSessionDocument | null> {
  switch (ticket.productType) {
    case ProductType.GIFT_IN_GAME:
      return giftOrderSessionRepository.findBySessionId(ticket.sessionId);
    case ProductType.ROBUX_USERNAME:
      return robuxOrderSessionRepository.findBySessionId(ticket.sessionId);
    case ProductType.ROBUX_LOGIN:
      return loginOrderSessionRepository.findBySessionId(ticket.sessionId);
    case ProductType.ITEM_LIMITED:
      return limitedOrderSessionRepository.findBySessionId(ticket.sessionId);
    case ProductType.MIDDLEMAN:
      return middlemanOrderSessionRepository.findBySessionId(ticket.sessionId);
    case ProductType.COMMUNITY_PAYOUT:
      return communityPayoutOrderSessionRepository.findBySessionId(ticket.sessionId);
    default:
      return null;
  }
}

async function loadSessionByProductType(
  productType: ProductType,
  sessionId: string,
): Promise<OrderSessionDocument | null> {
  switch (productType) {
    case ProductType.GIFT_IN_GAME:
      return giftOrderSessionRepository.findBySessionId(sessionId);
    case ProductType.ROBUX_USERNAME:
      return robuxOrderSessionRepository.findBySessionId(sessionId);
    case ProductType.ROBUX_LOGIN:
      return loginOrderSessionRepository.findBySessionId(sessionId);
    case ProductType.ITEM_LIMITED:
      return limitedOrderSessionRepository.findBySessionId(sessionId);
    case ProductType.MIDDLEMAN:
      return middlemanOrderSessionRepository.findBySessionId(sessionId);
    case ProductType.COMMUNITY_PAYOUT:
      return communityPayoutOrderSessionRepository.findBySessionId(sessionId);
    default:
      return null;
  }
}

function buildLegacyOrderItem(
  ticket: TicketDocument,
  session: OrderSessionDocument,
): TicketOrderItemDocument {
  const base = {
    itemId: ticket.sessionId,
    ticketId: ticket.ticketId,
    guildId: ticket.guildId,
    customerId: ticket.userId,
    sessionId: ticket.sessionId,
    orderCode: ticket.orderCode,
    productType: ticket.productType,
    robloxUsername:
      ticket.productType === ProductType.MIDDLEMAN
        ? (session as MiddlemanOrderSessionDocument).party1Username
        : (session as GiftOrderSessionDocument).robloxUsername,
    createdAt: ticket.createdAt,
    updatedAt: ticket.updatedAt,
  } as TicketOrderItemDocument;

  if (ticket.productType === ProductType.GIFT_IN_GAME) {
    const gift = session as GiftOrderSessionDocument;
    Object.assign(base, {
      itemName: null,
      gamepassName: gift.gamepassName,
      gameName: gift.gameName,
      robuxAmount: gift.robuxAmount,
      price: gift.finalPrice,
      orderStatus:
        gift.status === "COMPLETED"
          ? TicketOrderItemStatus.COMPLETED
          : gift.status === "PAID"
            ? TicketOrderItemStatus.PAID
            : TicketOrderItemStatus.PENDING_PAYMENT,
    });
  } else if (
    ticket.productType === ProductType.ROBUX_USERNAME ||
    ticket.productType === ProductType.ROBUX_LOGIN ||
    ticket.productType === ProductType.COMMUNITY_PAYOUT
  ) {
    const robux = session as RobuxOrderSessionDocument | LoginOrderSessionDocument | CommunityPayoutOrderSessionDocument;
    Object.assign(base, {
      itemName: null,
      gamepassName: null,
      gameName: null,
      robuxAmount: robux.robuxAmount,
      price: robux.finalPrice,
      orderStatus:
        robux.status === "COMPLETED"
          ? TicketOrderItemStatus.COMPLETED
          : robux.status === "PAID"
            ? TicketOrderItemStatus.PAID
            : TicketOrderItemStatus.PENDING_PAYMENT,
    });
  } else if (ticket.productType === ProductType.MIDDLEMAN) {
    const middleman = session as MiddlemanOrderSessionDocument;
    Object.assign(base, {
      itemName: middleman.transactionDetail,
      gamepassName: middleman.party2Username,
      gameName: null,
      robuxAmount: null,
      price: middleman.finalPrice,
      orderStatus:
        middleman.status === MiddlemanOrderSessionStatus.COMPLETED
          ? TicketOrderItemStatus.COMPLETED
          : middleman.status === MiddlemanOrderSessionStatus.PAID
            ? TicketOrderItemStatus.PAID
            : TicketOrderItemStatus.PENDING_PAYMENT,
    });
  } else {
    const limited = session as LimitedOrderSessionDocument;
    Object.assign(base, {
      itemName: limited.itemName,
      gamepassName: null,
      gameName: null,
      robuxAmount: null,
      price:
        limited.priceStatus === LimitedPriceStatus.FINAL && limited.price !== null
          ? limited.price
          : null,
      orderStatus:
        limited.status === "COMPLETED"
          ? TicketOrderItemStatus.COMPLETED
          : limited.status === "PAID"
            ? TicketOrderItemStatus.PAID
            : TicketOrderItemStatus.PENDING_PAYMENT,
    });
  }

  return base;
}

function mapSessionToOrderItemFields(
  productType: ProductType,
  session: OrderSessionDocument,
): Omit<
  Parameters<typeof ticketOrderItemRepository.create>[0],
  "itemId" | "ticketId" | "guildId" | "customerId" | "sessionId" | "orderCode" | "productType" | "orderStatus"
> {
  if (productType === ProductType.GIFT_IN_GAME) {
    const gift = session as GiftOrderSessionDocument;
    return {
      robloxUsername: gift.robloxUsername,
      itemName: null,
      gamepassName: gift.gamepassName,
      gameName: gift.gameName,
      robuxAmount: gift.robuxAmount,
      price: gift.finalPrice,
    };
  }

  if (productType === ProductType.ROBUX_USERNAME || productType === ProductType.ROBUX_LOGIN) {
    const robux = session as RobuxOrderSessionDocument | LoginOrderSessionDocument;
    return {
      robloxUsername: robux.robloxUsername,
      itemName: null,
      gamepassName: null,
      gameName: null,
      robuxAmount: robux.robuxAmount,
      price: robux.finalPrice,
    };
  }

  if (productType === ProductType.COMMUNITY_PAYOUT) {
    const payout = session as CommunityPayoutOrderSessionDocument;
    return {
      robloxUsername: payout.robloxUsername,
      itemName: null,
      gamepassName: null,
      gameName: null,
      robuxAmount: payout.robuxAmount,
      price: payout.finalPrice,
    };
  }

  if (productType === ProductType.MIDDLEMAN) {
    const middleman = session as MiddlemanOrderSessionDocument;
    return {
      robloxUsername: middleman.party1Username,
      itemName: middleman.transactionDetail,
      gamepassName: middleman.party2Username,
      gameName: null,
      robuxAmount: null,
      price: middleman.finalPrice,
    };
  }

  const limited = session as LimitedOrderSessionDocument;
  return {
    robloxUsername: limited.robloxUsername,
    itemName: limited.itemName,
    gamepassName: null,
    gameName: null,
    robuxAmount: null,
    price:
      limited.priceStatus === LimitedPriceStatus.FINAL && limited.price !== null ? limited.price : null,
  };
}

export const ticketOrderItemService = {
  async getOrderItemsForTicket(ticket: TicketDocument): Promise<TicketOrderItemDocument[]> {
    const items = await ticketOrderItemRepository.findByTicketId(ticket.ticketId);

    if (items.length > 0) {
      return items;
    }

    const session = await loadSessionForTicket(ticket);

    if (!session) {
      return [];
    }

    return [buildLegacyOrderItem(ticket, session)];
  },

  async createFromSession(
    ticket: TicketDocument,
    session: OrderSessionDocument,
    productType: ProductType,
  ): Promise<TicketOrderItemDocument> {
    const existing = await ticketOrderItemRepository.findBySessionId(session.sessionId);

    if (existing) {
      return existing;
    }

    return ticketOrderItemRepository.create({
      itemId: randomUUID(),
      ticketId: ticket.ticketId,
      guildId: ticket.guildId,
      customerId: ticket.userId,
      sessionId: session.sessionId,
      orderCode: session.orderCode,
      productType,
      orderStatus: TicketOrderItemStatus.PENDING_PAYMENT,
      ...mapSessionToOrderItemFields(productType, session),
    });
  },

  async createFromSessionId(
    ticket: TicketDocument,
    sessionId: string,
    productType: ProductType,
  ): Promise<TicketOrderItemDocument | null> {
    const session = await loadSessionByProductType(productType, sessionId);

    if (!session) {
      return null;
    }

    return this.createFromSession(ticket, session, productType);
  },

  calculateTotals(
    items: TicketOrderItemDocument[],
    totalPaidIdr: number,
  ): TicketOrderTotals {
    const productTypes = [...new Set(items.map((item) => item.productType))];
    const totalRobux = items.reduce((sum, item) => sum + (item.robuxAmount ?? 0), 0);
    const totalPaymentIdr = items.reduce((sum, item) => sum + (item.price ?? 0), 0);
    const remainingIdr = Math.max(totalPaymentIdr - totalPaidIdr, 0);

    let paymentStatus = TicketPaymentStatus.PENDING_PAYMENT;

    if (totalPaymentIdr > 0 && totalPaidIdr >= totalPaymentIdr) {
      paymentStatus = TicketPaymentStatus.PAID;
    } else if (totalPaidIdr > 0) {
      paymentStatus = TicketPaymentStatus.PARTIAL;
    }

    return {
      orderCount: items.length,
      totalRobux,
      totalPaymentIdr,
      totalPaidIdr,
      remainingIdr,
      paymentStatus,
      productTypes,
    };
  },

  async syncTicketPaymentStatus(ticketId: string): Promise<TicketOrderTotals | null> {
    const ticket = await ticketRepository.findByTicketId(ticketId);

    if (!ticket) {
      return null;
    }

    const items = await this.getOrderItemsForTicket(ticket);
    const totalPaidIdr = await ticketPaymentRecordRepository.sumAmountByTicketId(ticketId);
    const totals = this.calculateTotals(items, totalPaidIdr);

    await ticketRepository.updateByTicketId(ticketId, {
      totalPaidIdr,
      paymentStatus: totals.paymentStatus,
      isBulk: items.length > 1,
    });

    return totals;
  },

  async markItemPaid(sessionId: string): Promise<void> {
    await ticketOrderItemRepository.updateBySessionId(sessionId, {
      orderStatus: TicketOrderItemStatus.PAID,
    });
  },

  async markItemCompleted(sessionId: string): Promise<void> {
    await ticketOrderItemRepository.updateBySessionId(sessionId, {
      orderStatus: TicketOrderItemStatus.COMPLETED,
    });
  },

  async completeAllOrderSessions(items: TicketOrderItemDocument[]): Promise<void> {
    for (const item of items) {
      switch (item.productType) {
        case ProductType.GIFT_IN_GAME:
          await giftOrderSessionRepository.updateBySessionId(item.sessionId, {
            status: GiftOrderSessionStatus.COMPLETED,
          });
          break;
        case ProductType.ROBUX_USERNAME:
          await robuxOrderSessionRepository.updateBySessionId(item.sessionId, {
            status: RobuxOrderSessionStatus.COMPLETED,
          });
          break;
        case ProductType.ROBUX_LOGIN:
          await loginOrderSessionRepository.updateBySessionId(item.sessionId, {
            status: LoginOrderSessionStatus.COMPLETED,
          });
          break;
        case ProductType.ITEM_LIMITED:
          await limitedOrderSessionRepository.updateBySessionId(item.sessionId, {
            status: LimitedOrderSessionStatus.COMPLETED,
            ...(item.price !== null
              ? { price: item.price, priceStatus: LimitedPriceStatus.FINAL }
              : {}),
          });
          break;
        case ProductType.MIDDLEMAN:
          await middlemanOrderSessionRepository.updateBySessionId(item.sessionId, {
            status: MiddlemanOrderSessionStatus.COMPLETED,
          });
          break;
        case ProductType.COMMUNITY_PAYOUT:
          await communityPayoutOrderSessionRepository.updateBySessionId(item.sessionId, {
            status: CommunityPayoutOrderSessionStatus.COMPLETED,
          });
          break;
        default:
          break;
      }

      await this.markItemCompleted(item.sessionId);
    }
  },
};
