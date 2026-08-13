import { Schema, model, type Document, type Model } from "mongoose";

export enum RobuxOrderSessionStatus {
  PENDING = "PENDING",
  CONFIRMED = "CONFIRMED",
  PAID = "PAID",
  COMPLETED = "COMPLETED",
  CANCELLED = "CANCELLED",
  EXPIRED = "EXPIRED",
}

export interface IRobuxOrderSession {
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
  status: RobuxOrderSessionStatus;
  expiresAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

export type RobuxOrderSessionDocument = Document & IRobuxOrderSession;

const robuxOrderSessionSchema = new Schema<RobuxOrderSessionDocument>(
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
      enum: Object.values(RobuxOrderSessionStatus),
      default: RobuxOrderSessionStatus.PENDING,
    },
    expiresAt: { type: Date, required: true, index: true },
  },
  {
    timestamps: true,
    collection: "robux_order_sessions",
  },
);

export const RobuxOrderSessionModel: Model<RobuxOrderSessionDocument> =
  model<RobuxOrderSessionDocument>("RobuxOrderSession", robuxOrderSessionSchema);
