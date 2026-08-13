import { randomUUID } from "node:crypto";
import { GIFT_SESSION_EXPIRY_MS } from "../../shared/products";
import { generateCommunityPayoutOrderCode } from "../utils/order-code";
import {
  getCommunityPayoutPackagePrice,
  isValidCommunityPayoutPackageAmount,
} from "../../shared/community-payout-packages";
import { communityPayoutOrderSessionRepository } from "../../database/repositories/community-payout-order-session.repository";
import {
  CommunityPayoutOrderSessionStatus,
  type CommunityPayoutOrderSessionDocument,
} from "../../database/models/community-payout-order-session.model";
import type { RobloxUserLookupResult } from "./roblox.service";

export interface CommunityPayoutOrderSessionPayload {
  guildId: string;
  userId: string;
  robuxAmount: number;
  robloxUser: RobloxUserLookupResult;
}

function buildExpiryDate(): Date {
  return new Date(Date.now() + GIFT_SESSION_EXPIRY_MS);
}

export function validateCommunityPayoutUsernameInput(robloxUsername: string): string | null {
  if (!robloxUsername.trim()) {
    return "Roblox Username wajib diisi.";
  }

  return null;
}

export const communityPayoutOrderSessionService = {
  async expireStaleSessions(): Promise<number> {
    return communityPayoutOrderSessionRepository.expirePendingSessions();
  },

  async getSession(sessionId: string): Promise<CommunityPayoutOrderSessionDocument | null> {
    const session = await communityPayoutOrderSessionRepository.findBySessionId(sessionId);

    if (!session) {
      return null;
    }

    if (
      session.status === CommunityPayoutOrderSessionStatus.PENDING &&
      session.expiresAt.getTime() < Date.now()
    ) {
      await communityPayoutOrderSessionRepository.updateBySessionId(sessionId, {
        status: CommunityPayoutOrderSessionStatus.EXPIRED,
      });
      session.status = CommunityPayoutOrderSessionStatus.EXPIRED;
    }

    return session;
  },

  assertSessionUsable(
    session: CommunityPayoutOrderSessionDocument,
    userId: string,
  ): "ok" | "expired" | "cancelled" | "confirmed" | "forbidden" {
    if (session.userId !== userId) {
      return "forbidden";
    }

    if (session.status === CommunityPayoutOrderSessionStatus.EXPIRED) {
      return "expired";
    }

    if (session.status === CommunityPayoutOrderSessionStatus.CANCELLED) {
      return "cancelled";
    }

    if (session.status === CommunityPayoutOrderSessionStatus.CONFIRMED) {
      return "confirmed";
    }

    if (session.expiresAt.getTime() < Date.now()) {
      return "expired";
    }

    return "ok";
  },

  async createSession(
    payload: CommunityPayoutOrderSessionPayload,
  ): Promise<CommunityPayoutOrderSessionDocument> {
    if (!isValidCommunityPayoutPackageAmount(payload.robuxAmount)) {
      throw new Error(`Invalid Community Payout package amount: ${payload.robuxAmount}`);
    }

    const finalPrice = getCommunityPayoutPackagePrice(payload.robuxAmount)!;

    return communityPayoutOrderSessionRepository.create({
      sessionId: randomUUID(),
      orderCode: generateCommunityPayoutOrderCode(),
      guildId: payload.guildId,
      userId: payload.userId,
      robuxAmount: payload.robuxAmount,
      finalPrice,
      robloxUserId: payload.robloxUser.userId,
      robloxUsername: payload.robloxUser.username,
      robloxDisplayName: payload.robloxUser.displayName,
      robloxAvatarUrl: payload.robloxUser.avatarUrl,
      status: CommunityPayoutOrderSessionStatus.PENDING,
      expiresAt: buildExpiryDate(),
    });
  },

  async updateSession(
    sessionId: string,
    payload: CommunityPayoutOrderSessionPayload,
  ): Promise<CommunityPayoutOrderSessionDocument | null> {
    if (!isValidCommunityPayoutPackageAmount(payload.robuxAmount)) {
      throw new Error(`Invalid Community Payout package amount: ${payload.robuxAmount}`);
    }

    const finalPrice = getCommunityPayoutPackagePrice(payload.robuxAmount)!;

    return communityPayoutOrderSessionRepository.updateBySessionId(sessionId, {
      robuxAmount: payload.robuxAmount,
      finalPrice,
      robloxUserId: payload.robloxUser.userId,
      robloxUsername: payload.robloxUser.username,
      robloxDisplayName: payload.robloxUser.displayName,
      robloxAvatarUrl: payload.robloxUser.avatarUrl,
      status: CommunityPayoutOrderSessionStatus.PENDING,
      expiresAt: buildExpiryDate(),
    });
  },

  async confirmSession(sessionId: string): Promise<CommunityPayoutOrderSessionDocument | null> {
    return communityPayoutOrderSessionRepository.updateBySessionId(sessionId, {
      status: CommunityPayoutOrderSessionStatus.CONFIRMED,
    });
  },

  async cancelSession(sessionId: string): Promise<CommunityPayoutOrderSessionDocument | null> {
    return communityPayoutOrderSessionRepository.updateBySessionId(sessionId, {
      status: CommunityPayoutOrderSessionStatus.CANCELLED,
    });
  },
};
