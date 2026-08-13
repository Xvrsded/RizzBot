import { Schema, model, type Document, type Model } from "mongoose";

export interface ILeaderboardMessage {
  guildId: string;
  channelId: string;
  messageId: string;
  createdAt: Date;
  updatedAt: Date;
}

export type LeaderboardMessageDocument = Document & ILeaderboardMessage;

export type LeaderboardMessageUpdate = Partial<Pick<ILeaderboardMessage, "channelId" | "messageId">>;

const leaderboardMessageSchema = new Schema<LeaderboardMessageDocument>(
  {
    guildId: { type: String, required: true, unique: true, index: true },
    channelId: { type: String, required: true },
    messageId: { type: String, required: true },
  },
  {
    timestamps: true,
    collection: "leaderboard_messages",
  },
);

export const LeaderboardMessageModel: Model<LeaderboardMessageDocument> =
  model<LeaderboardMessageDocument>("LeaderboardMessage", leaderboardMessageSchema);
