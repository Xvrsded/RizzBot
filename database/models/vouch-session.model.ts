import { Schema, model, type Document, type Model } from "mongoose";
import type { ProductType } from "../../shared/products";

export enum VouchSessionStatus {
  PENDING = "PENDING",
  SUBMITTED = "SUBMITTED",
}

export interface IVouchSession {
  voucherId: string;
  orderId: string;
  guildId: string;
  customerId: string;
  productType: ProductType;
  orderCode: string;
  robloxUsername: string;
  rating: number | null;
  review: string | null;
  status: VouchSessionStatus;
  submittedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export type VouchSessionDocument = Document & IVouchSession;

const vouchSessionSchema = new Schema<VouchSessionDocument>(
  {
    voucherId: { type: String, required: true, unique: true, index: true },
    orderId: { type: String, required: true, unique: true, index: true },
    guildId: { type: String, required: true, index: true },
    customerId: { type: String, required: true, index: true },
    productType: { type: String, required: true, index: true },
    orderCode: { type: String, required: true, index: true },
    robloxUsername: { type: String, required: true },
    rating: { type: Number, default: null },
    review: { type: String, default: null },
    status: {
      type: String,
      enum: Object.values(VouchSessionStatus),
      default: VouchSessionStatus.PENDING,
    },
    submittedAt: { type: Date, default: null },
  },
  {
    timestamps: true,
    collection: "vouch_sessions",
  },
);

export const VouchSessionModel: Model<VouchSessionDocument> = model<VouchSessionDocument>(
  "VouchSession",
  vouchSessionSchema,
);
