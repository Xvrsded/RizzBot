import { Schema, model, type Document, type Model } from "mongoose";

export enum TicketPaymentRecordStatus {
  RECORDED = "RECORDED",
}

export interface ITicketPaymentRecord {
  paymentId: string;
  ticketId: string;
  guildId: string;
  customerId: string;
  amountIdr: number;
  discordMessageId: string;
  status: TicketPaymentRecordStatus;
  createdAt: Date;
  updatedAt: Date;
}

export type TicketPaymentRecordDocument = Document & ITicketPaymentRecord;

const ticketPaymentRecordSchema = new Schema<TicketPaymentRecordDocument>(
  {
    paymentId: { type: String, required: true, unique: true, index: true },
    ticketId: { type: String, required: true, index: true },
    guildId: { type: String, required: true, index: true },
    customerId: { type: String, required: true, index: true },
    amountIdr: { type: Number, required: true },
    discordMessageId: { type: String, required: true, unique: true, index: true },
    status: {
      type: String,
      enum: Object.values(TicketPaymentRecordStatus),
      default: TicketPaymentRecordStatus.RECORDED,
    },
  },
  {
    timestamps: true,
    collection: "ticket_payment_records",
  },
);

export const TicketPaymentRecordModel: Model<TicketPaymentRecordDocument> =
  model<TicketPaymentRecordDocument>("TicketPaymentRecord", ticketPaymentRecordSchema);
