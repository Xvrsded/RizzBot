import type { Attachment, Message, TextChannel } from "discord.js";
import { ProductType } from "../../shared/products";
import { giftOrderSessionRepository } from "../../database/repositories/gift-order-session.repository";
import { robuxOrderSessionRepository } from "../../database/repositories/robux-order-session.repository";
import { loginOrderSessionRepository } from "../../database/repositories/login-order-session.repository";
import { LoginOrderSessionStatus } from "../../database/models/login-order-session.model";
import { limitedOrderSessionRepository } from "../../database/repositories/limited-order-session.repository";
import { LimitedOrderSessionStatus } from "../../database/models/limited-order-session.model";
import { middlemanOrderSessionRepository } from "../../database/repositories/middleman-order-session.repository";
import { MiddlemanOrderSessionStatus } from "../../database/models/middleman-order-session.model";
import { communityPayoutOrderSessionRepository } from "../../database/repositories/community-payout-order-session.repository";
import { CommunityPayoutOrderSessionStatus } from "../../database/models/community-payout-order-session.model";
import { ticketRepository } from "../../database/repositories/ticket.repository";
import { GiftOrderSessionStatus } from "../../database/models/gift-order-session.model";
import { RobuxOrderSessionStatus } from "../../database/models/robux-order-session.model";
import { TicketStatus } from "../../database/models/ticket.model";
import { ticketService } from "./ticket.service";
import { ticketPaymentStatusService } from "./ticket-payment-status.service";
import {
  buildPaymentProofFailedEmbed,
  buildPaymentProofProcessingEmbed,
  buildPaymentProofReceivedEmbed,
} from "../utils/embeds/gift-ticket.embed";
import {
  buildRobuxPaymentProofFailedEmbed,
  buildRobuxPaymentProofProcessingEmbed,
  buildRobuxPaymentProofReceivedEmbed,
} from "../utils/embeds/robux-ticket.embed";
import {
  buildLoginPaymentProofFailedEmbed,
  buildLoginPaymentProofProcessingEmbed,
  buildLoginPaymentProofReceivedEmbed,
} from "../utils/embeds/login-ticket.embed";
import {
  buildLimitedPaymentProofFailedEmbed,
  buildLimitedPaymentProofProcessingEmbed,
  buildLimitedPaymentProofReceivedEmbed,
} from "../utils/embeds/limited-ticket.embed";
import {
  buildMiddlemanPaymentProofFailedEmbed,
  buildMiddlemanPaymentProofProcessingEmbed,
  buildMiddlemanPaymentProofReceivedEmbed,
} from "../utils/embeds/middleman-ticket.embed";
import {
  buildCommunityPayoutPaymentProofFailedEmbed,
  buildCommunityPayoutPaymentProofProcessingEmbed,
  buildCommunityPayoutPaymentProofReceivedEmbed,
} from "../utils/embeds/community-payout-ticket.embed";
import { bulkPaymentService } from "./bulk-payment.service";
import { ticketOrderItemService } from "./ticket-order-item.service";
import { logger } from "../../shared/logger";

const IMAGE_CONTENT_TYPES = new Set(["image/png", "image/jpeg", "image/jpg", "image/webp"]);
const IMAGE_EXTENSION_PATTERN = /\.(png|jpe?g|webp)(\?|$)/i;
const processedPaymentMessageIds = new Set<string>();
const processingPaymentMessageIds = new Set<string>();
const processingOrderSessionIds = new Set<string>();

const SUPPORTED_PRODUCT_TYPES = new Set<ProductType>([
  ProductType.GIFT_IN_GAME,
  ProductType.ROBUX_USERNAME,
  ProductType.ROBUX_LOGIN,
  ProductType.ITEM_LIMITED,
  ProductType.MIDDLEMAN,
  ProductType.COMMUNITY_PAYOUT,
]);

class PaymentPerf {
  private readonly startedAt = performance.now();
  private lastMark = this.startedAt;

  mark(label: string): void {
    const now = performance.now();
    logger.info(`[PAYMENT PERF] ${label}: ${Math.round(now - this.lastMark)}ms`);
    this.lastMark = now;
  }

  total(): void {
    logger.info(`[PAYMENT PERF] total: ${Math.round(performance.now() - this.startedAt)}ms`);
  }
}

function paymentLog(message: string): void {
  logger.info(`[PAYMENT] ${message}`);
}

function paymentError(message: string): void {
  logger.error(`[PAYMENT ERROR] ${message}`);
}

