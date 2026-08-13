import { Schema, model, type Document, type Model } from "mongoose";

export enum LimitedOrderSessionStatus {
  PENDING = "PENDING",
  CONFIRMED = "CONFIRMED",
  PAID = "PAID",
  COMPLETED = "COMPLETED",
  CANCELLED = "CANCELLED",
  EXPIRED = "EXPIRED",
}

export enum LimitedPriceStatus {
  UNSET = "UNSET",
  FINAL = "FINAL",
}

export interface ILimitedOrderSession {
  sessionId: string;
  orderCode: string;
  guildId: string;
  userId: string;
  itemName: string;
  price: number | null;
  priceStatus: LimitedPriceStatus;
  robloxUserId: number;
  robloxUsername: string;
  robloxDisplayName: string;
  robloxAvatarUrl: string | null;
  status: LimitedOrderSessionStatus;
  expiresAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

export type LimitedOrderSessionDocument = Document & ILimitedOrderSession;

const limitedOrderSessionSchema = new Schema<LimitedOrderSessionDocument>(
  {
    sessionId: { type: String, required: true, unique: true, index: true },
    orderCode: { type: String, required: true, unique: true, index: true },
    guildId: { type: String, required: true, index: true },
    userId: { type: String, required: true, index: true },
    itemName: { type: String, required: true },
    price: { type: Number, default: null },
    priceStatus: {
      type: String,
      enum: Object.values(LimitedPriceStatus),
      default: LimitedPriceStatus.UNSET,
    },
    robloxUserId: { type: Number, required: true },
    robloxUsername: { type: String, required: true },
    robloxDisplayName: { type: String, required: true },
    robloxAvatarUrl: { type: String, default: null },
    status: {
      type: String,
      enum: Object.values(LimitedOrderSessionStatus),
      default: LimitedOrderSessionStatus.PENDING,
    },
    expiresAt: { type: Date, required: true, index: true },
  },
  {
    timestamps: true,
    collection: "limited_order_sessions",
  },
);

export const LimitedOrderSessionModel: Model<LimitedOrderSessionDocument> = model<LimitedOrderSessionDocument>(
  "LimitedOrderSession",
  limitedOrderSessionSchema,
);
