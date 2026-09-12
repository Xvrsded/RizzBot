import { Schema, model, type Document, type Model } from "mongoose";
import { ROBUX_RATE_IDR } from "../../shared/products";

export enum GiftOrderSessionStatus {
  PENDING = "PENDING",
  CONFIRMED = "CONFIRMED",
  PAID = "PAID",
  COMPLETED = "COMPLETED",
  CANCELLED = "CANCELLED",
  EXPIRED = "EXPIRED",
}

export interface IGiftOrderSession {
  sessionId: string;
  orderCode: string;
  guildId: string;
  userId: string;
  gameName: string;
  gamepassName: string;
  robuxAmount: number;
  robloxUserId: number;
  robloxUsername: string;
  robloxDisplayName: string;
  robloxAvatarUrl: string | null;
  rawPrice: number;
  finalPrice: number;
  rateIdr: number;
  status: GiftOrderSessionStatus;
  expiresAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

export type GiftOrderSessionDocument = Document & IGiftOrderSession;

const giftOrderSessionSchema = new Schema<GiftOrderSessionDocument>(
  {
    sessionId: { type: String, required: true, unique: true, index: true },
    orderCode: { type: String, required: true, unique: true, index: true },
    guildId: { type: String, required: true, index: true },
    userId: { type: String, required: true, index: true },
    gameName: { type: String, required: true },
    gamepassName: { type: String, required: true },
    robuxAmount: { type: Number, required: true },
    robloxUserId: { type: Number, required: true },
    robloxUsername: { type: String, required: true },
    robloxDisplayName: { type: String, required: true },
    robloxAvatarUrl: { type: String, default: null },
    rawPrice: { type: Number, required: true },
    finalPrice: { type: Number, required: true },
    rateIdr: { type: Number, default: ROBUX_RATE_IDR },
    status: {
      type: String,
      enum: Object.values(GiftOrderSessionStatus),
      default: GiftOrderSessionStatus.PENDING,
    },
    expiresAt: { type: Date, required: true, index: true },
  },
  {
    timestamps: true,
    collection: "gift_order_sessions",
  },
);

export const GiftOrderSessionModel: Model<GiftOrderSessionDocument> =
  model<GiftOrderSessionDocument>("GiftOrderSession", giftOrderSessionSchema);
