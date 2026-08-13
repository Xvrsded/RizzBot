import { randomUUID } from "node:crypto";
import {
  ChannelType,
  type Client,
  type Guild,
  type GuildTextBasedChannel,
  type OverwriteResolvable,
  PermissionFlagsBits,
  type TextChannel,
} from "discord.js";
import {
  GIFT_ADMIN_ROLE_ID,
  GIFT_OWNER_ROLE_ID,
  GIFT_TICKET_AUTO_CLOSE_MS,
  GIFT_TRANSACTION_LOG_CHANNEL_ID,
  ProductType,
} from "../../shared/products";
import { ticketRepository } from "../../database/repositories/ticket.repository";
import { ticketPaymentRecordRepository } from "../../database/repositories/ticket-payment-record.repository";
import { TicketStatus, type TicketDocument } from "../../database/models/ticket.model";
import type { GiftOrderSessionDocument } from "../../database/models/gift-order-session.model";
import type { RobuxOrderSessionDocument } from "../../database/models/robux-order-session.model";
import type { LoginOrderSessionDocument } from "../../database/models/login-order-session.model";
import type { LimitedOrderSessionDocument } from "../../database/models/limited-order-session.model";
import type { MiddlemanOrderSessionDocument } from "../../database/models/middleman-order-session.model";
import type { CommunityPayoutOrderSessionDocument } from "../../database/models/community-payout-order-session.model";
import type { GuildConfigDocument } from "../../database/models/guild-config.model";
import { giftOrderSessionRepository } from "../../database/repositories/gift-order-session.repository";
import { GiftOrderSessionStatus } from "../../database/models/gift-order-session.model";
import { RobuxOrderSessionStatus } from "../../database/models/robux-order-session.model";
import { robuxOrderSessionRepository } from "../../database/repositories/robux-order-session.repository";
import { loginOrderSessionRepository } from "../../database/repositories/login-order-session.repository";
import { LoginOrderSessionStatus } from "../../database/models/login-order-session.model";
import { limitedOrderSessionRepository } from "../../database/repositories/limited-order-session.repository";
import { middlemanOrderSessionRepository } from "../../database/repositories/middleman-order-session.repository";
import { communityPayoutOrderSessionRepository } from "../../database/repositories/community-payout-order-session.repository";
import {
  LimitedOrderSessionStatus,
  LimitedPriceStatus,
} from "../../database/models/limited-order-session.model";
import { MiddlemanOrderSessionStatus } from "../../database/models/middleman-order-session.model";
import { CommunityPayoutOrderSessionStatus } from "../../database/models/community-payout-order-session.model";
import {
  buildActiveGiftTicketEmbed,
  buildCompletedGiftTicketEmbed,
  buildGiftTicketMentionContent,
  buildTicketActionRow,
} from "../utils/embeds/gift-ticket.embed";
import {
  buildActiveRobuxTicketEmbed,
  buildCompletedRobuxTicketEmbed,
  buildRobuxTicketMentionContent,
} from "../utils/embeds/robux-ticket.embed";
import {
  buildActiveLoginTicketEmbed,
  buildCompletedLoginTicketEmbed,
  buildLoginTicketActionRow,
  buildLoginTicketMentionContent,
} from "../utils/embeds/login-ticket.embed";
import {
  buildActiveLimitedTicketEmbed,
  buildCompletedLimitedTicketEmbed,
  buildLimitedTicketActionRow,
  buildLimitedTicketMentionContent,
} from "../utils/embeds/limited-ticket.embed";
import {
  buildActiveMiddlemanTicketEmbed,
  buildCompletedMiddlemanTicketEmbed,
  buildMiddlemanTicketActionRow,
  buildMiddlemanTicketMentionContent,
} from "../utils/embeds/middleman-ticket.embed";
import {
  buildActiveCommunityPayoutTicketEmbed,
  buildCommunityPayoutTicketActionRow,
  buildCommunityPayoutTicketMentionContent,
  buildCompletedCommunityPayoutTicketEmbed,
} from "../utils/embeds/community-payout-ticket.embed";
import {
  buildGiftTransactionLogEmbed,
  buildRobuxTransactionLogEmbed,
  buildLoginTransactionLogEmbed,
  buildLimitedTransactionLogEmbed,
  buildMiddlemanTransactionLogEmbed,
  buildCommunityPayoutTransactionLogEmbed,
  buildBulkTransactionLogEmbed,
} from "../utils/embeds/transaction-log.embed";
import { buildTicketQrAttachment } from "../utils/ticket-qr";
import { vouchService } from "./vouch.service";
import { ticketOrderItemService } from "./ticket-order-item.service";
import { ticketPaymentStatusService } from "./ticket-payment-status.service";
import { leaderboardService } from "./leaderboard.service";
import { TicketOrderItemStatus } from "../../database/models/ticket-order-item.model";
import { ticketOrderItemRepository } from "../../database/repositories/ticket-order-item.repository";
import type { TicketOrderItemDocument } from "../../database/models/ticket-order-item.model";
import type { TicketOrderTotals } from "./ticket-order-item.service";
import { buildBulkTicketEmbed } from "../utils/embeds/bulk-ticket.embed";
import {
  buildGiftInGameTicketChannelName,
  buildGiftInGameTicketChannelNameFallback,
  buildRobuxUsernameTicketChannelName,
  buildRobuxUsernameTicketChannelNameFallback,
  buildLoginTicketChannelName,
  buildLoginTicketChannelNameFallback,
  buildLimitedTicketChannelName,
  buildLimitedTicketChannelNameFallback,
  buildMiddlemanTicketChannelName,
  buildMiddlemanTicketChannelNameFallback,
  buildCommunityPayoutTicketChannelName,
  buildCommunityPayoutTicketChannelNameFallback,
} from "../utils/channel-name";
import { serviceStatusService } from "./service-status.service";
import { logger } from "../../shared/logger";
import { TicketError } from "./ticket.errors";
import { rizzStoreStatusService } from "./rizz-store-status.service";

function scheduleRizzStoreQueueRefresh(client: Client<true>, guildId: string): void {
  void rizzStoreStatusService.refreshQueue(client, guildId).catch((error) => {
    logger.warn(`RizzStore queue refresh failed for guild ${guildId}`);
    logger.error("RizzStore queue refresh detail", error);
  });
}

const REQUIRED_BOT_PERMISSIONS = [
  PermissionFlagsBits.ViewChannel,
  PermissionFlagsBits.SendMessages,
  PermissionFlagsBits.EmbedLinks,
  PermissionFlagsBits.ManageChannels,
  PermissionFlagsBits.ManageRoles,
  PermissionFlagsBits.AttachFiles,
] as const;

const autoCloseTimers = new Map<string, NodeJS.Timeout>();