function isImageAttachment(attachment: Attachment): boolean {
  const contentType = attachment.contentType?.toLowerCase() ?? "";

  if (contentType.startsWith("image/") || IMAGE_CONTENT_TYPES.has(contentType)) {
    return true;
  }

  const fileName = attachment.name?.toLowerCase() ?? "";
  if (IMAGE_EXTENSION_PATTERN.test(fileName)) {
    return true;
  }

  return IMAGE_EXTENSION_PATTERN.test(attachment.url.toLowerCase());
}

function findFirstImageAttachment(message: Message): Attachment | undefined {
  return [...message.attachments.values()].find(isImageAttachment);
}

async function resolveMessageAttachments(message: Message): Promise<Message | null> {
  if (findFirstImageAttachment(message)) {
    return message;
  }

  return message.fetch().catch((error) => {
    paymentError("Failed to fetch message for attachment resolution");
    logger.error("Payment proof: failed to fetch message", error);
    return null;
  });
}

interface PaymentOrderSession {
  sessionId: string;
  orderCode: string;
  status:
    | GiftOrderSessionStatus
    | RobuxOrderSessionStatus
    | LoginOrderSessionStatus
    | LimitedOrderSessionStatus
    | MiddlemanOrderSessionStatus
    | CommunityPayoutOrderSessionStatus;
}

async function loadOrderSession(ticket: {
  sessionId: string;
  productType: ProductType;
}): Promise<PaymentOrderSession | null> {
  if (ticket.productType === ProductType.COMMUNITY_PAYOUT) {
    const session = await communityPayoutOrderSessionRepository.findBySessionId(ticket.sessionId);

    if (!session) {
      return null;
    }

    return {
      sessionId: session.sessionId,
      orderCode: session.orderCode,
      status: session.status,
    };
  }

  if (ticket.productType === ProductType.MIDDLEMAN) {
    const session = await middlemanOrderSessionRepository.findBySessionId(ticket.sessionId);

    if (!session) {
      return null;
    }

    return {
      sessionId: session.sessionId,
      orderCode: session.orderCode,
      status: session.status,
    };
  }

  if (ticket.productType === ProductType.ITEM_LIMITED) {
    const session = await limitedOrderSessionRepository.findBySessionId(ticket.sessionId);

    if (!session) {
      return null;
    }

    return {
      sessionId: session.sessionId,
      orderCode: session.orderCode,
      status: session.status,
    };
  }

  if (ticket.productType === ProductType.ROBUX_LOGIN) {
    const session = await loginOrderSessionRepository.findBySessionId(ticket.sessionId);

    if (!session) {
      return null;
    }

    return {
      sessionId: session.sessionId,
      orderCode: session.orderCode,
      status: session.status,
    };
  }

  if (ticket.productType === ProductType.ROBUX_USERNAME) {
    const session = await robuxOrderSessionRepository.findBySessionId(ticket.sessionId);

    if (!session) {
      return null;
    }

    return {
      sessionId: session.sessionId,
      orderCode: session.orderCode,
      status: session.status,
    };
  }

  const session = await giftOrderSessionRepository.findBySessionId(ticket.sessionId);

  if (!session) {
    return null;
  }

  return {
    sessionId: session.sessionId,
    orderCode: session.orderCode,
    status: session.status,
  };
}

function isPendingPayment(
  status:
    | GiftOrderSessionStatus
    | RobuxOrderSessionStatus
    | LoginOrderSessionStatus
    | LimitedOrderSessionStatus
    | MiddlemanOrderSessionStatus
    | CommunityPayoutOrderSessionStatus,
): boolean {
  return (
    status === GiftOrderSessionStatus.CONFIRMED ||
    status === RobuxOrderSessionStatus.CONFIRMED ||
    status === LoginOrderSessionStatus.CONFIRMED ||
    status === LimitedOrderSessionStatus.CONFIRMED ||
    status === MiddlemanOrderSessionStatus.CONFIRMED ||
    status === CommunityPayoutOrderSessionStatus.CONFIRMED
  );
}

function isPaid(
  status:
    | GiftOrderSessionStatus
    | RobuxOrderSessionStatus
    | LoginOrderSessionStatus
    | LimitedOrderSessionStatus
    | MiddlemanOrderSessionStatus
    | CommunityPayoutOrderSessionStatus,
): boolean {
  return (
    status === GiftOrderSessionStatus.PAID ||
    status === RobuxOrderSessionStatus.PAID ||
    status === LoginOrderSessionStatus.PAID ||
    status === LimitedOrderSessionStatus.PAID ||
    status === MiddlemanOrderSessionStatus.PAID ||
    status === CommunityPayoutOrderSessionStatus.PAID
  );
}

