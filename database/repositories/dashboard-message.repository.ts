import {
  DashboardMessageModel,
  type DashboardMessageDocument,
  type DashboardMessageUpdate,
  type IDashboardMessage,
} from "../models/dashboard-message.model";

export const dashboardMessageRepository = {
  async findByGuildId(guildId: string): Promise<DashboardMessageDocument | null> {
    return DashboardMessageModel.findOne({ guildId }).exec();
  },

  async findAll(): Promise<DashboardMessageDocument[]> {
    return DashboardMessageModel.find().exec();
  },

  async create(
    data: Pick<IDashboardMessage, "guildId" | "channelId" | "messageId">,
  ): Promise<DashboardMessageDocument> {
    return DashboardMessageModel.create(data);
  },

  async updateByGuildId(
    guildId: string,
    data: DashboardMessageUpdate,
  ): Promise<DashboardMessageDocument | null> {
    return DashboardMessageModel.findOneAndUpdate({ guildId }, { $set: data }, { new: true }).exec();
  },

  async upsertByGuildId(
    guildId: string,
    data: Pick<IDashboardMessage, "channelId" | "messageId">,
  ): Promise<DashboardMessageDocument> {
    return DashboardMessageModel.findOneAndUpdate(
      { guildId },
      { $set: data, $setOnInsert: { guildId } },
      { new: true, upsert: true },
    ).exec();
  },

  async deleteByGuildId(guildId: string): Promise<boolean> {
    const result = await DashboardMessageModel.deleteOne({ guildId }).exec();
    return result.deletedCount > 0;
  },
};