function buildGiftTicketRoleOverwrites(
  guild: Guild,
  config: GuildConfigDocument,
  customerId: string,
): OverwriteResolvable[] {
  const roleIds = new Set(
    [
      GIFT_ADMIN_ROLE_ID,
      GIFT_OWNER_ROLE_ID,
      config.ownerRoleId,
      config.adminRoleId,
      config.staffRoleId,
    ].filter((roleId): roleId is string => Boolean(roleId)),
  );

  const staffOverwrites: OverwriteResolvable[] = [...roleIds].map((id) => ({
    id,
    allow: [
      PermissionFlagsBits.ViewChannel,
      PermissionFlagsBits.SendMessages,
      PermissionFlagsBits.ReadMessageHistory,
      PermissionFlagsBits.AttachFiles,
    ],
  }));

  const overwrites: OverwriteResolvable[] = [
    {
      id: guild.roles.everyone.id,
      deny: [PermissionFlagsBits.ViewChannel],
    },
    {
      id: customerId,
      allow: [
        PermissionFlagsBits.ViewChannel,
        PermissionFlagsBits.SendMessages,
        PermissionFlagsBits.ReadMessageHistory,
        PermissionFlagsBits.AttachFiles,
      ],
    },
    ...staffOverwrites,
  ];

  const botMember = guild.members.me;

  if (botMember) {
    overwrites.push({
      id: botMember.id,
      allow: [
        PermissionFlagsBits.ViewChannel,
        PermissionFlagsBits.SendMessages,
        PermissionFlagsBits.ReadMessageHistory,
        PermissionFlagsBits.EmbedLinks,
        PermissionFlagsBits.AttachFiles,
        PermissionFlagsBits.ManageChannels,
      ],
    });
  }

  return overwrites;
}

function assertBotCanCreateTickets(guild: Guild): void {
  const me = guild.members.me;

  if (!me) {
    throw new TicketError("TICKET_PERMISSION_DENIED", "Bot member is unavailable in this guild.");
  }

  const missing = REQUIRED_BOT_PERMISSIONS.filter((permission) => !me.permissions.has(permission));

  if (missing.length > 0) {
    throw new TicketError(
      "TICKET_PERMISSION_DENIED",
      `Bot is missing permissions: ${missing.join(", ")}`,
    );
  }
}

function isChannelNameConflict(error: unknown): boolean {
  if (typeof error !== "object" || error === null) {
    return false;
  }

  const code = "code" in error ? error.code : null;

  if (code === 50035) {
    return true;
  }

  const message =
    "message" in error && typeof error.message === "string"
      ? error.message.toLowerCase()
      : "";

  return message.includes("name") && (message.includes("already") || message.includes("in use"));
}

async function createStandaloneGiftTicketChannel(
  guild: Guild,
  session: GiftOrderSessionDocument,
  permissionOverwrites: OverwriteResolvable[],
): Promise<TextChannel> {
  const primaryName = buildGiftInGameTicketChannelName(session.robuxAmount, session.robloxUsername);

  const createChannel = (name: string) =>
    guild.channels.create({
      name,
      type: ChannelType.GuildText,
      permissionOverwrites,
      topic: `Gift In Game • ${session.orderCode}`,
      reason: `Gift In Game ticket for order ${session.orderCode}`,
    });

  try {
    return await createChannel(primaryName);
  } catch (error) {
    if (!isChannelNameConflict(error)) {
      throw error;
    }

    const fallbackName = buildGiftInGameTicketChannelNameFallback(
      session.robuxAmount,
      session.robloxUsername,
      session.orderCode,
    );

    logger.warn(
      `Channel name "${primaryName}" already exists — retrying with fallback "${fallbackName}" for order ${session.orderCode}`,
    );

    return createChannel(fallbackName);
  }
}

async function createStandaloneRobuxTicketChannel(
  guild: Guild,
  session: RobuxOrderSessionDocument,
  permissionOverwrites: OverwriteResolvable[],
): Promise<TextChannel> {
  const primaryName = buildRobuxUsernameTicketChannelName(session.robuxAmount, session.robloxUsername);

  const createChannel = (name: string) =>
    guild.channels.create({
      name,
      type: ChannelType.GuildText,
      permissionOverwrites,
      topic: `Robux Via Username • ${session.orderCode}`,
      reason: `Robux Via Username ticket for order ${session.orderCode}`,
    });

  try {
    return await createChannel(primaryName);
  } catch (error) {
    if (!isChannelNameConflict(error)) {
      throw error;
    }

    const fallbackName = buildRobuxUsernameTicketChannelNameFallback(
      session.robuxAmount,
      session.robloxUsername,
      session.orderCode,
    );

    logger.warn(
      `Channel name "${primaryName}" already exists — retrying with fallback "${fallbackName}" for order ${session.orderCode}`,
    );

    return createChannel(fallbackName);
  }
}

async function createStandaloneLoginTicketChannel(
  guild: Guild,
  session: LoginOrderSessionDocument,
  permissionOverwrites: OverwriteResolvable[],
): Promise<TextChannel> {
  const primaryName = buildLoginTicketChannelName(session.robuxAmount, session.robloxUsername);

  const createChannel = (name: string) =>
    guild.channels.create({
      name,
      type: ChannelType.GuildText,
      permissionOverwrites,
      topic: `Robux Via Login • ${session.orderCode}`,
      reason: `Robux Via Login ticket for order ${session.orderCode}`,
    });

  try {
    return await createChannel(primaryName);
  } catch (error) {
    if (!isChannelNameConflict(error)) {
      throw error;
    }

    const fallbackName = buildLoginTicketChannelNameFallback(
      session.robuxAmount,
      session.robloxUsername,
      session.orderCode,
    );

    logger.warn(
      `Channel name "${primaryName}" already exists — retrying with fallback "${fallbackName}" for order ${session.orderCode}`,
    );

    return createChannel(fallbackName);
  }
}

async function createStandaloneLimitedTicketChannel(
  guild: Guild,
  session: LimitedOrderSessionDocument,
  permissionOverwrites: OverwriteResolvable[],
): Promise<TextChannel> {
  const primaryName = buildLimitedTicketChannelName(session.robloxUsername);

  const createChannel = (name: string) =>
    guild.channels.create({
      name,
      type: ChannelType.GuildText,
      permissionOverwrites,
      topic: `Item Limited • ${session.orderCode}`,
      reason: `Item Limited ticket for order ${session.orderCode}`,
    });

  try {
    return await createChannel(primaryName);
  } catch (error) {
    if (!isChannelNameConflict(error)) {
      throw error;
    }

    const fallbackName = buildLimitedTicketChannelNameFallback(
      session.robloxUsername,
      session.orderCode,
    );

    logger.warn(
      `Channel name "${primaryName}" already exists — retrying with fallback "${fallbackName}" for order ${session.orderCode}`,
    );

    return createChannel(fallbackName);
  }
}

async function createStandaloneMiddlemanTicketChannel(
  guild: Guild,
  session: MiddlemanOrderSessionDocument,
  permissionOverwrites: OverwriteResolvable[],
): Promise<TextChannel> {
  const primaryName = buildMiddlemanTicketChannelName(
    session.transactionAmountIdr,
    session.party1Username,
  );

  const createChannel = (name: string) =>
    guild.channels.create({
      name,
      type: ChannelType.GuildText,
      permissionOverwrites,
      topic: `Middleman / Rekber • ${session.orderCode}`,
      reason: `Middleman ticket for order ${session.orderCode}`,
    });

  try {
    return await createChannel(primaryName);
  } catch (error) {
    if (!isChannelNameConflict(error)) {
      throw error;
    }

    const fallbackName = buildMiddlemanTicketChannelNameFallback(
      session.transactionAmountIdr,
      session.party1Username,
      session.orderCode,
    );

    logger.warn(
      `Channel name "${primaryName}" already exists — retrying with fallback "${fallbackName}" for order ${session.orderCode}`,
    );

    return createChannel(fallbackName);
  }
}