function isCompleted(
  status:
    | GiftOrderSessionStatus
    | RobuxOrderSessionStatus
    | LoginOrderSessionStatus
    | LimitedOrderSessionStatus
    | MiddlemanOrderSessionStatus
    | CommunityPayoutOrderSessionStatus,
): boolean {
  return (
    status === GiftOrderSessionStatus.COMPLETED ||
    status === RobuxOrderSessionStatus.COMPLETED ||
    status === LoginOrderSessionStatus.COMPLETED ||
    status === LimitedOrderSessionStatus.COMPLETED ||
    status === MiddlemanOrderSessionStatus.COMPLETED ||
    status === CommunityPayoutOrderSessionStatus.COMPLETED
  );
}

async function updateOrderToPaid(
  ticket: { sessionId: string; productType: ProductType },
): Promise<PaymentOrderSession | null> {
  if (ticket.productType === ProductType.COMMUNITY_PAYOUT) {
    const updated = await communityPayoutOrderSessionRepository.updateStatusToPaidIfConfirmed(
      ticket.sessionId,
    );

    if (!updated) {
      return null;
    }

    return {
      sessionId: updated.sessionId,
      orderCode: updated.orderCode,
      status: updated.status,
    };
  }

  if (ticket.productType === ProductType.MIDDLEMAN) {
    const updated = await middlemanOrderSessionRepository.updateStatusToPaidIfConfirmed(ticket.sessionId);

    if (!updated) {
      return null;
    }

    return {
      sessionId: updated.sessionId,
      orderCode: updated.orderCode,
      status: updated.status,
    };
  }

  if (ticket.productType === ProductType.ITEM_LIMITED) {
    const updated = await limitedOrderSessionRepository.updateStatusToPaidIfConfirmed(ticket.sessionId);

    if (!updated) {
      return null;
    }

    return {
      sessionId: updated.sessionId,
      orderCode: updated.orderCode,
      status: updated.status,
    };
  }

  if (ticket.productType === ProductType.ROBUX_LOGIN) {
    const updated = await loginOrderSessionRepository.updateStatusToPaidIfConfirmed(ticket.sessionId);

    if (!updated) {
      return null;
    }

    return {
      sessionId: updated.sessionId,
      orderCode: updated.orderCode,
      status: updated.status,
    };
  }

  if (ticket.productType === ProductType.ROBUX_USERNAME) {
    const updated = await robuxOrderSessionRepository.updateStatusToPaidIfConfirmed(ticket.sessionId);

    if (!updated) {
      return null;
    }

    return {
      sessionId: updated.sessionId,
      orderCode: updated.orderCode,
      status: updated.status,
    };
  }

  const updated = await giftOrderSessionRepository.updateStatusToPaidIfConfirmed(ticket.sessionId);

  if (!updated) {
    return null;
  }

  return {
    sessionId: updated.sessionId,
    orderCode: updated.orderCode,
    status: updated.status,
  };
}

