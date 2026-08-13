import {
  GiftOrderSessionModel,
  GiftOrderSessionStatus,
  type GiftOrderSessionDocument,
  type IGiftOrderSession,
} from "../models/gift-order-session.model";

export const giftOrderSessionRepository = {
  async findBySessionId(sessionId: string): Promise<GiftOrderSessionDocument | null> {
    return GiftOrderSessionModel.findOne({ sessionId }).exec();
  },

  async create(data: Omit<IGiftOrderSession, "createdAt" | "updatedAt">): Promise<GiftOrderSessionDocument> {
    return GiftOrderSessionModel.create(data);
  },

  async updateBySessionId(
    sessionId: string,
    data: Partial<Pick<IGiftOrderSession, "gameName" | "gamepassName" | "robuxAmount" | "robloxUserId" | "robloxUsername" | "robloxDisplayName" | "robloxAvatarUrl" | "rawPrice" | "finalPrice" | "status" | "expiresAt">>,
  ): Promise<GiftOrderSessionDocument | null> {
    return GiftOrderSessionModel.findOneAndUpdate({ sessionId }, { $set: data }, { new: true }).exec();
  },

  async updateStatusToPaidIfConfirmed(sessionId: string): Promise<GiftOrderSessionDocument | null> {
    return GiftOrderSessionModel.findOneAndUpdate(
      { sessionId, status: GiftOrderSessionStatus.CONFIRMED },
      { $set: { status: GiftOrderSessionStatus.PAID } },
      { new: true },
    ).exec();
  },

  async expirePendingSessions(): Promise<number> {
    const result = await GiftOrderSessionModel.updateMany(
      {
        status: GiftOrderSessionStatus.PENDING,
        expiresAt: { $lt: new Date() },
      },
      { $set: { status: GiftOrderSessionStatus.EXPIRED } },
    ).exec();

    return result.modifiedCount;
  },
};
