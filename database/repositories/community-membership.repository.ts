import {
  CommunityMembershipModel,
  type CommunityMembershipDocument,
  type ICommunityMembership,
} from "../models/community-membership.model";

export const communityMembershipRepository = {
  async findByDiscordUser(
    discordUserId: string,
    guildId: string,
  ): Promise<CommunityMembershipDocument | null> {
    return CommunityMembershipModel.findOne({ discordUserId, guildId }).exec();
  },

  async upsertByDiscordUser(
    discordUserId: string,
    guildId: string,
    data: Partial<
      Pick<
        ICommunityMembership,
        | "robloxUserId"
        | "robloxUsername"
        | "community1Member"
        | "community2Member"
        | "community3Member"
        | "firstVerifiedAt"
        | "eligibleAt"
        | "eligible"
        | "eligibleProcessed"
        | "lastCheckedAt"
      >
    >,
  ): Promise<CommunityMembershipDocument> {
    return CommunityMembershipModel.findOneAndUpdate(
      { discordUserId, guildId },
      { $set: data },
      { upsert: true, new: true, setDefaultsOnInsert: true },
    ).exec();
  },

  async findPendingEligibilityChecks(): Promise<CommunityMembershipDocument[]> {
    return CommunityMembershipModel.find({
      firstVerifiedAt: { $ne: null },
      eligibleProcessed: false,
    }).exec();
  },

  async findTrackingMemberships(): Promise<CommunityMembershipDocument[]> {
    return CommunityMembershipModel.find({
      firstVerifiedAt: { $ne: null },
      eligible: false,
    }).exec();
  },
};
