const DISCORD_CHANNEL_NAME_MAX = 100;

/**
 * Sanitizes a string for use as a Discord channel name segment.
 * Rules: lowercase, spaces → hyphens, strip invalid chars, no emoji/@/#/.
 */
export function sanitizeChannelName(value: string): string {
  const sanitized = value
    .toLowerCase()
    .trim()
    .replace(/\s+/g, "-")
    .replace(/@|#|\//g, "")
    .replace(/[^\w-]/g, "")
    .replace(/-+/g, "-")
    .replace(/^-+|-+$/g, "");

  return sanitized || "user";
}

export function buildGiftInGameTicketChannelName(robuxAmount: number, robloxUsername: string): string {
  const prefix = `gig-${robuxAmount}-`;
  const maxUsernameLength = DISCORD_CHANNEL_NAME_MAX - prefix.length;
  const usernamePart = sanitizeChannelName(robloxUsername).slice(0, Math.max(maxUsernameLength, 1));

  return `${prefix}${usernamePart}`.slice(0, DISCORD_CHANNEL_NAME_MAX);
}

export function buildGiftInGameTicketChannelNameFallback(
  robuxAmount: number,
  robloxUsername: string,
  orderCode: string,
): string {
  const suffix = orderCode.toLowerCase().replace(/[^a-z0-9]/g, "");
  const base = buildGiftInGameTicketChannelName(robuxAmount, robloxUsername);
  const fallback = `${base}-${suffix}`;

  return fallback.slice(0, DISCORD_CHANNEL_NAME_MAX);
}

export function buildRobuxUsernameTicketChannelName(robuxAmount: number, robloxUsername: string): string {
  const prefix = `visend-${robuxAmount}-`;
  const maxUsernameLength = DISCORD_CHANNEL_NAME_MAX - prefix.length;
  const usernamePart = sanitizeChannelName(robloxUsername).slice(0, Math.max(maxUsernameLength, 1));

  return `${prefix}${usernamePart}`.slice(0, DISCORD_CHANNEL_NAME_MAX);
}

export function buildRobuxUsernameTicketChannelNameFallback(
  robuxAmount: number,
  robloxUsername: string,
  orderCode: string,
): string {
  const suffix = orderCode.toLowerCase().replace(/[^a-z0-9]/g, "");
  const base = buildRobuxUsernameTicketChannelName(robuxAmount, robloxUsername);
  const fallback = `${base}-${suffix}`;

  return fallback.slice(0, DISCORD_CHANNEL_NAME_MAX);
}

export function buildLoginTicketChannelName(robuxAmount: number, robloxUsername: string): string {
  const prefix = `login-${robuxAmount}-`;
  const maxUsernameLength = DISCORD_CHANNEL_NAME_MAX - prefix.length;
  const usernamePart = sanitizeChannelName(robloxUsername).slice(0, Math.max(maxUsernameLength, 1));

  return `${prefix}${usernamePart}`.slice(0, DISCORD_CHANNEL_NAME_MAX);
}

export function buildLoginTicketChannelNameFallback(
  robuxAmount: number,
  robloxUsername: string,
  orderCode: string,
): string {
  const suffix = orderCode.toLowerCase().replace(/[^a-z0-9]/g, "");
  const base = buildLoginTicketChannelName(robuxAmount, robloxUsername);
  const fallback = `${base}-${suffix}`;

  return fallback.slice(0, DISCORD_CHANNEL_NAME_MAX);
}

export function buildLimitedTicketChannelName(robloxUsername: string): string {
  const prefix = "limited-";
  const maxUsernameLength = DISCORD_CHANNEL_NAME_MAX - prefix.length;
  const usernamePart = sanitizeChannelName(robloxUsername).slice(0, Math.max(maxUsernameLength, 1));

  return `${prefix}${usernamePart}`.slice(0, DISCORD_CHANNEL_NAME_MAX);
}

export function buildLimitedTicketChannelNameFallback(robloxUsername: string, orderCode: string): string {
  const suffix = orderCode.toLowerCase().replace(/[^a-z0-9]/g, "");
  const base = buildLimitedTicketChannelName(robloxUsername);
  const fallback = `${base}-${suffix}`;

  return fallback.slice(0, DISCORD_CHANNEL_NAME_MAX);
}

export function buildMiddlemanTicketChannelName(
  transactionAmountIdr: number,
  party1Username: string,
): string {
  const prefix = `mm-${transactionAmountIdr}-`;
  const maxUsernameLength = DISCORD_CHANNEL_NAME_MAX - prefix.length;
  const usernamePart = sanitizeChannelName(party1Username).slice(0, Math.max(maxUsernameLength, 1));

  return `${prefix}${usernamePart}`.slice(0, DISCORD_CHANNEL_NAME_MAX);
}

export function buildMiddlemanTicketChannelNameFallback(
  transactionAmountIdr: number,
  party1Username: string,
  orderCode: string,
): string {
  const suffix = orderCode.toLowerCase().replace(/[^a-z0-9]/g, "");
  const base = buildMiddlemanTicketChannelName(transactionAmountIdr, party1Username);
  const fallback = `${base}-${suffix}`;

  return fallback.slice(0, DISCORD_CHANNEL_NAME_MAX);
}

export function buildCommunityPayoutTicketChannelName(
  robuxAmount: number,
  robloxUsername: string,
): string {
  const prefix = `payout-${robuxAmount}-`;
  const maxUsernameLength = DISCORD_CHANNEL_NAME_MAX - prefix.length;
  const usernamePart = sanitizeChannelName(robloxUsername).slice(0, Math.max(maxUsernameLength, 1));

  return `${prefix}${usernamePart}`.slice(0, DISCORD_CHANNEL_NAME_MAX);
}

export function buildCommunityPayoutTicketChannelNameFallback(
  robuxAmount: number,
  robloxUsername: string,
  orderCode: string,
): string {
  const suffix = orderCode.toLowerCase().replace(/[^a-z0-9]/g, "");
  const base = buildCommunityPayoutTicketChannelName(robuxAmount, robloxUsername);
  const fallback = `${base}-${suffix}`;

  return fallback.slice(0, DISCORD_CHANNEL_NAME_MAX);
}