export const paymentProofService = {
  async handleTicketMessage(message: Message): Promise<void> {
    if (!message.guild || message.author.bot) {
      return;
    }

    const perf = new PaymentPerf();
    perf.mark("detection started");

    const [fetchedMessage, ticket] = await Promise.all([
      resolveMessageAttachments(message),
      ticketRepository.findByChannelId(message.channel.id),
    ]);

    perf.mark("message fetch + ticket lookup");

    if (!fetchedMessage) {
      perf.total();
      return;
    }

    const imageAttachment = findFirstImageAttachment(fetchedMessage);

    if (!imageAttachment) {
      perf.total();
      return;
    }

    if (processedPaymentMessageIds.has(fetchedMessage.id)) {
      paymentLog(`Duplicate message skipped: ${fetchedMessage.id}`);
      perf.total();
      return;
    }

    if (processingPaymentMessageIds.has(fetchedMessage.id)) {
      paymentLog(`Message already processing: ${fetchedMessage.id}`);
      perf.total();
      return;
    }

    paymentLog("Payment proof detected");

    if (!ticket || !SUPPORTED_PRODUCT_TYPES.has(ticket.productType)) {
      perf.total();
      return;
    }

    if (ticket.status !== TicketStatus.OPEN) {
      perf.total();
      return;
    }

    if (fetchedMessage.author.id !== ticket.userId) {
      perf.total();
      return;
    }

    if (!fetchedMessage.channel.isTextBased() || fetchedMessage.channel.isDMBased()) {
      perf.total();
      return;
    }

    const ticketChannel = fetchedMessage.channel as TextChannel;

    if (processingPaymentMessageIds.has(fetchedMessage.id)) {
      paymentLog(`Message already processing: ${fetchedMessage.id}`);
      perf.total();
      return;
    }

    processingPaymentMessageIds.add(fetchedMessage.id);

    try {
      const bulkProcessed = await bulkPaymentService.processTicketPayment(
        fetchedMessage.client as import("discord.js").Client<true>,
        ticket,
        fetchedMessage,
        ticketChannel,
      );

      if (bulkProcessed) {
        processedPaymentMessageIds.add(fetchedMessage.id);
        logger.order(`Bulk payment proof received for ticket ${ticket.ticketId}`);
        perf.total();
        return;
      }
    } finally {
      processingPaymentMessageIds.delete(fetchedMessage.id);
    }

    const orderSession = await loadOrderSession(ticket);
    perf.mark("order lookup");

    if (!orderSession) {
      paymentLog("Order NOT FOUND");
      logger.warn(`Payment proof: session ${ticket.sessionId} not found for ticket ${ticket.ticketId}`);
      perf.total();
      return;
    }

    paymentLog(`Order found: ${orderSession.orderCode}`);
    paymentLog(`Current status: ${isPendingPayment(orderSession.status) ? "PENDING_PAYMENT" : orderSession.status}`);

    if (isPaid(orderSession.status)) {
      paymentLog("Order already PAID");
      perf.total();
      return;
    }

    if (isCompleted(orderSession.status)) {
      paymentLog(`Order status is ${orderSession.status}, no update performed`);
      perf.total();
      return;
    }

    if (!isPendingPayment(orderSession.status)) {
      logger.warn(
        `Payment proof ignored for order ${orderSession.orderCode}: status=${orderSession.status}`,
      );
      perf.total();
      return;
    }

    if (!fetchedMessage.channel.isTextBased() || fetchedMessage.channel.isDMBased()) {
      perf.total();
      return;
    }

    if (processingOrderSessionIds.has(orderSession.sessionId)) {
      paymentLog(`Order already processing: ${orderSession.orderCode}`);
      perf.total();
      return;
    }

    processingPaymentMessageIds.add(fetchedMessage.id);
    processingOrderSessionIds.add(orderSession.sessionId);

    const customerMention = `<@${ticket.userId}>`;
    let processingMessage: Message | null = null;

    const isLimited = ticket.productType === ProductType.ITEM_LIMITED;
    const isLogin = ticket.productType === ProductType.ROBUX_LOGIN;
    const isRobux = ticket.productType === ProductType.ROBUX_USERNAME;
    const isMiddleman = ticket.productType === ProductType.MIDDLEMAN;
    const isCommunityPayout = ticket.productType === ProductType.COMMUNITY_PAYOUT;

    try {
      processingMessage = await ticketChannel.send({
        embeds: [
          isLimited
            ? buildLimitedPaymentProofProcessingEmbed(orderSession.orderCode)
            : isLogin
              ? buildLoginPaymentProofProcessingEmbed(orderSession.orderCode)
              : isRobux
                ? buildRobuxPaymentProofProcessingEmbed(orderSession.orderCode)
                : isCommunityPayout
                  ? buildCommunityPayoutPaymentProofProcessingEmbed(orderSession.orderCode)
                  : isMiddleman
                    ? buildMiddlemanPaymentProofProcessingEmbed(orderSession.orderCode)
                    : buildPaymentProofProcessingEmbed(orderSession.orderCode),
        ],
      });
      perf.mark("processing feedback sent");

      paymentLog("Updating status to PAID");

      const updatedOrder = await updateOrderToPaid(ticket);
      perf.mark("database update");

      if (!updatedOrder) {
        paymentError(`Failed to update order ${orderSession.orderCode} to PAID`);
        if (processingMessage) {
          await processingMessage
            .edit({
              embeds: [
                isLimited
                  ? buildLimitedPaymentProofFailedEmbed()
                  : isLogin
                    ? buildLoginPaymentProofFailedEmbed()
                    : isRobux
                      ? buildRobuxPaymentProofFailedEmbed()
                      : isCommunityPayout
                        ? buildCommunityPayoutPaymentProofFailedEmbed()
                        : isMiddleman
                          ? buildMiddlemanPaymentProofFailedEmbed()
                          : buildPaymentProofFailedEmbed(),
              ],
            })
            .catch((error) => {
              logger.error("Failed to edit payment processing message after DB error", error);
            });
        }
        perf.total();
        return;
      }

      paymentLog("Status successfully updated to PAID");
      paymentLog(`Order: ${updatedOrder.orderCode}`);
      paymentLog("Status: PENDING_PAYMENT → PAID");

      await ticketPaymentStatusService.syncAfterLegacySessionPaid(ticket, fetchedMessage.id);
      perf.mark("order items + ticket payment sync");

      paymentLog("Updating main ticket embed");

      const giftSession =
        ticket.productType === ProductType.GIFT_IN_GAME
          ? await giftOrderSessionRepository.findBySessionId(ticket.sessionId)
          : null;
      const robuxSession =
        ticket.productType === ProductType.ROBUX_USERNAME
          ? await robuxOrderSessionRepository.findBySessionId(ticket.sessionId)
          : null;
      const limitedSession =
        ticket.productType === ProductType.ITEM_LIMITED
          ? await limitedOrderSessionRepository.findBySessionId(ticket.sessionId)
          : null;
      const loginSession =
        ticket.productType === ProductType.ROBUX_LOGIN
          ? await loginOrderSessionRepository.findBySessionId(ticket.sessionId)
          : null;
      const middlemanSession =
        ticket.productType === ProductType.MIDDLEMAN
          ? await middlemanOrderSessionRepository.findBySessionId(ticket.sessionId)
          : null;
      const communityPayoutSession =
        ticket.productType === ProductType.COMMUNITY_PAYOUT
          ? await communityPayoutOrderSessionRepository.findBySessionId(ticket.sessionId)
          : null;

      const successEmbed = isLimited
        ? buildLimitedPaymentProofReceivedEmbed(limitedSession!, customerMention)
        : isLogin
          ? buildLoginPaymentProofReceivedEmbed(loginSession!, customerMention)
          : isRobux
            ? buildRobuxPaymentProofReceivedEmbed(robuxSession!, customerMention)
            : isCommunityPayout
              ? buildCommunityPayoutPaymentProofReceivedEmbed(communityPayoutSession!, customerMention)
              : isMiddleman
                ? buildMiddlemanPaymentProofReceivedEmbed(middlemanSession!, customerMention)
                : buildPaymentProofReceivedEmbed(giftSession!, customerMention);

      const sessionForEmbed = isLimited
        ? limitedSession!
        : isLogin
          ? loginSession!
          : isRobux
            ? robuxSession!
            : isCommunityPayout
              ? communityPayoutSession!
              : isMiddleman
                ? middlemanSession!
                : giftSession!;

      const [embedUpdated] = await Promise.all([
        ticketService.updateMainTicketEmbed(
          fetchedMessage.client,
          ticket,
          sessionForEmbed,
          ticketChannel,
        ),
        processingMessage.edit({ embeds: [successEmbed] }),
      ]);

      perf.mark("embed update + acknowledgment");

      if (embedUpdated) {
        paymentLog("Main ticket embed updated");
      } else {
        paymentError("Failed to update main ticket embed");
      }

      paymentLog("Payment acknowledgment sent");
      processedPaymentMessageIds.add(fetchedMessage.id);

      logger.order(
        `Payment proof received for order ${updatedOrder.orderCode} via ticket ${ticket.ticketId}`,
      );
    } catch (error) {
      paymentError(`Payment processing failed for order ${orderSession.orderCode}`);
      logger.error("Payment proof processing error", error);

      if (processingMessage) {
        await processingMessage
          .edit({
            embeds: [
              isLimited
                ? buildLimitedPaymentProofFailedEmbed()
                : isLogin
                  ? buildLoginPaymentProofFailedEmbed()
                  : isRobux
                    ? buildRobuxPaymentProofFailedEmbed()
                    : isCommunityPayout
                      ? buildCommunityPayoutPaymentProofFailedEmbed()
                      : isMiddleman
                        ? buildMiddlemanPaymentProofFailedEmbed()
                        : buildPaymentProofFailedEmbed(),
            ],
          })
          .catch((editError) => {
            logger.error("Failed to edit payment processing message after error", editError);
          });
      }
    } finally {
      processingPaymentMessageIds.delete(fetchedMessage.id);
      processingOrderSessionIds.delete(orderSession.sessionId);
      perf.total();
    }
  },
};
