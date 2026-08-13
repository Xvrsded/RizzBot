import { Schema, model, type Document, type Model } from "mongoose";
import type { ProductType } from "../../shared/products";

export enum TicketStatus {
  OPEN = "OPEN",
  COMPLETED = "COMPLETED",
  CLOSED = "CLOSED",
}

export enum TicketPaymentStatus {
  PENDING_PAYMENT = "PENDING_PAYMENT",
  PARTIAL = "PARTIAL",
  PAID = "PAID",
}

export interface ITicket {
  ticketId: string;
  guildId: string;
  channelId: string;
  userId: string;
  sessionId: string;
  orderCode: string;
  productType: ProductType;
  status: TicketStatus;
  paymentStatus: TicketPaymentStatus;
  totalPaidIdr: number;
  isBulk: boolean;
  messageId: string | null;
  completedAt: Date | null;
  completedByUserId: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export type TicketDocument = Document & ITicket;

const ticketSchema = new Schema<TicketDocument>(
  {
    ticketId: { type: String, required: true, unique: true, index: true },
    guildId: { type: String, required: true, index: true },
    channelId: { type: String, required: true, unique: true, index: true },
    userId: { type: String, required: true, index: true },
    sessionId: { type: String, required: true },
    orderCode: { type: String, required: true, index: true },
    productType: { type: String, required: true, index: true },
    status: {
      type: String,
      enum: Object.values(TicketStatus),
      default: TicketStatus.OPEN,
    },
    paymentStatus: {
      type: String,
      enum: Object.values(TicketPaymentStatus),
      default: TicketPaymentStatus.PENDING_PAYMENT,
    },
    totalPaidIdr: { type: Number, default: 0 },
    isBulk: { type: Boolean, default: false },
    messageId: { type: String, default: null },
    completedAt: { type: Date, default: null },
    completedByUserId: { type: String, default: null },
  },
  {
    timestamps: true,
    collection: "tickets",
  },
);

ticketSchema.index({ guildId: 1, userId: 1, productType: 1, status: 1 });
ticketSchema.index({ guildId: 1, userId: 1, status: 1 });

export const TicketModel: Model<TicketDocument> = model<TicketDocument>("Ticket", ticketSchema);
