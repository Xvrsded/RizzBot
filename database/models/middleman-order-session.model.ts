import { Schema, model, type Document, type Model } from "mongoose";

export enum MiddlemanOrderSessionStatus {
  PENDING = "PENDING",
  CONFIRMED = "CONFIRMED",
  PAID = "PAID",
  COMPLETED = "COMPLETED",
  CANCELLED = "CANCELLED",
  EXPIRED = "EXPIRED",
}

export interface IMiddlemanOrderSession {
  sessionId: string;
  orderCode: string;
  guildId: string;
  userId: string;
  transactionAmountIdr: number;
  middlemanFeeIdr: number;
  finalPrice: number;
  party1Username: string;
  party2Username: string;
  transactionDetail: string;
  status: MiddlemanOrderSessionStatus;
  expiresAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

export type MiddlemanOrderSessionDocument = Document & IMiddlemanOrderSession;

const middlemanOrderSessionSchema = new Schema<MiddlemanOrderSessionDocument>(
  {
    sessionId: { type: String, required: true, unique: true, index: true },
    orderCode: { type: String, required: true, unique: true, index: true },
    guildId: { type: String, required: true, index: true },
    userId: { type: String, required: true, index: true },
    transactionAmountIdr: { type: Number, required: true },
    middlemanFeeIdr: { type: Number, required: true },
    finalPrice: { type: Number, required: true },
    party1Username: { type: String, required: true },
    party2Username: { type: String, required: true },
    transactionDetail: { type: String, required: true },
    status: {
      type: String,
      enum: Object.values(MiddlemanOrderSessionStatus),
      default: MiddlemanOrderSessionStatus.PENDING,
    },
    expiresAt: { type: Date, required: true, index: true },
  },
  {
    timestamps: true,
    collection: "middleman_order_sessions",
  },
);

export const MiddlemanOrderSessionModel: Model<MiddlemanOrderSessionDocument> =
  model<MiddlemanOrderSessionDocument>("MiddlemanOrderSession", middlemanOrderSessionSchema);
