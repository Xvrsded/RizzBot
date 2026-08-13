import {
  MiddlemanOrderSessionModel,
  MiddlemanOrderSessionStatus,
  type IMiddlemanOrderSession,
  type MiddlemanOrderSessionDocument,
} from "../models/middleman-order-session.model";

export const middlemanOrderSessionRepository = {
  async findBySessionId(sessionId: string): Promise<MiddlemanOrderSessionDocument | null> {
    return MiddlemanOrderSessionModel.findOne({ sessionId }).exec();
  },

  async create(
    data: Omit<IMiddlemanOrderSession, "createdAt" | "updatedAt">,
  ): Promise<MiddlemanOrderSessionDocument> {
    return MiddlemanOrderSessionModel.create(data);
  },

  async updateBySessionId(
    sessionId: string,
    data: Partial<
      Pick<
        IMiddlemanOrderSession,
        | "transactionAmountIdr"
        | "middlemanFeeIdr"
        | "finalPrice"
        | "party1Username"
        | "party2Username"
        | "transactionDetail"
        | "status"
        | "expiresAt"
      >
    >,
  ): Promise<MiddlemanOrderSessionDocument | null> {
    return MiddlemanOrderSessionModel.findOneAndUpdate({ sessionId }, { $set: data }, { new: true }).exec();
  },

  async updateStatusToPaidIfConfirmed(sessionId: string): Promise<MiddlemanOrderSessionDocument | null> {
    return MiddlemanOrderSessionModel.findOneAndUpdate(
      { sessionId, status: MiddlemanOrderSessionStatus.CONFIRMED },
      { $set: { status: MiddlemanOrderSessionStatus.PAID } },
      { new: true },
    ).exec();
  },

  async expirePendingSessions(): Promise<number> {
    const result = await MiddlemanOrderSessionModel.updateMany(
      {
        status: MiddlemanOrderSessionStatus.PENDING,
        expiresAt: { $lt: new Date() },
      },
      { $set: { status: MiddlemanOrderSessionStatus.EXPIRED } },
    ).exec();

    return result.modifiedCount;
  },
};
