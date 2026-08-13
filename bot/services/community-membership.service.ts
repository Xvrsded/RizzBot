import type { Client, GuildMember } from "discord.js";
import {
  COMMUNITY_PAYOUT_ELIGIBILITY_DAYS,
  COMMUNITY_PAYOUT_ELIGIBILITY_MS,
  COMMUNITY_PAYOUT_ELIGIBLE_CHANNEL_ID,
  COMMUNITY_PAYOUT_ELIGIBLE_ROLE_ID,
  COMMUNITY_PAYOUT_GROUP_IDS,
} from "../../shared/community-payout";
import { robloxCommunityMembershipRepository } from "../../database/repositories/roblox-community-membership.repository";
import type { RobloxCommunityMembershipDocument } from "../../database/models/roblox-community-membership.model";
import {
  buildCommunityEligibleAnnouncementEmbed,
  buildCommunityEligibleDmEmbed,
  buildCommunityEligibleDmRow,
} from "../utils/embeds/community-payout.embed";
import { logger } from "../../shared/logger";

const BACKGROUND_CHECK_INTERVAL_MS = 60 * 60 * 1000; // 1 hour

export type CommunityEligibilityStatus = "not_eligible" | "waiting" | "eligible";

export interface IndividualCommunityStatus {
  communityId: string;
  isConfirmed: boolean;
  daysElapsed: number;
  daysRequired: number;
  eligibleAt: Date | null;
  status: CommunityEligibilityStatus;
}

export interface CommunityEligibilityResult {
  status: CommunityEligibilityStatus;
  community1: IndividualCommunityStatus;
  community2: IndividualCommunityStatus;
  community3: IndividualCommunityStatus;
  robloxUsername: string | null;
}

function calculateDaysElapsed(firstVerifiedAt: Date, now = new Date()): number {
  const elapsedMs = Math.max(0, now.getTime() - firstVerifiedAt.getTime());
  return Math.floor(elapsedMs / (24 * 60 * 60 * 1000));
}

let backgroundCheckerStarted = false;

