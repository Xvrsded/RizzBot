export enum ProductType {
  GIFT_IN_GAME = "GIFT_IN_GAME",
  ROBUX_USERNAME = "ROBUX_USERNAME",
  ROBUX_LOGIN = "ROBUX_LOGIN",
  ITEM_LIMITED = "ITEM_LIMITED",
  MIDDLEMAN = "MIDDLEMAN",
  COMMUNITY_PAYOUT = "COMMUNITY_PAYOUT",
}

/** Channel for Gift In Game product panel */
export const GIFT_IN_GAME_CHANNEL_ID = "1447840535737008250";

/** Robux via Username panel channel */
export const ROBUX_USERNAME_CHANNEL_ID = "1463859661534138534";

/** Robux via Login panel channel */
export const ROBUX_LOGIN_CHANNEL_ID = "1475401357799329792";

/** Item Limited product panel channel */
export const ITEM_LIMITED_CHANNEL_ID = "1447840773612638219";

/** Middleman / Rekber product panel channel */
export const MIDDLEMAN_CHANNEL_ID = "1447837071153692762";

/** Robux Community Payout product panel channel */
export const COMMUNITY_PAYOUT_CHANNEL_ID = "1537338453509808189";

/** Main dashboard / control center channel */
export const DASHBOARD_CHANNEL_ID = "1536576598336077834";

/** Item Limited — trade bait info channel */
export const ITEM_LIMITED_TRADE_INFO_CHANNEL_ID = "1536947391658197103";

/** Persistent panel key for Item Tumbal info (not an order product) */
export const ITEM_TUMBAL_PANEL_KEY = "ITEM_TUMBAL" as const;

/** Gift In Game ticket — Admin role */
export const GIFT_ADMIN_ROLE_ID = "1447837070281277466";

/** Gift In Game ticket — Owner role */
export const GIFT_OWNER_ROLE_ID = "1447837070281277467";

/** Dashboard management — Owner role */
export const DASHBOARD_OWNER_ROLE_ID = GIFT_OWNER_ROLE_ID;

/** Dashboard management — Admin role */
export const DASHBOARD_ADMIN_ROLE_ID = GIFT_ADMIN_ROLE_ID;

/** Gift In Game completed transaction log channel */
export const GIFT_TRANSACTION_LOG_CHANNEL_ID = "1536978483463594034";

/** RizzStore customer leaderboard channel */
export const LEADERBOARD_CHANNEL_ID = "1486996102921064530";

/** Auto-close ticket delay after Mark Delivered + Vouch request (ms) */
export const GIFT_TICKET_AUTO_CLOSE_MS = 60_000;

/** Public customer vouch/review channel */
export const VOUCH_CHANNEL_ID = "1536978578460250112";

export const GIFT_SESSION_EXPIRY_MS = 15 * 60 * 1000;

export interface GigPricingConfig {
  rateIdr: number;
  roundingIdr: number;
}

export const ROBUX_RATE_IDR = 90;
export const PRICE_ROUNDING_IDR = 500;
export const DEFAULT_GIG_PRICING: GigPricingConfig = {
  rateIdr: ROBUX_RATE_IDR,
  roundingIdr: PRICE_ROUNDING_IDR,
};
