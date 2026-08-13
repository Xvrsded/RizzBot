import { Schema, model, type Document, type Model } from "mongoose";

export interface IDashboardMessage {
  guildId: string;
  channelId: string;
  messageId: string;
  createdAt: Date;
  updatedAt: Date;
}

export type DashboardMessageDocument = Document & IDashboardMessage;

export type DashboardMessageUpdate = Partial<
  Pick<IDashboardMessage, "channelId" | "messageId">
>;

const dashboardMessageSchema = new Schema<DashboardMessageDocument>(
  {
    guildId: { type: String, required: true, unique: true, index: true },
    channelId: { type: String, required: true },
    messageId: { type: String, required: true },
  },
  {
    timestamps: true,
    collection: "dashboard_messages",
  },
);

export const DashboardMessageModel: Model<DashboardMessageDocument> =
  model<DashboardMessageDocument>("DashboardMessage", dashboardMessageSchema);
