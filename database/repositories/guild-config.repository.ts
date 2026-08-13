import {
  GuildConfigModel,
  type GuildConfigDocument,
  type GuildConfigUpdate,
  type IGuildConfig,
} from "../models/guild-config.model";
import type { ServiceStatusKey } from "../../shared/service-status";

export const guildConfigRepository = {
  async findByGuildId(guildId: string): Promise<GuildConfigDocument | null> {
    return GuildConfigModel.findOne({ guildId }).exec();
  },

  async create(data: Pick<IGuildConfig, "guildId"> & Partial<GuildConfigUpdate>): Promise<GuildConfigDocument> {
    return GuildConfigModel.create(data);
  },

  async updateByGuildId(
    guildId: string,
    data: GuildConfigUpdate,
  ): Promise<GuildConfigDocument | null> {
    return GuildConfigModel.findOneAndUpdate({ guildId }, { $set: data }, { new: true }).exec();
  },

  async upsertByGuildId(
    guildId: string,
    data: GuildConfigUpdate & Pick<IGuildConfig, "guildName">,
  ): Promise<GuildConfigDocument> {
    return GuildConfigModel.findOneAndUpdate(
      { guildId },
      { $set: data, $setOnInsert: { guildId } },
      { new: true, upsert: true },
    ).exec();
  },

  async toggleServiceStatus(
    guildId: string,
    key: ServiceStatusKey,
  ): Promise<GuildConfigDocument | null> {
    const field = `serviceStatus.${key}`;

    return GuildConfigModel.findOneAndUpdate(
      { guildId },
      [
        {
          $set: {
            [field]: {
              $cond: [{ $eq: [{ $ifNull: [`$${field}`, true] }, true] }, false, true],
            },
            dashboardLastUpdatedAt: new Date(),
          },
        },
      ],
      { new: true },
    ).exec();
  },
};
