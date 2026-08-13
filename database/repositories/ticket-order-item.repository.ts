import {
  TicketOrderItemModel,
  TicketOrderItemStatus,
  type ITicketOrderItem,
  type TicketOrderItemDocument,
} from "../models/ticket-order-item.model";

export const ticketOrderItemRepository = {
  async findByItemId(itemId: string): Promise<TicketOrderItemDocument | null> {
    return TicketOrderItemModel.findOne({ itemId }).exec();
  },

  async findBySessionId(sessionId: string): Promise<TicketOrderItemDocument | null> {
    return TicketOrderItemModel.findOne({ sessionId }).exec();
  },

  async findByTicketId(ticketId: string): Promise<TicketOrderItemDocument[]> {
    return TicketOrderItemModel.find({ ticketId }).sort({ createdAt: 1 }).exec();
  },

  async countByTicketId(ticketId: string): Promise<number> {
    return TicketOrderItemModel.countDocuments({ ticketId }).exec();
  },

  async create(data: Omit<ITicketOrderItem, "createdAt" | "updatedAt">): Promise<TicketOrderItemDocument> {
    return TicketOrderItemModel.create(data);
  },

  async updateByItemId(
    itemId: string,
    data: Partial<Pick<ITicketOrderItem, "price" | "orderStatus">>,
  ): Promise<TicketOrderItemDocument | null> {
    return TicketOrderItemModel.findOneAndUpdate({ itemId }, { $set: data }, { new: true }).exec();
  },

  async updateBySessionId(
    sessionId: string,
    data: Partial<Pick<ITicketOrderItem, "price" | "orderStatus">>,
  ): Promise<TicketOrderItemDocument | null> {
    return TicketOrderItemModel.findOneAndUpdate({ sessionId }, { $set: data }, { new: true }).exec();
  },

  async markPendingItemsPaidUpToAmount(
    ticketId: string,
    amountIdr: number,
  ): Promise<{ items: TicketOrderItemDocument[]; appliedAmount: number }> {
    const pendingItems = await TicketOrderItemModel.find({
      ticketId,
      orderStatus: TicketOrderItemStatus.PENDING_PAYMENT,
    })
      .sort({ createdAt: 1 })
      .exec();

    if (pendingItems.length === 0) {
      return { items: [], appliedAmount: 0 };
    }

    let remaining = amountIdr;
    const updatedItems: TicketOrderItemDocument[] = [];

    if (pendingItems.length === 1) {
      const item = pendingItems[0]!;
      const itemPrice = item.price ?? 0;
      if (itemPrice <= 0 || remaining >= itemPrice) {
        item.orderStatus = TicketOrderItemStatus.PAID;
        await item.save();
        updatedItems.push(item);
        return { items: updatedItems, appliedAmount: itemPrice };
      }
    }

    const totalPending = pendingItems.reduce((sum, item) => sum + (item.price ?? 0), 0);

    if (remaining >= totalPending && totalPending > 0) {
      for (const item of pendingItems) {
        item.orderStatus = TicketOrderItemStatus.PAID;
        await item.save();
        updatedItems.push(item);
      }
      return { items: updatedItems, appliedAmount: totalPending };
    }

    for (const item of pendingItems) {
      const itemPrice = item.price ?? 0;
      if (itemPrice <= 0) {
        continue;
      }

      if (remaining >= itemPrice) {
        item.orderStatus = TicketOrderItemStatus.PAID;
        await item.save();
        updatedItems.push(item);
        remaining -= itemPrice;
      } else {
        break;
      }
    }

    const appliedAmount = updatedItems.reduce((sum, item) => sum + (item.price ?? 0), 0);
    return { items: updatedItems, appliedAmount };
  },

  async markAllPendingPaid(ticketId: string): Promise<TicketOrderItemDocument[]> {
    await TicketOrderItemModel.updateMany(
      { ticketId, orderStatus: TicketOrderItemStatus.PENDING_PAYMENT },
      { $set: { orderStatus: TicketOrderItemStatus.PAID } },
    ).exec();

    return TicketOrderItemModel.find({ ticketId }).sort({ createdAt: 1 }).exec();
  },

  async markAllPaidCompleted(ticketId: string): Promise<void> {
    await TicketOrderItemModel.updateMany(
      { ticketId, orderStatus: TicketOrderItemStatus.PAID },
      { $set: { orderStatus: TicketOrderItemStatus.COMPLETED } },
    ).exec();
  },
};
