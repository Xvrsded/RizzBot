import { Schema, model, type Document, type Model } from "mongoose";

export type RobloxCommunityMembershipStatus = "CONFIRMED" | "ELIGIBLE";

export interface IRobloxCommunityMembership {
  discordUserId: string;
  guildId: string;
  robloxUsername: string;
  communityId: string;
  communityName: string;
  confirmedAt: Date;
  eligibleAt: Date;
  status: RobloxCommunityMembershipStatus;
  notified: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export type RobloxCommunityMembershipDocument = Document & IRobloxCommunityMembership;

const robloxCommunityMembershipSchema = new Schema<RobloxCommunityMembershipDocument>(
  {
    discordUserId: { type: String, required: true, index: true },
    guildId: { type: String, required: true, index: true },
    robloxUsername: { type: String, required: true },
    communityId: { type: String, required: true },
    communityName: { type: String, required: true },
    confirmedAt: { type: Date, required: true },
    eligibleAt: { type: Date, required: true },
    status: { type: String, enum: ["CONFIRMED", "ELIGIBLE"], default: "CONFIRMED" },
    notified: { type: Boolean, default: false },
  },
  {
    timestamps: true,
    collection: "roblox_community_memberships",
  },
);

robloxCommunityMembershipSchema.index({ discordUserId: 1, guildId: 1, communityId: 1 }, { unique: true });
robloxCommunityMembershipSchema.index({ status: 1, eligibleAt: 1, notified: 1 });

export const RobloxCommunityMembershipModel: Model<RobloxCommunityMembershipDocument> =
  model<RobloxCommunityMembershipDocument>("RobloxCommunityMembership", robloxCommunityMembershipSchema);
