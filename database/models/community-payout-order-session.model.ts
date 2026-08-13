import { Schema, model, type Document, type Model } from "mongoose";

export enum CommunityPayoutOrderSessionStatus {
  PENDING = "PENDING",
  CONFIRMED = "CONFIRMED",
  PAID = "PAID",
  COMPLETED = "COMPLETED",
  CANCELLED = "CANCELLED",
  EXPIRED = "EXPIRED",
}

export interface ICommunityPayoutOrderSession {
  sessionId: string;
  orderCode: string;
  guildId: string;
  userId: string;
  robuxAmount: number;
  finalPrice: number;
  robloxUserId: number;
  robloxUsername: string;
  robloxDisplayName: string;
  robloxAvatarUrl: string | null;
  status: CommunityPayoutOrderSessionStatus;
  expiresAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

export type CommunityPayoutOrderSessionDocument = Document & ICommunityPayoutOrderSession;

const communityPayoutOrderSessionSchema = new Schema<CommunityPayoutOrderSessionDocument>(
  {
    sessionId: { type: String, required: true, unique: true, index: true },
    orderCode: { type: String, required: true, unique: true, index: true },
    guildId: { type: String, required: true, index: true },
    userId: { type: String, required: true, index: true },
    robuxAmount: { type: Number, required: true },
    finalPrice: { type: Number, required: true },
    robloxUserId: { type: Number, required: true },
    robloxUsername: { type: String, required: true },
    robloxDisplayName: { type: String, required: true },
    robloxAvatarUrl: { type: String, default: null },
    status: {
      type: String,
      enum: Object.values(CommunityPayoutOrderSessionStatus),
      default: CommunityPayoutOrderSessionStatus.PENDING,
    },
    expiresAt: { type: Date, required: true, index: true },
  },
  {
    timestamps: true,
    collection: "community_payout_order_sessions",
  },
);

export const CommunityPayoutOrderSessionModel: Model<CommunityPayoutOrderSessionDocument> =
  model<CommunityPayoutOrderSessionDocument>(
    "CommunityPayoutOrderSession",
    communityPayoutOrderSessionSchema,
  );
