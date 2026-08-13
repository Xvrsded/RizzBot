import {
  RobuxOrderSessionModel,
  RobuxOrderSessionStatus,
  type IRobuxOrderSession,
  type RobuxOrderSessionDocument,
} from "../models/robux-order-session.model";

export const robuxOrderSessionRepository = {
  async findBySessionId(sessionId: string): Promise<RobuxOrderSessionDocument | null> {
    return RobuxOrderSessionModel.findOne({ sessionId }).exec();
  },

  async create(
    data: Omit<IRobuxOrderSession, "createdAt" | "updatedAt">,
  ): Promise<RobuxOrderSessionDocument> {
    return RobuxOrderSessionModel.create(data);
  },

  async updateBySessionId(
    sessionId: string,
    data: Partial<
      Pick<
        IRobuxOrderSession,
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
  ): Promise<RobuxOrderSessionDocument | null> {
    return RobuxOrderSessionModel.findOneAndUpdate({ sessionId }, { $set: data }, { new: true }).exec();
  },

  async updateStatusToPaidIfConfirmed(sessionId: string): Promise<RobuxOrderSessionDocument | null> {
    return RobuxOrderSessionModel.findOneAndUpdate(
      { sessionId, status: RobuxOrderSessionStatus.CONFIRMED },
      { $set: { status: RobuxOrderSessionStatus.PAID } },
      { new: true },
    ).exec();
  },

  async expirePendingSessions(): Promise<number> {
    const result = await RobuxOrderSessionModel.updateMany(
      {
        status: RobuxOrderSessionStatus.PENDING,
        expiresAt: { $lt: new Date() },
      },
      { $set: { status: RobuxOrderSessionStatus.EXPIRED } },
    ).exec();

    return result.modifiedCount;
  },
};
