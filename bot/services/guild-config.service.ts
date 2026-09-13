import { guildConfigRepository } from "../../database/repositories/guild-config.repository";
import type { GuildConfigDocument, GuildConfigUpdate } from "../../database/models/guild-config.model";
import { DEFAULT_GIG_PRICING, type GigPricingConfig } from "../../shared/products";
import {
  normalizeRobuxPackages,
  ROBUX_USERNAME_PACKAGES,
  type RobuxPackage,
} from "../../shared/robux-packages";

export const guildConfigService = {
  normalizeGigPricing(config: GuildConfigDocument | null): GigPricingConfig {
    return {
      rateIdr: config?.gigPricing?.rateIdr ?? DEFAULT_GIG_PRICING.rateIdr,
      roundingIdr: config?.gigPricing?.roundingIdr ?? DEFAULT_GIG_PRICING.roundingIdr,
    };
  },

  normalizeRobuxPackages(config: GuildConfigDocument | null): RobuxPackage[] {
    return normalizeRobuxPackages(config?.robuxPackages ?? ROBUX_USERNAME_PACKAGES);
  },

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

  async getGigPricing(guildId: string): Promise<GigPricingConfig> {
    const config = await this.getOrCreateGuildConfig(guildId);
    return this.normalizeGigPricing(config);
  },

  async updateGigPricing(guildId: string, pricing: GigPricingConfig): Promise<GigPricingConfig | null> {
    const updated = await guildConfigRepository.updateByGuildId(guildId, {
      gigPricing: pricing,
      dashboardLastUpdatedAt: new Date(),
    });

    return updated ? this.normalizeGigPricing(updated) : null;
  },

  async getRobuxPackages(guildId: string): Promise<RobuxPackage[]> {
    const config = await this.getOrCreateGuildConfig(guildId);
    return this.normalizeRobuxPackages(config);
  },

  async updateRobuxPackages(guildId: string, packages: RobuxPackage[]): Promise<RobuxPackage[] | null> {
    const updated = await guildConfigRepository.updateByGuildId(guildId, {
      robuxPackages: packages,
      dashboardLastUpdatedAt: new Date(),
    });

    return updated ? this.normalizeRobuxPackages(updated) : null;
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
