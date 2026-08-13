import { Schema, model, type Document, type Model } from "mongoose";
import type { ProductType } from "../../shared/products";

export enum TicketOrderItemStatus {
  PENDING_PAYMENT = "PENDING_PAYMENT",
  PAID = "PAID",
  COMPLETED = "COMPLETED",
  CANCELLED = "CANCELLED",
}

export interface ITicketOrderItem {
  itemId: string;
  ticketId: string;
  guildId: string;
  customerId: string;
  sessionId: string;
  orderCode: string;
  productType: ProductType;
  robloxUsername: string;
  itemName: string | null;
  gamepassName: string | null;
  gameName: string | null;
  robuxAmount: number | null;
  price: number | null;
  orderStatus: TicketOrderItemStatus;
  createdAt: Date;
  updatedAt: Date;
}

export type TicketOrderItemDocument = Document & ITicketOrderItem;

const ticketOrderItemSchema = new Schema<TicketOrderItemDocument>(
  {
    itemId: { type: String, required: true, unique: true, index: true },
    ticketId: { type: String, required: true, index: true },
    guildId: { type: String, required: true, index: true },
    customerId: { type: String, required: true, index: true },
    sessionId: { type: String, required: true, unique: true, index: true },
    orderCode: { type: String, required: true, index: true },
    productType: { type: String, required: true, index: true },
    robloxUsername: { type: String, required: true },
    itemName: { type: String, default: null },
    gamepassName: { type: String, default: null },
    gameName: { type: String, default: null },
    robuxAmount: { type: Number, default: null },
    price: { type: Number, default: null },
    orderStatus: {
      type: String,
      enum: Object.values(TicketOrderItemStatus),
      default: TicketOrderItemStatus.PENDING_PAYMENT,
    },
  },
  {
    timestamps: true,
    collection: "ticket_order_items",
  },
);

ticketOrderItemSchema.index({ ticketId: 1, createdAt: 1 });

export const TicketOrderItemModel: Model<TicketOrderItemDocument> = model<TicketOrderItemDocument>(
  "TicketOrderItem",
  ticketOrderItemSchema,
);
