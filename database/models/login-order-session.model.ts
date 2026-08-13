import { Schema, model, type Document, type Model } from "mongoose";

export enum LoginOrderSessionStatus {
  PENDING = "PENDING",
  CONFIRMED = "CONFIRMED",
  PAID = "PAID",
  COMPLETED = "COMPLETED",
  CANCELLED = "CANCELLED",
  EXPIRED = "EXPIRED",
}

export interface ILoginOrderSession {
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
  status: LoginOrderSessionStatus;
  expiresAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

export type LoginOrderSessionDocument = Document & ILoginOrderSession;

const loginOrderSessionSchema = new Schema<LoginOrderSessionDocument>(
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
      enum: Object.values(LoginOrderSessionStatus),
      default: LoginOrderSessionStatus.PENDING,
    },
    expiresAt: { type: Date, required: true, index: true },
  },
  {
    timestamps: true,
    collection: "login_order_sessions",
  },
);

export const LoginOrderSessionModel: Model<LoginOrderSessionDocument> = model<LoginOrderSessionDocument>(
  "LoginOrderSession",
  loginOrderSessionSchema,
);
