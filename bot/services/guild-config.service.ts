import { guildConfigRepository } from "../../database/repositories/guild-config.repository";
import type { GuildConfigDocument, GuildConfigUpdate } from "../../database/models/guild-config.model";

export const guildConfigService = {
  async getGuildConfig(guildId: string): Promise<GuildConfigDocument | null> {
    return guildConfigRepository.findByGuildId(guildId);
  },

  async getOrCreateGuildConfig(
    guildId: string,
    guildName = "",
  ): Promise<GuildConfigDocument> {
    const existing = await guildConfigRepository.findByGuildId(guildId);

    if (existing) {
      if (guildName && existing.guildName !== guildName) {
        const updated = await guildConfigRepository.updateByGuildId(guildId, { guildName });
        return updated ?? existing;
      }

      return existing;
    }

    return guildConfigRepository.create({ guildId, guildName });
  },

  async updateGuildConfig(
    guildId: string,
    updates: GuildConfigUpdate,
  ): Promise<GuildConfigDocument | null> {
    return guildConfigRepository.updateByGuildId(guildId, updates);
  },

  async upsertGuildConfig(
    guildId: string,
    updates: GuildConfigUpdate & { guildName?: string },
  ): Promise<GuildConfigDocument> {
    return guildConfigRepository.upsertByGuildId(guildId, {
      guildName: updates.guildName ?? "",
      ...updates,
    });
  },
};
