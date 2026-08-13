import {
  CommunityPayoutOrderSessionModel,
  CommunityPayoutOrderSessionStatus,
  type CommunityPayoutOrderSessionDocument,
  type ICommunityPayoutOrderSession,
} from "../models/community-payout-order-session.model";

export const communityPayoutOrderSessionRepository = {
  async findBySessionId(sessionId: string): Promise<CommunityPayoutOrderSessionDocument | null> {
    return CommunityPayoutOrderSessionModel.findOne({ sessionId }).exec();
  },

  async create(
    data: Omit<ICommunityPayoutOrderSession, "createdAt" | "updatedAt">,
  ): Promise<CommunityPayoutOrderSessionDocument> {
    return CommunityPayoutOrderSessionModel.create(data);
  },

  async updateBySessionId(
    sessionId: string,
    data: Partial<
      Pick<
        ICommunityPayoutOrderSession,
        | "robuxAmount"
        | "finalPrice"
        | "robloxUserId"
        | "robloxUsername"
        | "robloxDisplayName"
        | "robloxAvatarUrl"
        | "status"
        | "expiresAt"
      >
    >,
  ): Promise<CommunityPayoutOrderSessionDocument | null> {
    return CommunityPayoutOrderSessionModel.findOneAndUpdate(
      { sessionId },
      { $set: data },
      { new: true },
    ).exec();
  },

  async updateStatusToPaidIfConfirmed(
    sessionId: string,
  ): Promise<CommunityPayoutOrderSessionDocument | null> {
    return CommunityPayoutOrderSessionModel.findOneAndUpdate(
      { sessionId, status: CommunityPayoutOrderSessionStatus.CONFIRMED },
      { $set: { status: CommunityPayoutOrderSessionStatus.PAID } },
      { new: true },
    ).exec();
  },

  async expirePendingSessions(): Promise<number> {
    const result = await CommunityPayoutOrderSessionModel.updateMany(
      {
        status: CommunityPayoutOrderSessionStatus.PENDING,
        expiresAt: { $lt: new Date() },
      },
      { $set: { status: CommunityPayoutOrderSessionStatus.EXPIRED } },
    ).exec();

    return result.modifiedCount;
  },
};
