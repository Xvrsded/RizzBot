import { randomUUID } from "node:crypto";
import type { Client } from "discord.js";
import { ProductType } from "../../shared/products";
import type { TicketDocument } from "../../database/models/ticket.model";
import { ticketRepository } from "../../database/repositories/ticket.repository";
import { ticketOrderItemService } from "./ticket-order-item.service";
import { ticketService } from "./ticket.service";
import { guildConfigService } from "./guild-config.service";
import { giftOrderSessionRepository } from "../../database/repositories/gift-order-session.repository";
import { robuxOrderSessionRepository } from "../../database/repositories/robux-order-session.repository";
import { loginOrderSessionRepository } from "../../database/repositories/login-order-session.repository";
import { limitedOrderSessionRepository } from "../../database/repositories/limited-order-session.repository";
import { middlemanOrderSessionRepository } from "../../database/repositories/middleman-order-session.repository";
import { communityPayoutOrderSessionRepository } from "../../database/repositories/community-payout-order-session.repository";
import { CommunityPayoutOrderSessionStatus } from "../../database/models/community-payout-order-session.model";
import { GiftOrderSessionStatus } from "../../database/models/gift-order-session.model";
import { RobuxOrderSessionStatus } from "../../database/models/robux-order-session.model";
import { LoginOrderSessionStatus } from "../../database/models/login-order-session.model";
import { LimitedOrderSessionStatus } from "../../database/models/limited-order-session.model";
import { MiddlemanOrderSessionStatus } from "../../database/models/middleman-order-session.model";
import {
  buildBulkAddSuccessEmbed,
  buildBulkTicketEmbed,
  buildOrderAddedEmbed,
} from "../utils/embeds/bulk-ticket.embed";
import { logger } from "../../shared/logger";

async function confirmSessionByProductType(
  productType: ProductType,
  sessionId: string,
): Promise<boolean> {
  switch (productType) {
    case ProductType.GIFT_IN_GAME: {
      const updated = await giftOrderSessionRepository.updateBySessionId(sessionId, {
        status: GiftOrderSessionStatus.CONFIRMED,
      });
      return updated !== null;
    }
    case ProductType.ROBUX_USERNAME: {
      const updated = await robuxOrderSessionRepository.updateBySessionId(sessionId, {
        status: RobuxOrderSessionStatus.CONFIRMED,
      });
      return updated !== null;
    }
    case ProductType.ROBUX_LOGIN: {
      const updated = await loginOrderSessionRepository.updateBySessionId(sessionId, {
        status: LoginOrderSessionStatus.CONFIRMED,
      });
      return updated !== null;
    }
    case ProductType.ITEM_LIMITED: {
      const updated = await limitedOrderSessionRepository.updateBySessionId(sessionId, {
        status: LimitedOrderSessionStatus.CONFIRMED,
      });
      return updated !== null;
    }
    case ProductType.MIDDLEMAN: {
      const updated = await middlemanOrderSessionRepository.updateBySessionId(sessionId, {
        status: MiddlemanOrderSessionStatus.CONFIRMED,
      });
      return updated !== null;
    }
    case ProductType.COMMUNITY_PAYOUT: {
      const updated = await communityPayoutOrderSessionRepository.updateBySessionId(sessionId, {
        status: CommunityPayoutOrderSessionStatus.CONFIRMED,
      });
      return updated !== null;
    }
    default:
      return false;
  }
}