async function createStandaloneCommunityPayoutTicketChannel(
  guild: Guild,
  session: CommunityPayoutOrderSessionDocument,
  permissionOverwrites: OverwriteResolvable[],
): Promise<TextChannel> {
  const primaryName = buildCommunityPayoutTicketChannelName(session.robuxAmount, session.robloxUsername);

  const createChannel = (name: string) =>
    guild.channels.create({
      name,
      type: ChannelType.GuildText,
      permissionOverwrites,
      topic: `Robux Community Payout • ${session.orderCode}`,
      reason: `Community Payout ticket for order ${session.orderCode}`,
    });

  try {
    return await createChannel(primaryName);
  } catch (error) {
    if (!isChannelNameConflict(error)) {
      throw error;
    }

    const fallbackName = buildCommunityPayoutTicketChannelNameFallback(
      session.robuxAmount,
      session.robloxUsername,
      session.orderCode,
    );

    logger.warn(
      `Channel name "${primaryName}" already exists — retrying with fallback "${fallbackName}" for order ${session.orderCode}`,
    );

    return createChannel(fallbackName);
  }
}

function mapChannelCreateError(error: unknown): TicketError {
  if (error instanceof TicketError) {
    return error;
  }

  const discordCode =
    typeof error === "object" && error !== null && "code" in error ? error.code : null;

  if (discordCode === 50013) {
    return new TicketError(
      "TICKET_PERMISSION_DENIED",
      "Bot lacks permission to create ticket channels.",
      error,
    );
  }

  return new TicketError("TICKET_CREATE_FAILED", "Failed to create ticket channel.", error);
}

async function getTicketTextChannel(
  client: Client<true>,
  ticket: TicketDocument,
): Promise<TextChannel | null> {
  const channel = await client.channels.fetch(ticket.channelId).catch(() => null);

  if (!channel?.isTextBased() || channel.isDMBased()) {
    return null;
  }

  return channel as TextChannel;
}

function cancelAutoCloseTimer(ticketId: string): void {
  const timer = autoCloseTimers.get(ticketId);

  if (timer) {
    clearTimeout(timer);
    autoCloseTimers.delete(ticketId);
  }
}

async function postDeliveryTransactionLog(
  client: Client<true>,
  ticket: TicketDocument,
  staffMention: string,
  completedAt: Date,
  singleLogEmbed: import("discord.js").EmbedBuilder,
): Promise<void> {
  const items = await ticketOrderItemService.getOrderItemsForTicket(ticket);
  const logChannel = await client.channels.fetch(GIFT_TRANSACTION_LOG_CHANNEL_ID).catch(() => null);

  if (!logChannel?.isTextBased() || logChannel.isDMBased()) {
    logger.warn(`Transaction log channel ${GIFT_TRANSACTION_LOG_CHANNEL_ID} is unavailable`);
    return;
  }

  if (items.length > 1) {
    const totalPaidIdr = await ticketPaymentRecordRepository.sumAmountByTicketId(ticket.ticketId);
    const totals = ticketOrderItemService.calculateTotals(items, totalPaidIdr);

    await logChannel.send({
      embeds: [
        buildBulkTransactionLogEmbed({
          items,
          customerMention: `<@${ticket.userId}>`,
          staffMention,
          completedAt,
          totalRobux: totals.totalRobux,
          totalPaymentIdr: totals.totalPaymentIdr,
          productTypes: totals.productTypes,
        }),
      ],
    });
  } else {
    await logChannel.send({ embeds: [singleLogEmbed] });
  }

  void leaderboardService.scheduleRefresh(client).catch((error) => {
    logger.error("[LEADERBOARD] Failed to refresh after transaction log", error);
  });
}

async function assertTicketPaidForDelivery(ticket: TicketDocument): Promise<void> {
  await ticketPaymentStatusService.assertPaidForDelivery(ticket.ticketId, {
    channelId: ticket.channelId,
    orderType: ticket.productType,
    customerId: ticket.userId,
  });
}

async function finalizeDeliveredTicketWithVouch(
  client: Client<true>,
  ticket: TicketDocument,
  robloxUsername: string,
): Promise<void> {
  await vouchService.handleTransactionCompleted(client, ticket, robloxUsername);
}

