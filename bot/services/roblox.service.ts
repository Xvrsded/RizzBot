import { logger } from "../../shared/logger";

export interface RobloxUserLookupResult {
  userId: number;
  username: string;
  displayName: string;
  avatarUrl: string | null;
}

interface RobloxUsernameResponse {
  data: Array<{
    requestedUsername: string;
    id: number;
    name: string;
    displayName: string;
  }>;
}

interface RobloxAvatarResponse {
  data: Array<{
    targetId: number;
    imageUrl: string | null;
  }>;
}

const MAX_RETRIES = 3;
const BASE_DELAY_MS = 1000;
const RETRYABLE_STATUS = new Set([429, 503]);

export class RobloxUserNotFoundError extends Error {
  constructor(public readonly username: string) {
    super(`Roblox user "${username}" not found`);
    this.name = "RobloxUserNotFoundError";
  }
}

export class RobloxApiError extends Error {
  constructor(
    public readonly status: number,
    message: string,
  ) {
    super(message);
    this.name = "RobloxApiError";
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function getRetryDelayMs(response: Response, attempt: number): number {
  const retryAfter = response.headers.get("retry-after");

  if (retryAfter) {
    const seconds = Number.parseInt(retryAfter, 10);

    if (!Number.isNaN(seconds)) {
      return seconds * 1000;
    }
  }

  return BASE_DELAY_MS * 2 ** attempt;
}

async function fetchWithRetry(url: string | URL, init?: RequestInit): Promise<Response> {
  let lastResponse: Response | null = null;

  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    const response = await fetch(url, init);

    if (!RETRYABLE_STATUS.has(response.status)) {
      return response;
    }

    lastResponse = response;

    if (attempt === MAX_RETRIES) {
      break;
    }

    const delay = getRetryDelayMs(response, attempt);
    logger.warn(
      `Roblox API returned ${response.status}, retrying in ${delay}ms (${attempt + 1}/${MAX_RETRIES})`,
    );
    await sleep(delay);
  }

  throw new RobloxApiError(
    lastResponse?.status ?? 429,
    `Roblox API returned status ${lastResponse?.status ?? 429}`,
  );
}

async function fetchAvatarUrl(userId: number): Promise<string | null> {
  try {
    const url = new URL("https://thumbnails.roblox.com/v1/users/avatar-headshot");
    url.searchParams.set("userIds", String(userId));
    url.searchParams.set("size", "150x150");
    url.searchParams.set("format", "Png");
    url.searchParams.set("isCircular", "false");

    const response = await fetchWithRetry(url);

    if (!response.ok) {
      return null;
    }

    const body = (await response.json()) as RobloxAvatarResponse;
    return body.data[0]?.imageUrl ?? null;
  } catch (error) {
    if (error instanceof RobloxApiError) {
      logger.warn(`Roblox avatar lookup rate limited for user ${userId}`);
      return null;
    }

    logger.warn(`Failed to fetch Roblox avatar for user ${userId}`);
    return null;
  }
}

export async function lookupRobloxUser(username: string): Promise<RobloxUserLookupResult> {
  const trimmed = username.trim();

  const response = await fetchWithRetry("https://users.roblox.com/v1/usernames/users", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      usernames: [trimmed],
      excludeBannedUsers: true,
    }),
  });

  if (!response.ok) {
    throw new RobloxApiError(response.status, `Roblox API returned status ${response.status}`);
  }

  const body = (await response.json()) as RobloxUsernameResponse;
  const user = body.data[0];

  if (!user) {
    throw new RobloxUserNotFoundError(trimmed);
  }

  const avatarUrl = await fetchAvatarUrl(user.id);

  return {
    userId: user.id,
    username: user.name,
    displayName: user.displayName,
    avatarUrl,
  };
}

interface RobloxUserGroupRoleEntry {
  group: { id: number; name: string };
  role: { id: number; name: string };
}

interface RobloxUserGroupsResponse {
  data: RobloxUserGroupRoleEntry[];
  nextPageCursor: string | null;
}

/**
 * Fetches group IDs the user belongs to via Roblox public Groups API.
 * Note: Roblox does not expose join dates through this endpoint.
 */
export async function fetchUserGroupIds(userId: number): Promise<Set<number>> {
  const groupIds = new Set<number>();
  let cursor: string | undefined;

  while (true) {
    const url = new URL(`https://groups.roblox.com/v1/users/${userId}/groups/roles`);

    if (cursor) {
      url.searchParams.set("cursor", cursor);
    }

    const response = await fetchWithRetry(url);

    if (!response.ok) {
      throw new RobloxApiError(response.status, `Roblox Groups API returned status ${response.status}`);
    }

    const body = (await response.json()) as RobloxUserGroupsResponse;

    for (const entry of body.data) {
      groupIds.add(entry.group.id);
    }

    if (!body.nextPageCursor) {
      break;
    }

    cursor = body.nextPageCursor;
  }

  return groupIds;
}

export interface CommunityMembershipCheckResult {
  community1Member: boolean;
  community2Member: boolean;
  community3Member: boolean;
  allMember: boolean;
}

export async function checkCommunityGroupMembership(
  userId: number,
  groupIds: readonly number[],
): Promise<CommunityMembershipCheckResult> {
  const memberships = await fetchUserGroupIds(userId);

  const community1Member = memberships.has(groupIds[0]!);
  const community2Member = memberships.has(groupIds[1]!);
  const community3Member = memberships.has(groupIds[2]!);

  return {
    community1Member,
    community2Member,
    community3Member,
    allMember: community1Member && community2Member && community3Member,
  };
}