export const bulkOrderService = {
  async addSessionToExistingTicket(
    client: Client<true>,
    ticket: TicketDocument,
    sessionId: string,
    productType: ProductType,
  ): Promise<{ ticket: TicketDocument; orderCode: string } | null> {
    const confirmed = await confirmSessionByProductType(productType, sessionId);

    if (!confirmed) {
      return null;
    }

    const orderItem = await ticketOrderItemService.createFromSessionId(ticket, sessionId, productType);

    if (!orderItem) {
      return null;
    }

    const totals = await ticketOrderItemService.syncTicketPaymentStatus(ticket.ticketId);
    const items = await ticketOrderItemService.getOrderItemsForTicket(ticket);

    if (!totals) {
      return null;
    }

    await ticketService.updateBulkTicketEmbed(client, ticket, items, totals);

    const channel = await client.channels.fetch(ticket.channelId).catch(() => null);

    if (channel?.isTextBased() && !channel.isDMBased()) {
      await channel.send({
        embeds: [buildOrderAddedEmbed(orderItem, totals)],
      });
    }

    logger.ticket(
      `[BULK] Added order ${orderItem.orderCode} to ticket ${ticket.ticketId} (${ticket.channelId})`,
    );

    return { ticket, orderCode: orderItem.orderCode };
  },

  buildAddSuccessEmbed(channelId: string, orderCode: string) {
    return buildBulkAddSuccessEmbed(channelId, orderCode);
  },

  buildBulkMainEmbed(items: Awaited<ReturnType<typeof ticketOrderItemService.getOrderItemsForTicket>>, totals: NonNullable<Awaited<ReturnType<typeof ticketOrderItemService.syncTicketPaymentStatus>>>) {
    return buildBulkTicketEmbed(items, totals);
  },
};

export async function resolveBulkSessionProductType(
  sessionId: string,
): Promise<ProductType | null> {
  if (await giftOrderSessionRepository.findBySessionId(sessionId)) {
    return ProductType.GIFT_IN_GAME;
  }

  if (await robuxOrderSessionRepository.findBySessionId(sessionId)) {
    return ProductType.ROBUX_USERNAME;
  }

  if (await loginOrderSessionRepository.findBySessionId(sessionId)) {
    return ProductType.ROBUX_LOGIN;
  }

  if (await limitedOrderSessionRepository.findBySessionId(sessionId)) {
    return ProductType.ITEM_LIMITED;
  }

  if (await middlemanOrderSessionRepository.findBySessionId(sessionId)) {
    return ProductType.MIDDLEMAN;
  }

  if (await communityPayoutOrderSessionRepository.findBySessionId(sessionId)) {
    return ProductType.COMMUNITY_PAYOUT;
  }

  return null;
}

export async function createNewTicketForSession(
  client: Client<true>,
  guildId: string,
  guildName: string,
  sessionId: string,
  productType: ProductType,
  customerId: string,
): Promise<TicketDocument | null> {
  const guild = client.guilds.cache.get(guildId) ?? (await client.guilds.fetch(guildId).catch(() => null));

  if (!guild) {
    return null;
  }

  const config = await guildConfigService.getOrCreateGuildConfig(guild.id, guildName);
  const confirmed = await confirmSessionByProductType(productType, sessionId);

  if (!confirmed) {
    return null;
  }

  switch (productType) {
    case ProductType.GIFT_IN_GAME: {
      const session = await giftOrderSessionRepository.findBySessionId(sessionId);
      return session ? ticketService.createGiftInGameTicket(guild, config, session, customerId) : null;
    }
    case ProductType.ROBUX_USERNAME: {
      const session = await robuxOrderSessionRepository.findBySessionId(sessionId);
      return session ? ticketService.createRobuxUsernameTicket(guild, config, session, customerId) : null;
    }
    case ProductType.ROBUX_LOGIN: {
      const session = await loginOrderSessionRepository.findBySessionId(sessionId);
      return session ? ticketService.createLoginTicket(guild, config, session, customerId) : null;
    }
    case ProductType.ITEM_LIMITED: {
      const session = await limitedOrderSessionRepository.findBySessionId(sessionId);
      return session ? ticketService.createLimitedTicket(guild, config, session, customerId) : null;
    }
    case ProductType.MIDDLEMAN: {
      const session = await middlemanOrderSessionRepository.findBySessionId(sessionId);
      return session ? ticketService.createMiddlemanTicket(guild, config, session, customerId) : null;
    }
    case ProductType.COMMUNITY_PAYOUT: {
      const session = await communityPayoutOrderSessionRepository.findBySessionId(sessionId);
      return session ? ticketService.createCommunityPayoutTicket(guild, config, session, customerId) : null;
    }
    default:
      return null;
  }
}
