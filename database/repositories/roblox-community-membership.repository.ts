import {
  RobloxCommunityMembershipModel,
  type RobloxCommunityMembershipDocument,
} from "../models/roblox-community-membership.model";

export const robloxCommunityMembershipRepository = {
  async findByDiscordUserAndCommunity(
    discordUserId: string,
    guildId: string,
    communityId: string,
  ): Promise<RobloxCommunityMembershipDocument | null> {
    return RobloxCommunityMembershipModel.findOne({
      discordUserId,
      guildId,
      communityId,
    }).exec();
  },

  async findAllByDiscordUser(
    discordUserId: string,
    guildId: string,
  ): Promise<RobloxCommunityMembershipDocument[]> {
    return RobloxCommunityMembershipModel.find({
      discordUserId,
      guildId,
    }).exec();
  },

  async upsert(
    discordUserId: string,
    guildId: string,
    communityId: string,
    updateData: Partial<RobloxCommunityMembershipDocument>,
  ): Promise<RobloxCommunityMembershipDocument> {
    return RobloxCommunityMembershipModel.findOneAndUpdate(
      { discordUserId, guildId, communityId },
      { $set: updateData },
      { new: true, upsert: true },
    ).exec();
  },

  async findPendingEligibleMemberships(): Promise<RobloxCommunityMembershipDocument[]> {
    return RobloxCommunityMembershipModel.find({
      status: "CONFIRMED",
    }).exec();
  },
};
