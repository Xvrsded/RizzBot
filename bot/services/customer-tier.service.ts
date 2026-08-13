import type { Client, Guild, GuildMember } from "discord.js";
import { GiftOrderSessionModel, GiftOrderSessionStatus } from "../../database/models/gift-order-session.model";
import { RobuxOrderSessionModel, RobuxOrderSessionStatus } from "../../database/models/robux-order-session.model";
import { LoginOrderSessionModel, LoginOrderSessionStatus } from "../../database/models/login-order-session.model";
import { LimitedOrderSessionModel, LimitedOrderSessionStatus } from "../../database/models/limited-order-session.model";
import { CommunityPayoutOrderSessionModel, CommunityPayoutOrderSessionStatus } from "../../database/models/community-payout-order-session.model";
import { MiddlemanOrderSessionModel, MiddlemanOrderSessionStatus } from "../../database/models/middleman-order-session.model";
import { logger } from "../../shared/logger";

export interface CustomerTier {
  roleId: string;
  thresholdIdr: number;
  label: string;
}

export const CUSTOMER_TIERS: CustomerTier[] = [
  { label: "500K+", thresholdIdr: 500_000, roleId: "1447842122014392360" },
  { label: "1JT+", thresholdIdr: 1_000_000, roleId: "1447842107372081295" },
  { label: "5JT+", thresholdIdr: 5_000_000, roleId: "1447842093107249183" },
  { label: "10JT+", thresholdIdr: 10_000_000, roleId: "1537368224851566672" },
];

export interface CustomerTierSyncResult {
  totalSpentIdr: number;
  addedRoles: CustomerTier[];
  alreadyHasRoles: CustomerTier[];
  missingRoles: CustomerTier[];
}

export const customerTierService = {
  async calculateTotalSpendIdr(userId: string): Promise<number> {
    const pipelineBase = (status: string, priceField: string) => [
      { $match: { userId, status } },
      { $group: { _id: null, total: { $sum: `$${priceField}` } } },
    ];

    const [
      giftRes,
      robuxRes,
      loginRes,
      limitedRes,
      communityRes,
      middlemanRes,
    ] = await Promise.all([
      GiftOrderSessionModel.aggregate(pipelineBase(GiftOrderSessionStatus.COMPLETED, "finalPrice")),
      RobuxOrderSessionModel.aggregate(pipelineBase(RobuxOrderSessionStatus.COMPLETED, "finalPrice")),
      LoginOrderSessionModel.aggregate(pipelineBase(LoginOrderSessionStatus.COMPLETED, "finalPrice")),
      LimitedOrderSessionModel.aggregate(pipelineBase(LimitedOrderSessionStatus.COMPLETED, "price")),
      CommunityPayoutOrderSessionModel.aggregate(pipelineBase(CommunityPayoutOrderSessionStatus.COMPLETED, "finalPrice")),
      MiddlemanOrderSessionModel.aggregate(pipelineBase(MiddlemanOrderSessionStatus.COMPLETED, "finalPrice")),
    ]);

    const extractTotal = (res: any[]) => (res.length > 0 ? res[0].total || 0 : 0);

    const total =
      extractTotal(giftRes) +
      extractTotal(robuxRes) +
      extractTotal(loginRes) +
      extractTotal(limitedRes) +
      extractTotal(communityRes) +
      extractTotal(middlemanRes);

    return total;
  },

  async syncCustomerRoles(client: Client<true>, guildId: string, userId: string): Promise<CustomerTierSyncResult | null> {
    try {
      const guild = await client.guilds.fetch(guildId).catch(() => null);
      if (!guild) return null;

      const member = await guild.members.fetch(userId).catch(() => null);
      if (!member) return null;

      const totalSpentIdr = await this.calculateTotalSpendIdr(userId);

      const addedRoles: CustomerTier[] = [];
      const alreadyHasRoles: CustomerTier[] = [];
      const missingRoles: CustomerTier[] = [];

      for (const tier of CUSTOMER_TIERS) {
        if (totalSpentIdr >= tier.thresholdIdr) {
          if (member.roles.cache.has(tier.roleId)) {
            alreadyHasRoles.push(tier);
            logger.info(`[AUTO ROLE] User: ${member.user.tag} | User ID: ${userId} | Total Belanja: Rp${totalSpentIdr} | Role: ${tier.label} | Action: ALREADY_HAS_ROLE`);
          } else {
            try {
              await member.roles.add(tier.roleId);
              addedRoles.push(tier);
              logger.info(`[AUTO ROLE] User: ${member.user.tag} | User ID: ${userId} | Total Belanja: Rp${totalSpentIdr} | Milestone Reached: Rp${tier.thresholdIdr} | Role: ${tier.roleId} | Action: ADDED`);
            } catch (error) {
              logger.error(`[AUTO ROLE ERROR] Failed to sync customer tier | User ID: ${userId} | Reason: Missing Manage Roles permission or invalid role hierarchy`);
            }
          }
        } else {
          missingRoles.push(tier);
        }
      }

      return {
        totalSpentIdr,
        addedRoles,
        alreadyHasRoles,
        missingRoles,
      };
    } catch (error) {
      logger.error(`[AUTO ROLE ERROR] Error during sync for user ${userId}`, error);
      return null;
    }
  },
};
