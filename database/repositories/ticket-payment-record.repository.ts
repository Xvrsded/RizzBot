import {
  TicketPaymentRecordModel,
  type ITicketPaymentRecord,
  type TicketPaymentRecordDocument,
} from "../models/ticket-payment-record.model";

export const ticketPaymentRecordRepository = {
  async findByDiscordMessageId(discordMessageId: string): Promise<TicketPaymentRecordDocument | null> {
    return TicketPaymentRecordModel.findOne({ discordMessageId }).exec();
  },

  async findByTicketId(ticketId: string): Promise<TicketPaymentRecordDocument[]> {
    return TicketPaymentRecordModel.find({ ticketId }).sort({ createdAt: 1 }).exec();
  },

  async sumAmountByTicketId(ticketId: string): Promise<number> {
    const result = await TicketPaymentRecordModel.aggregate<{ total: number }>([
      { $match: { ticketId } },
      { $group: { _id: null, total: { $sum: "$amountIdr" } } },
    ]).exec();

    return result[0]?.total ?? 0;
  },

  async create(
    data: Omit<ITicketPaymentRecord, "createdAt" | "updatedAt">,
  ): Promise<TicketPaymentRecordDocument> {
    return TicketPaymentRecordModel.create(data);
  },
};
