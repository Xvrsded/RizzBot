/** Required Roblox community group IDs for Community Payout eligibility */
export const COMMUNITY_PAYOUT_GROUP_IDS = [
  1_072_978_546,
  723_116_842,
  691_709_477,
] as const;

export const COMMUNITY_PAYOUT_GROUP_LINKS = [
  "https://www.roblox.com/share/g/1072978546",
  "https://www.roblox.com/share/g/723116842",
  "https://www.roblox.com/share/g/691709477",
] as const;

/** Minimum days in all communities before eligible */
export const COMMUNITY_PAYOUT_ELIGIBILITY_DAYS = 14;

export const COMMUNITY_PAYOUT_ELIGIBILITY_MS =
  COMMUNITY_PAYOUT_ELIGIBILITY_DAYS * 24 * 60 * 60 * 1000;

/** Panel channel */
export const COMMUNITY_PAYOUT_PANEL_CHANNEL_ID = "1537338453509808189";

/** Eligible user announcement channel */
export const COMMUNITY_PAYOUT_ELIGIBLE_CHANNEL_ID = "1537338653725032489";

/** Role granted when user becomes eligible */
export const COMMUNITY_PAYOUT_ELIGIBLE_ROLE_ID = "1537339099948515388";
