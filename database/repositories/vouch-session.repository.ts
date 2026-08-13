import {
  VouchSessionModel,
  VouchSessionStatus,
  type IVouchSession,
  type VouchSessionDocument,
} from "../models/vouch-session.model";

export const vouchSessionRepository = {
  async findByVoucherId(voucherId: string): Promise<VouchSessionDocument | null> {
    return VouchSessionModel.findOne({ voucherId }).exec();
  },

  async findByOrderId(orderId: string): Promise<VouchSessionDocument | null> {
    return VouchSessionModel.findOne({ orderId }).exec();
  },

  async create(data: Omit<IVouchSession, "createdAt" | "updatedAt">): Promise<VouchSessionDocument> {
    return VouchSessionModel.create(data);
  },

  async submitVouch(
    voucherId: string,
    rating: number,
    review: string,
  ): Promise<VouchSessionDocument | null> {
    return VouchSessionModel.findOneAndUpdate(
      { voucherId, status: VouchSessionStatus.PENDING },
      {
        $set: {
          rating,
          review,
          status: VouchSessionStatus.SUBMITTED,
          submittedAt: new Date(),
        },
      },
      { new: true },
    ).exec();
  },
};
