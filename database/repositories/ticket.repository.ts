import {
  TicketModel,
  TicketStatus,
  type TicketDocument,
  type ITicket,
} from "../models/ticket.model";
import type { ProductType } from "../../shared/products";
import { TicketPaymentStatus } from "../models/ticket.model";

export type TicketUpdate = Partial<
  Pick<
    ITicket,
    "status" | "messageId" | "completedAt" | "completedByUserId" | "paymentStatus" | "totalPaidIdr" | "isBulk"
  >
>;

export const ticketRepository = {
  async findOpenByUserAndProduct(
    guildId: string,
    userId: string,
    productType: ProductType,
  ): Promise<TicketDocument | null> {
    return TicketModel.findOne({
      guildId,
      userId,
      productType,
      status: TicketStatus.OPEN,
    }).exec();
  },

  async findOpenByUser(guildId: string, userId: string): Promise<TicketDocument | null> {
    return TicketModel.findOne({
      guildId,
      userId,
      status: TicketStatus.OPEN,
    }).exec();
  },

  async findByTicketId(ticketId: string): Promise<TicketDocument | null> {
    return TicketModel.findOne({ ticketId }).exec();
  },

  async findByChannelId(channelId: string): Promise<TicketDocument | null> {
    return TicketModel.findOne({ channelId }).exec();
  },

  async findAllActive(): Promise<TicketDocument[]> {
    return TicketModel.find({
      status: { $in: [TicketStatus.OPEN, TicketStatus.COMPLETED] },
    }).exec();
  },

  async countOpenByGuild(guildId: string): Promise<number> {
    return TicketModel.countDocuments({ guildId, status: TicketStatus.OPEN }).exec();
  },

  async updateByTicketId(ticketId: string, data: TicketUpdate): Promise<TicketDocument | null> {
    return TicketModel.findOneAndUpdate({ ticketId }, { $set: data }, { new: true }).exec();
  },

  async closeByTicketId(ticketId: string): Promise<TicketDocument | null> {
    return TicketModel.findOneAndUpdate(
      { ticketId },
      { status: TicketStatus.CLOSED },
      { new: true },
    ).exec();
  },

  async create(
    data: Omit<ITicket, "createdAt" | "updatedAt" | "paymentStatus" | "totalPaidIdr" | "isBulk"> &
      Partial<Pick<ITicket, "paymentStatus" | "totalPaidIdr" | "isBulk">>,
  ): Promise<TicketDocument> {
    return TicketModel.create({
      paymentStatus: TicketPaymentStatus.PENDING_PAYMENT,
      totalPaidIdr: 0,
      isBulk: false,
      ...data,
    });
  },
};
