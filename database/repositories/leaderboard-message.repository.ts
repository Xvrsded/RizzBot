import {
  LeaderboardMessageModel,
  type ILeaderboardMessage,
  type LeaderboardMessageDocument,
  type LeaderboardMessageUpdate,
} from "../models/leaderboard-message.model";

export const leaderboardMessageRepository = {
  async findByGuildId(guildId: string): Promise<LeaderboardMessageDocument | null> {
    return LeaderboardMessageModel.findOne({ guildId }).exec();
  },

  async upsertByGuildId(
    guildId: string,
    data: Pick<ILeaderboardMessage, "channelId" | "messageId">,
  ): Promise<LeaderboardMessageDocument> {
    return LeaderboardMessageModel.findOneAndUpdate(
      { guildId },
      { $set: data, $setOnInsert: { guildId } },
      { new: true, upsert: true },
    ).exec();
  },

  async updateByGuildId(
    guildId: string,
    data: LeaderboardMessageUpdate,
  ): Promise<LeaderboardMessageDocument | null> {
    return LeaderboardMessageModel.findOneAndUpdate({ guildId }, { $set: data }, { new: true }).exec();
  },
};
