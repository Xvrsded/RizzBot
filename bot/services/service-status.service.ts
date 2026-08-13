import {
  DEFAULT_SERVICE_STATUS,
  SERVICE_STATUS_KEYS,
  type ServiceStatusKey,
  type ServiceStatusMap,
} from "../../shared/service-status";
import type { GuildConfigDocument } from "../../database/models/guild-config.model";
import { guildConfigRepository } from "../../database/repositories/guild-config.repository";
import { guildConfigService } from "./guild-config.service";
import { logger } from "../../shared/logger";

function normalizeServiceStatus(config: GuildConfigDocument | null): ServiceStatusMap {
  if (!config?.serviceStatus) {
    return { ...DEFAULT_SERVICE_STATUS };
  }

  return {
    robuxLogin: config.serviceStatus.robuxLogin ?? true,
    robuxSend: config.serviceStatus.robuxSend ?? true,
    giftInGame: config.serviceStatus.giftInGame ?? true,
    mmReber: config.serviceStatus.mmReber ?? true,
    limitedItem: config.serviceStatus.limitedItem ?? true,
    communityPayout: config.serviceStatus.communityPayout ?? true,
  };
}

export const serviceStatusService = {
  async getAllStatuses(guildId: string): Promise<ServiceStatusMap | null> {
    try {
      const config = await guildConfigService.getOrCreateGuildConfig(guildId);
      return normalizeServiceStatus(config);
    } catch (error) {
      logger.error(`Failed to load service statuses for guild ${guildId}`, error);
      return null;
    }
  },

  async isEnabled(guildId: string, key: ServiceStatusKey): Promise<boolean | null> {
    const statuses = await this.getAllStatuses(guildId);

    if (!statuses) {
      return null;
    }

    return statuses[key];
  },

  async setStatus(
    guildId: string,
    key: ServiceStatusKey,
    enabled: boolean,
  ): Promise<ServiceStatusMap | null> {
    try {
      const updated = await guildConfigRepository.updateByGuildId(guildId, {
        serviceStatus: {
          ...(await this.getAllStatuses(guildId)) ?? DEFAULT_SERVICE_STATUS,
          [key]: enabled,
        },
        dashboardLastUpdatedAt: new Date(),
      });

      return updated ? normalizeServiceStatus(updated) : null;
    } catch (error) {
      logger.error(`Failed to set service status ${key} for guild ${guildId}`, error);
      return null;
    }
  },

  async toggleStatus(guildId: string, key: ServiceStatusKey): Promise<ServiceStatusMap | null> {
    try {
      await guildConfigService.getOrCreateGuildConfig(guildId);
      const updated = await guildConfigRepository.toggleServiceStatus(guildId, key);
      return updated ? normalizeServiceStatus(updated) : null;
    } catch (error) {
      logger.error(`Failed to toggle service status ${key} for guild ${guildId}`, error);
      return null;
    }
  },

  countActiveCategories(statuses: ServiceStatusMap): number {
    return SERVICE_STATUS_KEYS.filter((key) => statuses[key]).length;
  },
};
