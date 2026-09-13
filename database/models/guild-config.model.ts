import { Schema, model, type Document, type Model } from "mongoose";
import type { ServiceStatusMap } from "../../shared/service-status";
import { DEFAULT_SERVICE_STATUS } from "../../shared/service-status";
import type { RizzStoreConfig } from "../../shared/rizz-store";
import { DEFAULT_RIZZ_STORE_CONFIG } from "../../shared/rizz-store";
import { DEFAULT_GIG_PRICING, type GigPricingConfig } from "../../shared/products";
import { ROBUX_USERNAME_PACKAGES, type RobuxPackage } from "../../shared/robux-packages";

export interface GuildInventory {
  stockViaSend: number;
  stockGig: number;
}

export interface IGuildConfig {
  guildId: string;
  guildName: string;
  dashboardChannelId: string | null;
  dashboardMessageId: string | null;
  dashboardLastUpdatedAt: Date | null;
  gigPricing: GigPricingConfig;
  robuxPackages: RobuxPackage[];
  serviceStatus: ServiceStatusMap;
  inventory: GuildInventory;
  rizzStore: RizzStoreConfig;
  logChannelId: string | null;
  ticketCategoryId: string | null;
  welcomeChannelId: string | null;
  announcementChannelId: string | null;
  ownerRoleId: string | null;
  adminRoleId: string | null;
  staffRoleId: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export type GuildConfigDocument = Document & IGuildConfig;

export type GuildConfigUpdate = Partial<
  Omit<IGuildConfig, "guildId" | "createdAt" | "updatedAt">
>;

const guildConfigSchema = new Schema<GuildConfigDocument>(
  {
    guildId: { type: String, required: true, unique: true, index: true },
    guildName: { type: String, default: "" },
    dashboardChannelId: { type: String, default: null },
    dashboardMessageId: { type: String, default: null },
    dashboardLastUpdatedAt: { type: Date, default: null },
    gigPricing: {
      rateIdr: { type: Number, default: DEFAULT_GIG_PRICING.rateIdr },
      roundingIdr: { type: Number, default: DEFAULT_GIG_PRICING.roundingIdr },
    },
    robuxPackages: {
      type: [{
        robuxAmount: { type: Number, required: true },
        priceIdr: { type: Number, required: true },
      }],
      default: () => ROBUX_USERNAME_PACKAGES.map((pkg) => ({ ...pkg })),
    },
    serviceStatus: {
      robuxLogin: { type: Boolean, default: DEFAULT_SERVICE_STATUS.robuxLogin },
      robuxSend: { type: Boolean, default: DEFAULT_SERVICE_STATUS.robuxSend },
      giftInGame: { type: Boolean, default: DEFAULT_SERVICE_STATUS.giftInGame },
      mmReber: { type: Boolean, default: DEFAULT_SERVICE_STATUS.mmReber },
      limitedItem: { type: Boolean, default: DEFAULT_SERVICE_STATUS.limitedItem },
      communityPayout: { type: Boolean, default: DEFAULT_SERVICE_STATUS.communityPayout },
    },
    inventory: {
      stockViaSend: { type: Number, default: 0 },
      stockGig: { type: Number, default: 0 },
    },
    rizzStore: {
      categoryId: { type: String, default: null },
      groupPayoutEnabled: { type: Boolean, default: true },
      channels: {
        queue: { type: String, default: null },
        stockViaSend: { type: String, default: null },
        stockGig: { type: String, default: null },
        giftGamepass: { type: String, default: null },
        robuxUsername: { type: String, default: null },
        robuxLogin: { type: String, default: null },
        limitedItem: { type: String, default: null },
        groupPayout: { type: String, default: null },
        mmRekber: { type: String, default: null },
      },
    },
    logChannelId: { type: String, default: null },
    ticketCategoryId: { type: String, default: null },
    welcomeChannelId: { type: String, default: null },
    announcementChannelId: { type: String, default: null },
    ownerRoleId: { type: String, default: null },
    adminRoleId: { type: String, default: null },
    staffRoleId: { type: String, default: null },
  },
  {
    timestamps: true,
    collection: "guild_configs",
  },
);

export const GuildConfigModel: Model<GuildConfigDocument> =
  model<GuildConfigDocument>("GuildConfig", guildConfigSchema);