export const communityMembershipService = {
  async getEligibilityStatus(
    discordUserId: string,
    guildId: string,
    now = new Date(),
  ): Promise<CommunityEligibilityResult> {
    const records = await robloxCommunityMembershipRepository.findAllByDiscordUser(discordUserId, guildId);
    
    // Map records by communityId
    const recordMap = new Map<string, RobloxCommunityMembershipDocument>();
    for (const record of records) {
      recordMap.set(record.communityId, record);
    }

    const robloxUsername = records.length > 0 ? records[0].robloxUsername : null;

    let allEligible = true;
    let anyMissing = false;

    const buildStatus = (communityId: string): IndividualCommunityStatus => {
      const record = recordMap.get(communityId);
      if (!record) {
        allEligible = false;
        anyMissing = true;
        return {
          communityId,
          isConfirmed: false,
          daysElapsed: 0,
          daysRequired: COMMUNITY_PAYOUT_ELIGIBILITY_DAYS,
          eligibleAt: null,
          status: "not_eligible",
        };
      }

      const daysElapsed = calculateDaysElapsed(record.confirmedAt, now);
      const isEligible = record.status === "ELIGIBLE" || daysElapsed >= COMMUNITY_PAYOUT_ELIGIBILITY_DAYS;
      
      if (!isEligible) {
        allEligible = false;
      }

      return {
        communityId,
        isConfirmed: true,
        daysElapsed,
        daysRequired: COMMUNITY_PAYOUT_ELIGIBILITY_DAYS,
        eligibleAt: record.eligibleAt,
        status: isEligible ? "eligible" : "waiting",
      };
    };

    const status1 = buildStatus(COMMUNITY_PAYOUT_GROUP_IDS[0].toString());
    const status2 = buildStatus(COMMUNITY_PAYOUT_GROUP_IDS[1].toString());
    const status3 = buildStatus(COMMUNITY_PAYOUT_GROUP_IDS[2].toString());

    let finalStatus: CommunityEligibilityStatus = "not_eligible";
    if (allEligible) {
      finalStatus = "eligible";
    } else if (!anyMissing) {
      finalStatus = "waiting";
    }

    return {
      status: finalStatus,
      community1: status1,
      community2: status2,
      community3: status3,
      robloxUsername,
    };
  },

  async confirmCommunityMembership(
    discordUserId: string,
    guildId: string,
    robloxUsername: string,
    communityId: string,
    communityName: string,
  ): Promise<RobloxCommunityMembershipDocument> {
    const existing = await robloxCommunityMembershipRepository.findByDiscordUserAndCommunity(discordUserId, guildId, communityId);
    
    if (existing) {
      // If the user already confirmed this community, we only update the username if it changed.
      // We don't reset confirmedAt!
      if (existing.robloxUsername !== robloxUsername) {
        existing.robloxUsername = robloxUsername;
        await existing.save();
      }
      return existing;
    }

    const now = new Date();
    const eligibleAt = new Date(now.getTime() + COMMUNITY_PAYOUT_ELIGIBILITY_MS);

    return robloxCommunityMembershipRepository.upsert(discordUserId, guildId, communityId, {
      discordUserId,
      guildId,
      robloxUsername,
      communityId,
      communityName,
      confirmedAt: now,
      eligibleAt,
      status: "CONFIRMED",
      notified: false,
    });
  },

  async processNewlyEligibleUser(
    client: Client<true>,
    guildId: string,
    discordUserId: string,
    robloxUsername: string,
  ): Promise<void> {
    const guild = client.guilds.cache.get(guildId) ?? (await client.guilds.fetch(guildId).catch(() => null));
    if (!guild) return;

    let member: GuildMember | null = null;
    try {
      member = await guild.members.fetch(discordUserId);
    } catch {
      logger.warn(`[COMMUNITY PAYOUT] Could not fetch member ${discordUserId} for eligible role`);
    }

    if (member && !member.roles.cache.has(COMMUNITY_PAYOUT_ELIGIBLE_ROLE_ID)) {
      await member.roles.add(COMMUNITY_PAYOUT_ELIGIBLE_ROLE_ID).catch((error) => {
        logger.error(`[COMMUNITY PAYOUT] Failed to assign eligible role to ${discordUserId}`, error);
      });
    }

    const announcementChannel = await client.channels
      .fetch(COMMUNITY_PAYOUT_ELIGIBLE_CHANNEL_ID)
      .catch(() => null);

    if (announcementChannel?.isTextBased() && !announcementChannel.isDMBased()) {
      await announcementChannel
        .send({
          embeds: [buildCommunityEligibleAnnouncementEmbed(discordUserId, robloxUsername)],
        })
        .catch((error) => {
          logger.error("[COMMUNITY PAYOUT] Failed to send eligible announcement", error);
        });
    }

    if (member) {
      await member
        .send({
          embeds: [buildCommunityEligibleDmEmbed()],
          components: [buildCommunityEligibleDmRow()],
        })
        .catch((error) => {
          logger.warn(`[COMMUNITY PAYOUT] Could not DM eligible user ${discordUserId}`);
          logger.error("[COMMUNITY PAYOUT] Eligible DM error detail", error);
        });
    }

    logger.info(`[COMMUNITY PAYOUT] User ${discordUserId} marked eligible and processed`);
  },

  async checkAndProcessEligibility(
    client: Client<true>,
    guildId: string,
    discordUserId: string
  ): Promise<CommunityEligibilityResult> {
    const now = new Date();
    const result = await this.getEligibilityStatus(discordUserId, guildId, now);

    if (result.status === "eligible") {
      const records = await robloxCommunityMembershipRepository.findAllByDiscordUser(discordUserId, guildId);
      
      let needsProcessing = false;

      for (const record of records) {
        if (record.status !== "ELIGIBLE") {
          record.status = "ELIGIBLE";
          await record.save();
        }
        if (!record.notified) {
          needsProcessing = true;
          record.notified = true;
          await record.save();
        }
      }

      if (needsProcessing && result.robloxUsername) {
        await this.processNewlyEligibleUser(client, guildId, discordUserId, result.robloxUsername);
      }
    }

    return result;
  },

  async runBackgroundCheck(client: Client<true>): Promise<void> {
    const pendingRecords = await robloxCommunityMembershipRepository.findPendingEligibleMemberships();
    
    const usersToCheck = new Set<string>(); // guildId:discordUserId
    
    for (const record of pendingRecords) {
      usersToCheck.add(`${record.guildId}:${record.discordUserId}`);
    }

    for (const key of usersToCheck) {
      const [guildId, discordUserId] = key.split(":");
      try {
        await this.checkAndProcessEligibility(client, guildId, discordUserId);
      } catch (error) {
        logger.error(`[COMMUNITY PAYOUT] Background check failed for ${discordUserId}`, error);
      }
    }
  },

  startBackgroundChecker(client: Client<true>): void {
    if (backgroundCheckerStarted) {
      return;
    }

    backgroundCheckerStarted = true;

    void this.runBackgroundCheck(client).catch((error) => {
      logger.error("[COMMUNITY PAYOUT] Initial background check failed", error);
    });

    setInterval(() => {
      void this.runBackgroundCheck(client).catch((error) => {
        logger.error("[COMMUNITY PAYOUT] Scheduled background check failed", error);
      });
    }, BACKGROUND_CHECK_INTERVAL_MS);

    logger.info("[COMMUNITY PAYOUT] Background eligibility checker started (1 hour interval)");
  },

  memberHasEligibleRole(member: GuildMember): boolean {
    return member.roles.cache.has(COMMUNITY_PAYOUT_ELIGIBLE_ROLE_ID);
  },
};
