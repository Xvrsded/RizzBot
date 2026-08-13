import { Schema, model, type Document, type Model } from "mongoose";

export interface ICommunityMembership {
  discordUserId: string;
  guildId: string;
  robloxUserId: number | null;
  robloxUsername: string | null;
  community1Member: boolean;
  community2Member: boolean;
  community3Member: boolean;
  firstVerifiedAt: Date | null;
  eligibleAt: Date | null;
  eligible: boolean;
  eligibleProcessed: boolean;
  lastCheckedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export type CommunityMembershipDocument = Document & ICommunityMembership;

const communityMembershipSchema = new Schema<CommunityMembershipDocument>(
  {
    discordUserId: { type: String, required: true, index: true },
    guildId: { type: String, required: true, index: true },
    robloxUserId: { type: Number, default: null },
    robloxUsername: { type: String, default: null },
    community1Member: { type: Boolean, default: false },
    community2Member: { type: Boolean, default: false },
    community3Member: { type: Boolean, default: false },
    firstVerifiedAt: { type: Date, default: null },
    eligibleAt: { type: Date, default: null },
    eligible: { type: Boolean, default: false },
    eligibleProcessed: { type: Boolean, default: false },
    lastCheckedAt: { type: Date, default: null },
  },
  {
    timestamps: true,
    collection: "community_memberships",
  },
);

communityMembershipSchema.index({ discordUserId: 1, guildId: 1 }, { unique: true });
communityMembershipSchema.index({ eligible: 1, eligibleProcessed: 1, firstVerifiedAt: 1 });

export const CommunityMembershipModel: Model<CommunityMembershipDocument> =
  model<CommunityMembershipDocument>("CommunityMembership", communityMembershipSchema);
