import {
  LimitedOrderSessionModel,
  LimitedOrderSessionStatus,
  LimitedPriceStatus,
  type ILimitedOrderSession,
  type LimitedOrderSessionDocument,
} from "../models/limited-order-session.model";

export const limitedOrderSessionRepository = {
  async findBySessionId(sessionId: string): Promise<LimitedOrderSessionDocument | null> {
    return LimitedOrderSessionModel.findOne({ sessionId }).exec();
  },

  async create(
    data: Omit<ILimitedOrderSession, "createdAt" | "updatedAt">,
  ): Promise<LimitedOrderSessionDocument> {
    return LimitedOrderSessionModel.create(data);
  },

  async updateBySessionId(
    sessionId: string,
    data: Partial<
      Pick<
        ILimitedOrderSession,
        | "itemName"
        | "price"
        | "priceStatus"
        | "robloxUserId"
        | "robloxUsername"
        | "robloxDisplayName"
        | "robloxAvatarUrl"
        | "status"
        | "expiresAt"
      >
    >,
  ): Promise<LimitedOrderSessionDocument | null> {
    return LimitedOrderSessionModel.findOneAndUpdate({ sessionId }, { $set: data }, { new: true }).exec();
  },

  async updateStatusToPaidIfConfirmed(sessionId: string): Promise<LimitedOrderSessionDocument | null> {
    return LimitedOrderSessionModel.findOneAndUpdate(
      { sessionId, status: LimitedOrderSessionStatus.CONFIRMED },
      { $set: { status: LimitedOrderSessionStatus.PAID } },
      { new: true },
    ).exec();
  },

  async expirePendingSessions(): Promise<number> {
    const result = await LimitedOrderSessionModel.updateMany(
      {
        status: LimitedOrderSessionStatus.PENDING,
        expiresAt: { $lt: new Date() },
      },
      { $set: { status: LimitedOrderSessionStatus.EXPIRED } },
    ).exec();

    return result.modifiedCount;
  },
};