export const ticketService = {
  async findOpenGiftTicket(guildId: string, userId: string): Promise<TicketDocument | null> {
    return ticketRepository.findOpenByUserAndProduct(guildId, userId, ProductType.GIFT_IN_GAME);
  },

  async findOpenRobuxUsernameTicket(guildId: string, userId: string): Promise<TicketDocument | null> {
    return ticketRepository.findOpenByUserAndProduct(guildId, userId, ProductType.ROBUX_USERNAME);
  },

  async findOpenLoginTicket(guildId: string, userId: string): Promise<TicketDocument | null> {
    return ticketRepository.findOpenByUserAndProduct(guildId, userId, ProductType.ROBUX_LOGIN);
  },

  async findOpenLimitedTicket(guildId: string, userId: string): Promise<TicketDocument | null> {
    return ticketRepository.findOpenByUserAndProduct(guildId, userId, ProductType.ITEM_LIMITED);
  },

  async findOpenMiddlemanTicket(guildId: string, userId: string): Promise<TicketDocument | null> {
    return ticketRepository.findOpenByUserAndProduct(guildId, userId, ProductType.MIDDLEMAN);
  },

  async findOpenCommunityPayoutTicket(guildId: string, userId: string): Promise<TicketDocument | null> {
    return ticketRepository.findOpenByUserAndProduct(guildId, userId, ProductType.COMMUNITY_PAYOUT);
  },

  async findOpenTicketByUser(guildId: string, userId: string): Promise<TicketDocument | null> {
    return ticketRepository.findOpenByUser(guildId, userId);
  },

  async findByTicketId(ticketId: string): Promise<TicketDocument | null> {
    return ticketRepository.findByTicketId(ticketId);
  },

  async createGiftInGameTicket(
    guild: Guild,
    config: GuildConfigDocument,
    session: GiftOrderSessionDocument,
    customerId: string,
  ): Promise<TicketDocument> {
    assertBotCanCreateTickets(guild);

    const permissionOverwrites = buildGiftTicketRoleOverwrites(guild, config, customerId);

    let channel: TextChannel;

    try {
      channel = await createStandaloneGiftTicketChannel(guild, session, permissionOverwrites);
    } catch (error) {
      logger.error(`Failed to create ticket channel for order ${session.orderCode}`, error);
      throw mapChannelCreateError(error);
    }

    const ticketId = randomUUID();

    try {
      const ticket = await ticketRepository.create({
        ticketId,
        guildId: guild.id,
        channelId: channel.id,
        userId: customerId,
        sessionId: session.sessionId,
        orderCode: session.orderCode,
        productType: ProductType.GIFT_IN_GAME,
        status: TicketStatus.OPEN,
        messageId: null,
        completedAt: null,
        completedByUserId: null,
      });

      const embed = buildActiveGiftTicketEmbed(session);
      const row = buildTicketActionRow(ticketId);
      const message = await channel.send({
        content: buildGiftTicketMentionContent(customerId),
        embeds: [embed],
        files: [buildTicketQrAttachment()],
        components: [row],
      });

      await ticketRepository.updateByTicketId(ticketId, { messageId: message.id });
      await ticketOrderItemService.createFromSession(ticket, session, ProductType.GIFT_IN_GAME);

      logger.ticket(
        `Created Gift In Game ticket ${ticketId} (${session.orderCode}) in channel ${channel.id} (${channel.name})`,
      );

      scheduleRizzStoreQueueRefresh(guild.client as Client<true>, guild.id);

      return ticket;
    } catch (error) {
      logger.error(`Failed to finalize ticket for order ${session.orderCode}`, error);
      await channel.delete("Ticket setup failed after channel creation").catch(() => undefined);
      throw new TicketError("TICKET_CREATE_FAILED", "Failed to save or initialize ticket.", error);
    }
  },

  async createRobuxUsernameTicket(
    guild: Guild,
    config: GuildConfigDocument,
    session: RobuxOrderSessionDocument,
    customerId: string,
  ): Promise<TicketDocument> {
    assertBotCanCreateTickets(guild);

    const permissionOverwrites = buildGiftTicketRoleOverwrites(guild, config, customerId);

    let channel: TextChannel;

    try {
      channel = await createStandaloneRobuxTicketChannel(guild, session, permissionOverwrites);
    } catch (error) {
      logger.error(`Failed to create Robux ticket channel for order ${session.orderCode}`, error);
      throw mapChannelCreateError(error);
    }

    const ticketId = randomUUID();

    try {
      const ticket = await ticketRepository.create({
        ticketId,
        guildId: guild.id,
        channelId: channel.id,
        userId: customerId,
        sessionId: session.sessionId,
        orderCode: session.orderCode,
        productType: ProductType.ROBUX_USERNAME,
        status: TicketStatus.OPEN,
        messageId: null,
        completedAt: null,
        completedByUserId: null,
      });

      const embed = buildActiveRobuxTicketEmbed(session);
      const row = buildTicketActionRow(ticketId);
      const message = await channel.send({
        content: buildRobuxTicketMentionContent(customerId),
        embeds: [embed],
        files: [buildTicketQrAttachment()],
        components: [row],
      });

      await ticketRepository.updateByTicketId(ticketId, { messageId: message.id });
      await ticketOrderItemService.createFromSession(ticket, session, ProductType.ROBUX_USERNAME);

      logger.ticket(
        `Created Robux Via Username ticket ${ticketId} (${session.orderCode}) in channel ${channel.id} (${channel.name})`,
      );

      scheduleRizzStoreQueueRefresh(guild.client as Client<true>, guild.id);

      return ticket;
    } catch (error) {
      logger.error(`Failed to finalize Robux ticket for order ${session.orderCode}`, error);
      await channel.delete("Ticket setup failed after channel creation").catch(() => undefined);
      throw new TicketError("TICKET_CREATE_FAILED", "Failed to save or initialize ticket.", error);
    }
  },

  async createLoginTicket(
    guild: Guild,
    config: GuildConfigDocument,
    session: LoginOrderSessionDocument,
    customerId: string,
  ): Promise<TicketDocument> {
    assertBotCanCreateTickets(guild);

    const permissionOverwrites = buildGiftTicketRoleOverwrites(guild, config, customerId);

    let channel: TextChannel;

    try {
      channel = await createStandaloneLoginTicketChannel(guild, session, permissionOverwrites);
    } catch (error) {
      logger.error(`Failed to create Login ticket channel for order ${session.orderCode}`, error);
      throw mapChannelCreateError(error);
    }

    const ticketId = randomUUID();

    try {
      const ticket = await ticketRepository.create({
        ticketId,
        guildId: guild.id,
        channelId: channel.id,
        userId: customerId,
        sessionId: session.sessionId,
        orderCode: session.orderCode,
        productType: ProductType.ROBUX_LOGIN,
        status: TicketStatus.OPEN,
        messageId: null,
        completedAt: null,
        completedByUserId: null,
      });

      const embed = buildActiveLoginTicketEmbed(session);
      const row = buildLoginTicketActionRow(ticketId);
      const message = await channel.send({
        content: buildLoginTicketMentionContent(customerId),
        embeds: [embed],
        files: [buildTicketQrAttachment()],
        components: [row],
      });

      await ticketRepository.updateByTicketId(ticketId, { messageId: message.id });
      await ticketOrderItemService.createFromSession(ticket, session, ProductType.ROBUX_LOGIN);

      logger.ticket(
        `Created Robux Via Login ticket ${ticketId} (${session.orderCode}) in channel ${channel.id} (${channel.name})`,
      );

      scheduleRizzStoreQueueRefresh(guild.client as Client<true>, guild.id);

      return ticket;
    } catch (error) {
      logger.error(`Failed to finalize Login ticket for order ${session.orderCode}`, error);
      await channel.delete("Ticket setup failed after channel creation").catch(() => undefined);
      throw new TicketError("TICKET_CREATE_FAILED", "Failed to save or initialize ticket.", error);
    }
  },

  async createLimitedTicket(
    guild: Guild,
    config: GuildConfigDocument,
    session: LimitedOrderSessionDocument,
    customerId: string,
  ): Promise<TicketDocument> {
    assertBotCanCreateTickets(guild);

    const permissionOverwrites = buildGiftTicketRoleOverwrites(guild, config, customerId);

    let channel: TextChannel;

    try {
      channel = await createStandaloneLimitedTicketChannel(guild, session, permissionOverwrites);
    } catch (error) {
      logger.error(`Failed to create Item Limited ticket channel for order ${session.orderCode}`, error);
      throw mapChannelCreateError(error);
    }

    const ticketId = randomUUID();

    try {
      const ticket = await ticketRepository.create({
        ticketId,
        guildId: guild.id,
        channelId: channel.id,
        userId: customerId,
        sessionId: session.sessionId,
        orderCode: session.orderCode,
        productType: ProductType.ITEM_LIMITED,
        status: TicketStatus.OPEN,
        messageId: null,
        completedAt: null,
        completedByUserId: null,
      });

      const embed = buildActiveLimitedTicketEmbed(session);
      const row = buildLimitedTicketActionRow(ticketId);
      const message = await channel.send({
        content: buildLimitedTicketMentionContent(customerId),
        embeds: [embed],
        files: [buildTicketQrAttachment()],
        components: [row],
      });

      await ticketRepository.updateByTicketId(ticketId, { messageId: message.id });
      await ticketOrderItemService.createFromSession(ticket, session, ProductType.ITEM_LIMITED);

      logger.ticket(
        `Created Item Limited ticket ${ticketId} (${session.orderCode}) in channel ${channel.id} (${channel.name})`,
      );

      scheduleRizzStoreQueueRefresh(guild.client as Client<true>, guild.id);

      return ticket;
    } catch (error) {
      logger.error(`Failed to finalize Item Limited ticket for order ${session.orderCode}`, error);
      await channel.delete("Ticket setup failed after channel creation").catch(() => undefined);
      throw new TicketError("TICKET_CREATE_FAILED", "Failed to save or initialize ticket.", error);
    }
  },

  async createMiddlemanTicket(
    guild: Guild,
    config: GuildConfigDocument,
    session: MiddlemanOrderSessionDocument,
    customerId: string,
  ): Promise<TicketDocument> {
    const middlemanEnabled = await serviceStatusService.isEnabled(guild.id, "mmReber");

    if (middlemanEnabled === false) {
      throw new TicketError("TICKET_CREATE_FAILED", "Middleman service is currently closed.");
    }

    assertBotCanCreateTickets(guild);

    const permissionOverwrites = buildGiftTicketRoleOverwrites(guild, config, customerId);

    let channel: TextChannel;

    try {
      channel = await createStandaloneMiddlemanTicketChannel(guild, session, permissionOverwrites);
    } catch (error) {
      logger.error(`Failed to create Middleman ticket channel for order ${session.orderCode}`, error);
      throw mapChannelCreateError(error);
    }

    const ticketId = randomUUID();

    try {
      const ticket = await ticketRepository.create({
        ticketId,
        guildId: guild.id,
        channelId: channel.id,
        userId: customerId,
        sessionId: session.sessionId,
        orderCode: session.orderCode,
        productType: ProductType.MIDDLEMAN,
        status: TicketStatus.OPEN,
        messageId: null,
        completedAt: null,
        completedByUserId: null,
      });

      const embed = buildActiveMiddlemanTicketEmbed(session);
      const row = buildMiddlemanTicketActionRow(ticketId);
      const message = await channel.send({
        content: buildMiddlemanTicketMentionContent(customerId),
        embeds: [embed],
        files: [buildTicketQrAttachment()],
        components: [row],
      });

      await ticketRepository.updateByTicketId(ticketId, { messageId: message.id });
      await ticketOrderItemService.createFromSession(ticket, session, ProductType.MIDDLEMAN);

      logger.ticket(
        `Created Middleman ticket ${ticketId} (${session.orderCode}) in channel ${channel.id} (${channel.name})`,
      );

      scheduleRizzStoreQueueRefresh(guild.client as Client<true>, guild.id);

      return ticket;
    } catch (error) {
      logger.error(`Failed to finalize Middleman ticket for order ${session.orderCode}`, error);
      await channel.delete("Ticket setup failed after channel creation").catch(() => undefined);
      throw new TicketError("TICKET_CREATE_FAILED", "Failed to save or initialize ticket.", error);
    }
  },

  async createCommunityPayoutTicket(
    guild: Guild,
    config: GuildConfigDocument,
    session: CommunityPayoutOrderSessionDocument,
    customerId: string,
  ): Promise<TicketDocument> {
    const payoutEnabled = await serviceStatusService.isEnabled(guild.id, "communityPayout");

    if (payoutEnabled === false) {
      throw new TicketError("TICKET_CREATE_FAILED", "Community Payout service is currently closed.");
    }

    assertBotCanCreateTickets(guild);

    const permissionOverwrites = buildGiftTicketRoleOverwrites(guild, config, customerId);

    let channel: TextChannel;

    try {
      channel = await createStandaloneCommunityPayoutTicketChannel(guild, session, permissionOverwrites);
    } catch (error) {
      logger.error(`Failed to create Community Payout ticket channel for order ${session.orderCode}`, error);
      throw mapChannelCreateError(error);
    }

    const ticketId = randomUUID();

    try {
      const ticket = await ticketRepository.create({
        ticketId,
        guildId: guild.id,
        channelId: channel.id,
        userId: customerId,
        sessionId: session.sessionId,
        orderCode: session.orderCode,
        productType: ProductType.COMMUNITY_PAYOUT,
        status: TicketStatus.OPEN,
        messageId: null,
        completedAt: null,
        completedByUserId: null,
      });

      const embed = buildActiveCommunityPayoutTicketEmbed(session);
      const row = buildCommunityPayoutTicketActionRow(ticketId);
      const message = await channel.send({
        content: buildCommunityPayoutTicketMentionContent(customerId),
        embeds: [embed],
        files: [buildTicketQrAttachment()],
        components: [row],
      });

      await ticketRepository.updateByTicketId(ticketId, { messageId: message.id });
      await ticketOrderItemService.createFromSession(ticket, session, ProductType.COMMUNITY_PAYOUT);

      logger.ticket(
        `Created Community Payout ticket ${ticketId} (${session.orderCode}) in channel ${channel.id} (${channel.name})`,
      );

      scheduleRizzStoreQueueRefresh(guild.client as Client<true>, guild.id);

      return ticket;
    } catch (error) {
      logger.error(`Failed to finalize Community Payout ticket for order ${session.orderCode}`, error);
      await channel.delete("Ticket setup failed after channel creation").catch(() => undefined);
      throw new TicketError("TICKET_CREATE_FAILED", "Failed to save or initialize ticket.", error);
    }
  },

  async markGiftTicketDelivered(
    client: Client<true>,
    ticket: TicketDocument,
    staffUserId: string,
    staffMention: string,
  ): Promise<{ session: GiftOrderSessionDocument; completedAt: Date }> {
    if (ticket.status !== TicketStatus.OPEN) {
      throw new TicketError("TICKET_ALREADY_COMPLETED", "Ticket is not in an open state.");
    }

    const session = await giftOrderSessionRepository.findBySessionId(ticket.sessionId);

    if (!session) {
      throw new TicketError("TICKET_CREATE_FAILED", "Order session not found for ticket.");
    }

    if (session.status === GiftOrderSessionStatus.COMPLETED) {
      throw new TicketError("TICKET_ALREADY_COMPLETED", "Order session is already completed.");
    }

    const completedAt = new Date();
    const items = await ticketOrderItemService.getOrderItemsForTicket(ticket);
    await assertTicketPaidForDelivery(ticket);
    await ticketOrderItemService.completeAllOrderSessions(items);

    await ticketRepository.updateByTicketId(ticket.ticketId, {
      status: TicketStatus.COMPLETED,
      completedAt,
      completedByUserId: staffUserId,
    });

    session.status = GiftOrderSessionStatus.COMPLETED;

    await postDeliveryTransactionLog(
      client,
      ticket,
      staffMention,
      completedAt,
      buildGiftTransactionLogEmbed({
        session,
        customerMention: `<@${ticket.userId}>`,
        staffMention,
        completedAt,
      }),
    );

    const channel = await getTicketTextChannel(client, ticket);

    if (channel && ticket.messageId) {
      const ticketMessage = await channel.messages.fetch(ticket.messageId).catch(() => null);

      if (ticketMessage) {
        await ticketMessage.edit({
          embeds: [buildCompletedGiftTicketEmbed(session)],
          components: [buildTicketActionRow(ticket.ticketId, true)],
        });
      }
    }

    await finalizeDeliveredTicketWithVouch(client, ticket, session.robloxUsername);
    this.scheduleGiftTicketAutoClose(client, ticket.ticketId);

    logger.ticket(`Gift ticket ${ticket.ticketId} marked delivered by ${staffUserId}`);

    scheduleRizzStoreQueueRefresh(client, ticket.guildId);

    return { session, completedAt };
  },

  async markRobuxUsernameTicketDelivered(
    client: Client<true>,
    ticket: TicketDocument,
    staffUserId: string,
    staffMention: string,
  ): Promise<{ session: RobuxOrderSessionDocument; completedAt: Date }> {
    if (ticket.status !== TicketStatus.OPEN) {
      throw new TicketError("TICKET_ALREADY_COMPLETED", "Ticket is not in an open state.");
    }

    const session = await robuxOrderSessionRepository.findBySessionId(ticket.sessionId);

    if (!session) {
      throw new TicketError("TICKET_CREATE_FAILED", "Order session not found for ticket.");
    }

    if (session.status === RobuxOrderSessionStatus.COMPLETED) {
      throw new TicketError("TICKET_ALREADY_COMPLETED", "Order session is already completed.");
    }

    const completedAt = new Date();
    const items = await ticketOrderItemService.getOrderItemsForTicket(ticket);
    await assertTicketPaidForDelivery(ticket);
    await ticketOrderItemService.completeAllOrderSessions(items);

    await ticketRepository.updateByTicketId(ticket.ticketId, {
      status: TicketStatus.COMPLETED,
      completedAt,
      completedByUserId: staffUserId,
    });

    session.status = RobuxOrderSessionStatus.COMPLETED;

    await postDeliveryTransactionLog(
      client,
      ticket,
      staffMention,
      completedAt,
      buildRobuxTransactionLogEmbed({
        session,
        customerMention: `<@${ticket.userId}>`,
        staffMention,
        completedAt,
      }),
    );

    const channel = await getTicketTextChannel(client, ticket);

    if (channel && ticket.messageId) {
      const ticketMessage = await channel.messages.fetch(ticket.messageId).catch(() => null);

      if (ticketMessage) {
        await ticketMessage.edit({
          embeds: [buildCompletedRobuxTicketEmbed(session)],
          components: [buildTicketActionRow(ticket.ticketId, true)],
        });
      }
    }

    await finalizeDeliveredTicketWithVouch(client, ticket, session.robloxUsername);
    this.scheduleGiftTicketAutoClose(client, ticket.ticketId);

    logger.ticket(`Robux ticket ${ticket.ticketId} marked delivered by ${staffUserId}`);

    scheduleRizzStoreQueueRefresh(client, ticket.guildId);

    return { session, completedAt };
  },

  async markLoginTicketDelivered(
    client: Client<true>,
    ticket: TicketDocument,
    staffUserId: string,
    staffMention: string,
  ): Promise<{ session: LoginOrderSessionDocument; completedAt: Date }> {
    if (ticket.status !== TicketStatus.OPEN) {
      throw new TicketError("TICKET_ALREADY_COMPLETED", "Ticket is not in an open state.");
    }

    const session = await loginOrderSessionRepository.findBySessionId(ticket.sessionId);

    if (!session) {
      throw new TicketError("TICKET_CREATE_FAILED", "Order session not found for ticket.");
    }

    if (session.status === LoginOrderSessionStatus.COMPLETED) {
      throw new TicketError("TICKET_ALREADY_COMPLETED", "Order session is already completed.");
    }

    const items = await ticketOrderItemService.getOrderItemsForTicket(ticket);
    await assertTicketPaidForDelivery(ticket);

    const completedAt = new Date();
    await ticketOrderItemService.completeAllOrderSessions(items);

    await ticketRepository.updateByTicketId(ticket.ticketId, {
      status: TicketStatus.COMPLETED,
      completedAt,
      completedByUserId: staffUserId,
    });

    session.status = LoginOrderSessionStatus.COMPLETED;

    await postDeliveryTransactionLog(
      client,
      ticket,
      staffMention,
      completedAt,
      buildLoginTransactionLogEmbed({
        session,
        customerMention: `<@${ticket.userId}>`,
        staffMention,
        completedAt,
      }),
    );

    const channel = await getTicketTextChannel(client, ticket);

    if (channel && ticket.messageId) {
      const ticketMessage = await channel.messages.fetch(ticket.messageId).catch(() => null);

      if (ticketMessage) {
        await ticketMessage.edit({
          embeds: [buildCompletedLoginTicketEmbed(session)],
          components: [buildLoginTicketActionRow(ticket.ticketId, true)],
        });
      }
    }

    await finalizeDeliveredTicketWithVouch(client, ticket, session.robloxUsername);
    this.scheduleGiftTicketAutoClose(client, ticket.ticketId);

    logger.ticket(`Login ticket ${ticket.ticketId} marked delivered by ${staffUserId}`);

    scheduleRizzStoreQueueRefresh(client, ticket.guildId);

    return { session, completedAt };
  },

  async markLimitedTicketDelivered(
    client: Client<true>,
    ticket: TicketDocument,
    staffUserId: string,
    staffMention: string,
    finalPrice: number,
  ): Promise<{ session: LimitedOrderSessionDocument; completedAt: Date }> {
    if (ticket.status !== TicketStatus.OPEN) {
      throw new TicketError("TICKET_ALREADY_COMPLETED", "Ticket is not in an open state.");
    }

    if (!Number.isFinite(finalPrice) || finalPrice <= 0) {
      throw new TicketError("TICKET_CREATE_FAILED", "Final price must be greater than zero.");
    }

    const session = await limitedOrderSessionRepository.findBySessionId(ticket.sessionId);

    if (!session) {
      throw new TicketError("TICKET_CREATE_FAILED", "Order session not found for ticket.");
    }

    if (session.status === LimitedOrderSessionStatus.COMPLETED) {
      throw new TicketError("TICKET_ALREADY_COMPLETED", "Order session is already completed.");
    }

    const items = await ticketOrderItemService.getOrderItemsForTicket(ticket);
    await assertTicketPaidForDelivery(ticket);

    const completedAt = new Date();

    await limitedOrderSessionRepository.updateBySessionId(session.sessionId, {
      price: finalPrice,
      priceStatus: LimitedPriceStatus.FINAL,
      status: LimitedOrderSessionStatus.COMPLETED,
    });

    await ticketOrderItemRepository.updateBySessionId(session.sessionId, {
      price: finalPrice,
      orderStatus: TicketOrderItemStatus.COMPLETED,
    });

    const refreshedItems = await ticketOrderItemService.getOrderItemsForTicket(ticket);
    await ticketOrderItemService.completeAllOrderSessions(refreshedItems);

    await ticketRepository.updateByTicketId(ticket.ticketId, {
      status: TicketStatus.COMPLETED,
      completedAt,
      completedByUserId: staffUserId,
    });

    session.price = finalPrice;
    session.priceStatus = LimitedPriceStatus.FINAL;
    session.status = LimitedOrderSessionStatus.COMPLETED;

    await postDeliveryTransactionLog(
      client,
      ticket,
      staffMention,
      completedAt,
      buildLimitedTransactionLogEmbed({
        session,
        customerMention: `<@${ticket.userId}>`,
        staffMention,
        completedAt,
      }),
    );

    const channel = await getTicketTextChannel(client, ticket);

    if (channel && ticket.messageId) {
      const ticketMessage = await channel.messages.fetch(ticket.messageId).catch(() => null);

      if (ticketMessage) {
        await ticketMessage.edit({
          embeds: [buildCompletedLimitedTicketEmbed(session)],
          components: [buildLimitedTicketActionRow(ticket.ticketId, true)],
        });
      }
    }

    await finalizeDeliveredTicketWithVouch(client, ticket, session.robloxUsername);
    this.scheduleGiftTicketAutoClose(client, ticket.ticketId);

    logger.ticket(`Item Limited ticket ${ticket.ticketId} marked delivered by ${staffUserId}`);

    scheduleRizzStoreQueueRefresh(client, ticket.guildId);

    return { session, completedAt };
  },

  async markMiddlemanTicketDelivered(
    client: Client<true>,
    ticket: TicketDocument,
    staffUserId: string,
    staffMention: string,
  ): Promise<{ session: MiddlemanOrderSessionDocument; completedAt: Date }> {
    if (ticket.status !== TicketStatus.OPEN) {
      throw new TicketError("TICKET_ALREADY_COMPLETED", "Ticket is not in an open state.");
    }

    const session = await middlemanOrderSessionRepository.findBySessionId(ticket.sessionId);

    if (!session) {
      throw new TicketError("TICKET_CREATE_FAILED", "Order session not found for ticket.");
    }

    if (session.status === MiddlemanOrderSessionStatus.COMPLETED) {
      throw new TicketError("TICKET_ALREADY_COMPLETED", "Order session is already completed.");
    }

    const completedAt = new Date();
    const items = await ticketOrderItemService.getOrderItemsForTicket(ticket);
    await assertTicketPaidForDelivery(ticket);
    await ticketOrderItemService.completeAllOrderSessions(items);

    await middlemanOrderSessionRepository.updateBySessionId(session.sessionId, {
      status: MiddlemanOrderSessionStatus.COMPLETED,
    });

    await ticketRepository.updateByTicketId(ticket.ticketId, {
      status: TicketStatus.COMPLETED,
      completedAt,
      completedByUserId: staffUserId,
    });

    session.status = MiddlemanOrderSessionStatus.COMPLETED;

    await postDeliveryTransactionLog(
      client,
      ticket,
      staffMention,
      completedAt,
      buildMiddlemanTransactionLogEmbed({
        session,
        customerMention: `<@${ticket.userId}>`,
        staffMention,
        completedAt,
      }),
    );

    const channel = await getTicketTextChannel(client, ticket);

    if (channel && ticket.messageId) {
      const ticketMessage = await channel.messages.fetch(ticket.messageId).catch(() => null);

      if (ticketMessage) {
        await ticketMessage.edit({
          embeds: [buildCompletedMiddlemanTicketEmbed(session)],
          components: [buildMiddlemanTicketActionRow(ticket.ticketId, true)],
        });
      }
    }

    await finalizeDeliveredTicketWithVouch(client, ticket, session.party1Username);
    this.scheduleGiftTicketAutoClose(client, ticket.ticketId);

    logger.ticket(`Middleman ticket ${ticket.ticketId} marked delivered by ${staffUserId}`);

    scheduleRizzStoreQueueRefresh(client, ticket.guildId);

    return { session, completedAt };
  },

  async markCommunityPayoutTicketDelivered(
    client: Client<true>,
    ticket: TicketDocument,
    staffUserId: string,
    staffMention: string,
  ): Promise<{ session: CommunityPayoutOrderSessionDocument; completedAt: Date }> {
    if (ticket.status !== TicketStatus.OPEN) {
      throw new TicketError("TICKET_ALREADY_COMPLETED", "Ticket is not in an open state.");
    }

    const session = await communityPayoutOrderSessionRepository.findBySessionId(ticket.sessionId);

    if (!session) {
      throw new TicketError("TICKET_CREATE_FAILED", "Order session not found for ticket.");
    }

    if (session.status === CommunityPayoutOrderSessionStatus.COMPLETED) {
      throw new TicketError("TICKET_ALREADY_COMPLETED", "Order session is already completed.");
    }

    const completedAt = new Date();
    const items = await ticketOrderItemService.getOrderItemsForTicket(ticket);
    await assertTicketPaidForDelivery(ticket);
    await ticketOrderItemService.completeAllOrderSessions(items);

    await communityPayoutOrderSessionRepository.updateBySessionId(session.sessionId, {
      status: CommunityPayoutOrderSessionStatus.COMPLETED,
    });

    await ticketRepository.updateByTicketId(ticket.ticketId, {
      status: TicketStatus.COMPLETED,
      completedAt,
      completedByUserId: staffUserId,
    });

    session.status = CommunityPayoutOrderSessionStatus.COMPLETED;

    await postDeliveryTransactionLog(
      client,
      ticket,
      staffMention,
      completedAt,
      buildCommunityPayoutTransactionLogEmbed({
        session,
        customerMention: `<@${ticket.userId}>`,
        staffMention,
        completedAt,
      }),
    );

    const channel = await getTicketTextChannel(client, ticket);

    if (channel && ticket.messageId) {
      const ticketMessage = await channel.messages.fetch(ticket.messageId).catch(() => null);

      if (ticketMessage) {
        await ticketMessage.edit({
          embeds: [buildCompletedCommunityPayoutTicketEmbed(session)],
          components: [buildCommunityPayoutTicketActionRow(ticket.ticketId, true)],
        });
      }
    }

    await finalizeDeliveredTicketWithVouch(client, ticket, session.robloxUsername);
    this.scheduleGiftTicketAutoClose(client, ticket.ticketId);

    logger.ticket(`Community Payout ticket ${ticket.ticketId} marked delivered by ${staffUserId}`);

    scheduleRizzStoreQueueRefresh(client, ticket.guildId);

    return { session, completedAt };
  },

  scheduleGiftTicketAutoClose(client: Client<true>, ticketId: string): void {
    cancelAutoCloseTimer(ticketId);

    autoCloseTimers.set(
      ticketId,
      setTimeout(() => {
        autoCloseTimers.delete(ticketId);
        void this.closeGiftTicket(client, ticketId, null, true);
      }, GIFT_TICKET_AUTO_CLOSE_MS),
    );
  },

  async closeGiftTicket(
    client: Client<true>,
    ticketId: string,
    closedByUserId: string | null,
    isAutoClose = false,
  ): Promise<void> {
    cancelAutoCloseTimer(ticketId);

    const ticket = await ticketRepository.findByTicketId(ticketId);

    if (!ticket || ticket.status === TicketStatus.CLOSED) {
      return;
    }

    const channel = await getTicketTextChannel(client, ticket);

    if (channel && ticket.messageId) {
      const delivered = ticket.status === TicketStatus.COMPLETED;
      const actionRow =
        ticket.productType === ProductType.ITEM_LIMITED
          ? buildLimitedTicketActionRow(ticket.ticketId, delivered, true)
          : ticket.productType === ProductType.ROBUX_LOGIN
            ? buildLoginTicketActionRow(ticket.ticketId, delivered, true)
            : ticket.productType === ProductType.MIDDLEMAN
              ? buildMiddlemanTicketActionRow(ticket.ticketId, delivered)
              : ticket.productType === ProductType.COMMUNITY_PAYOUT
                ? buildCommunityPayoutTicketActionRow(ticket.ticketId, delivered, true)
                : buildTicketActionRow(ticket.ticketId, delivered, true);
      await channel.messages
        .fetch(ticket.messageId)
        .then((message) =>
          message.edit({
            components: [actionRow],
          }),
        )
        .catch(() => undefined);
    }

    await ticketRepository.closeByTicketId(ticketId);

    scheduleRizzStoreQueueRefresh(client, ticket.guildId);

    if (channel) {
      await channel.delete(isAutoClose ? "Gift ticket auto-closed" : "Gift ticket closed by staff").catch((error) => {
        logger.error(`Failed to delete ticket channel ${ticket.channelId}`, error);
      });
    }

    logger.ticket(
      `Gift ticket ${ticketId} closed${closedByUserId ? ` by ${closedByUserId}` : " (auto)"}`,
    );
  },

  async updateBulkTicketEmbed(
    client: Client,
    ticket: TicketDocument,
    items: TicketOrderItemDocument[],
    totals: TicketOrderTotals,
    knownChannel?: GuildTextBasedChannel | null,
  ): Promise<boolean> {
    if (!ticket.messageId) {
      return false;
    }

    const channel =
      knownChannel?.id === ticket.channelId
        ? knownChannel
        : await client.channels.fetch(ticket.channelId).catch(() => null);

    if (!channel?.isTextBased() || channel.isDMBased()) {
      return false;
    }

    try {
      const message = await channel.messages.fetch(ticket.messageId);
      const actionRow =
        ticket.productType === ProductType.ITEM_LIMITED
          ? buildLimitedTicketActionRow(ticket.ticketId)
          : ticket.productType === ProductType.ROBUX_LOGIN
            ? buildLoginTicketActionRow(ticket.ticketId)
            : ticket.productType === ProductType.MIDDLEMAN
              ? buildMiddlemanTicketActionRow(ticket.ticketId)
              : ticket.productType === ProductType.COMMUNITY_PAYOUT
                ? buildCommunityPayoutTicketActionRow(ticket.ticketId)
                : buildTicketActionRow(ticket.ticketId);

      await message.edit({
        embeds: [buildBulkTicketEmbed(items, totals)],
        components: [actionRow],
        files: [buildTicketQrAttachment()],
      });
      return true;
    } catch (error) {
      logger.error(`Failed to edit bulk ticket embed for ticket ${ticket.ticketId}`, error);
      return false;
    }
  },

  async updateMainTicketEmbed(
    client: Client,
    ticket: TicketDocument,
    session:
      | GiftOrderSessionDocument
      | RobuxOrderSessionDocument
      | LoginOrderSessionDocument
      | LimitedOrderSessionDocument
      | MiddlemanOrderSessionDocument
      | CommunityPayoutOrderSessionDocument,
    knownChannel?: GuildTextBasedChannel | null,
  ): Promise<boolean> {
    if (!ticket.messageId) {
      return false;
    }

    const channel =
      knownChannel?.id === ticket.channelId
        ? knownChannel
        : await client.channels.fetch(ticket.channelId).catch(() => null);

    if (!channel?.isTextBased() || channel.isDMBased()) {
      logger.warn(`Failed to update main ticket embed: channel ${ticket.channelId} unavailable`);
      return false;
    }

    try {
      const message = await channel.messages.fetch(ticket.messageId);
      const items = await ticketOrderItemService.getOrderItemsForTicket(ticket);
      const totalPaidIdr =
        ticket.totalPaidIdr ?? (await ticketPaymentRecordRepository.sumAmountByTicketId(ticket.ticketId));
      const totals = ticketOrderItemService.calculateTotals(items, totalPaidIdr);

      if (items.length > 1 || ticket.isBulk) {
        const actionRow =
          ticket.productType === ProductType.ITEM_LIMITED
            ? buildLimitedTicketActionRow(ticket.ticketId)
            : ticket.productType === ProductType.ROBUX_LOGIN
              ? buildLoginTicketActionRow(ticket.ticketId)
              : ticket.productType === ProductType.MIDDLEMAN
                ? buildMiddlemanTicketActionRow(ticket.ticketId)
                : ticket.productType === ProductType.COMMUNITY_PAYOUT
                  ? buildCommunityPayoutTicketActionRow(ticket.ticketId)
                  : buildTicketActionRow(ticket.ticketId);

        await message.edit({
          embeds: [buildBulkTicketEmbed(items, totals)],
          components: [actionRow],
          files: [buildTicketQrAttachment()],
        });
        return true;
      }

      const embed =
        ticket.productType === ProductType.ITEM_LIMITED
          ? buildActiveLimitedTicketEmbed(session as LimitedOrderSessionDocument)
          : ticket.productType === ProductType.ROBUX_LOGIN
            ? buildActiveLoginTicketEmbed(session as LoginOrderSessionDocument)
            : ticket.productType === ProductType.ROBUX_USERNAME
              ? buildActiveRobuxTicketEmbed(session as RobuxOrderSessionDocument)
              : ticket.productType === ProductType.MIDDLEMAN
                ? buildActiveMiddlemanTicketEmbed(session as MiddlemanOrderSessionDocument)
                : ticket.productType === ProductType.COMMUNITY_PAYOUT
                  ? buildActiveCommunityPayoutTicketEmbed(session as CommunityPayoutOrderSessionDocument)
                  : buildActiveGiftTicketEmbed(session as GiftOrderSessionDocument);

      await message.edit({
        embeds: [embed],
        components: [
          ticket.productType === ProductType.ITEM_LIMITED
            ? buildLimitedTicketActionRow(ticket.ticketId)
            : ticket.productType === ProductType.ROBUX_LOGIN
              ? buildLoginTicketActionRow(ticket.ticketId)
              : ticket.productType === ProductType.MIDDLEMAN
                ? buildMiddlemanTicketActionRow(ticket.ticketId)
                : ticket.productType === ProductType.COMMUNITY_PAYOUT
                  ? buildCommunityPayoutTicketActionRow(ticket.ticketId)
                  : buildTicketActionRow(ticket.ticketId),
        ],
        files: [buildTicketQrAttachment()],
      });
      return true;
    } catch (error) {
      logger.error(`Failed to edit main ticket embed for ticket ${ticket.ticketId}`, error);
      return false;
    }
  },

  async getTicketChannel(client: Client<true>, ticket: TicketDocument) {
    return client.channels.fetch(ticket.channelId).catch(() => null);
  },

  async syncOpenGiftTicketBotPermissions(client: Client<true>): Promise<void> {
    const tickets = await ticketRepository.findAllActive();
    const botId = client.user.id;

    for (const ticket of tickets) {
      try {
        if (
          (ticket.productType !== ProductType.GIFT_IN_GAME &&
            ticket.productType !== ProductType.ROBUX_USERNAME &&
            ticket.productType !== ProductType.ROBUX_LOGIN &&
            ticket.productType !== ProductType.ITEM_LIMITED &&
            ticket.productType !== ProductType.MIDDLEMAN &&
            ticket.productType !== ProductType.COMMUNITY_PAYOUT) ||
          ticket.status !== TicketStatus.OPEN
        ) {
          continue;
        }

        const channel = await client.channels.fetch(ticket.channelId).catch(() => null);

        if (!channel?.isTextBased() || channel.isDMBased() || channel.type !== ChannelType.GuildText) {
          continue;
        }

        const textChannel = channel as TextChannel;
        const botOverwrite = textChannel.permissionOverwrites.cache.get(botId);

        if (botOverwrite?.allow.has(PermissionFlagsBits.ViewChannel)) {
          continue;
        }

        await textChannel.permissionOverwrites
          .edit(botId, {
            ViewChannel: true,
            SendMessages: true,
            ReadMessageHistory: true,
            EmbedLinks: true,
            AttachFiles: true,
            ManageChannels: true,
          })
          .then(() => {
            logger.ticket(`Synced bot permissions for open ticket channel ${textChannel.id}`);
          })
          .catch((error: unknown) => {
            logger.warn(`Failed to sync bot permissions for ticket channel ${textChannel.id}`);
            logger.error("Ticket permission sync detail", error);
          });
      } catch (error) {
        logger.warn(`Skipped permission sync for ticket ${ticket.ticketId}`);
        logger.error("Ticket permission sync detail", error);
      }
    }
  },
};
