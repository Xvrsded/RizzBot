import {
  LoginOrderSessionModel,
  LoginOrderSessionStatus,
  type ILoginOrderSession,
  type LoginOrderSessionDocument,
} from "../models/login-order-session.model";

export const loginOrderSessionRepository = {
  async findBySessionId(sessionId: string): Promise<LoginOrderSessionDocument | null> {
    return LoginOrderSessionModel.findOne({ sessionId }).exec();
  },

  async create(
    data: Omit<ILoginOrderSession, "createdAt" | "updatedAt">,
  ): Promise<LoginOrderSessionDocument> {
    return LoginOrderSessionModel.create(data);
  },

  async updateBySessionId(
    sessionId: string,
    data: Partial<
      Pick<
        ILoginOrderSession,
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
  ): Promise<LoginOrderSessionDocument | null> {
    return LoginOrderSessionModel.findOneAndUpdate({ sessionId }, { $set: data }, { new: true }).exec();
  },

  async updateStatusToPaidIfConfirmed(sessionId: string): Promise<LoginOrderSessionDocument | null> {
    return LoginOrderSessionModel.findOneAndUpdate(
      { sessionId, status: LoginOrderSessionStatus.CONFIRMED },
      { $set: { status: LoginOrderSessionStatus.PAID } },
      { new: true },
    ).exec();
  },

  async expirePendingSessions(): Promise<number> {
    const result = await LoginOrderSessionModel.updateMany(
      {
        status: LoginOrderSessionStatus.PENDING,
        expiresAt: { $lt: new Date() },
      },
      { $set: { status: LoginOrderSessionStatus.EXPIRED } },
    ).exec();

    return result.modifiedCount;
  },
};
