import { randomUUID } from "node:crypto";
import { generateLimitedOrderCode } from "../utils/order-code";
import { GIFT_SESSION_EXPIRY_MS } from "../../shared/products";
import { limitedOrderSessionRepository } from "../../database/repositories/limited-order-session.repository";
import {
  LimitedOrderSessionStatus,
  LimitedPriceStatus,
  type LimitedOrderSessionDocument,
} from "../../database/models/limited-order-session.model";
import type { RobloxUserLookupResult } from "./roblox.service";

export interface LimitedOrderSessionPayload {
  guildId: string;
  userId: string;
  itemName: string;
  robloxUsername: string;
  robloxUser: RobloxUserLookupResult;
}

function buildExpiryDate(): Date {
  return new Date(Date.now() + GIFT_SESSION_EXPIRY_MS);
}

export function validateLimitedItemInput(itemName: string): string | null {
  if (!itemName.trim()) {
    return "Item Limited wajib diisi.";
  }

  return null;
}

export function validateLimitedUsernameInput(robloxUsername: string): string | null {
  if (!robloxUsername.trim()) {
    return "Roblox Username wajib diisi.";
  }

  return null;
}

export const limitedOrderSessionService = {
  async expireStaleSessions(): Promise<number> {
    return limitedOrderSessionRepository.expirePendingSessions();
  },

  async getSession(sessionId: string): Promise<LimitedOrderSessionDocument | null> {
    const session = await limitedOrderSessionRepository.findBySessionId(sessionId);

    if (!session) {
      return null;
    }

    if (
      session.status === LimitedOrderSessionStatus.PENDING &&
      session.expiresAt.getTime() < Date.now()
    ) {
      await limitedOrderSessionRepository.updateBySessionId(sessionId, {
        status: LimitedOrderSessionStatus.EXPIRED,
      });
      session.status = LimitedOrderSessionStatus.EXPIRED;
    }

    return session;
  },

  assertSessionUsable(
    session: LimitedOrderSessionDocument,
    userId: string,
  ): "ok" | "expired" | "cancelled" | "confirmed" | "forbidden" {
    if (session.userId !== userId) {
      return "forbidden";
    }

    if (session.status === LimitedOrderSessionStatus.EXPIRED) {
      return "expired";
    }

    if (session.status === LimitedOrderSessionStatus.CANCELLED) {
      return "cancelled";
    }

    if (session.status === LimitedOrderSessionStatus.CONFIRMED) {
      return "confirmed";
    }

    if (session.expiresAt.getTime() < Date.now()) {
      return "expired";
    }

    return "ok";
  },

  async createSession(payload: LimitedOrderSessionPayload): Promise<LimitedOrderSessionDocument> {
    return limitedOrderSessionRepository.create({
      sessionId: randomUUID(),
      orderCode: generateLimitedOrderCode(),
      guildId: payload.guildId,
      userId: payload.userId,
      itemName: payload.itemName.trim(),
      price: null,
      priceStatus: LimitedPriceStatus.UNSET,
      robloxUserId: payload.robloxUser.userId,
      robloxUsername: payload.robloxUser.username,
      robloxDisplayName: payload.robloxUser.displayName,
      robloxAvatarUrl: payload.robloxUser.avatarUrl,
      status: LimitedOrderSessionStatus.PENDING,
      expiresAt: buildExpiryDate(),
    });
  },

  async updateSession(
    sessionId: string,
    payload: LimitedOrderSessionPayload,
  ): Promise<LimitedOrderSessionDocument | null> {
    return limitedOrderSessionRepository.updateBySessionId(sessionId, {
      itemName: payload.itemName.trim(),
      price: null,
      priceStatus: LimitedPriceStatus.UNSET,
      robloxUserId: payload.robloxUser.userId,
      robloxUsername: payload.robloxUser.username,
      robloxDisplayName: payload.robloxUser.displayName,
      robloxAvatarUrl: payload.robloxUser.avatarUrl,
      status: LimitedOrderSessionStatus.PENDING,
      expiresAt: buildExpiryDate(),
    });
  },

  async confirmSession(sessionId: string): Promise<LimitedOrderSessionDocument | null> {
    return limitedOrderSessionRepository.updateBySessionId(sessionId, {
      status: LimitedOrderSessionStatus.CONFIRMED,
    });
  },

  async cancelSession(sessionId: string): Promise<LimitedOrderSessionDocument | null> {
    return limitedOrderSessionRepository.updateBySessionId(sessionId, {
      status: LimitedOrderSessionStatus.CANCELLED,
    });
  },
};
