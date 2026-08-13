import { randomUUID } from "node:crypto";
import { generateLoginOrderCode } from "../utils/order-code";
import { GIFT_SESSION_EXPIRY_MS } from "../../shared/products";
import { getLoginPackagePrice, isValidLoginPackageAmount } from "../../shared/login-packages";
import { loginOrderSessionRepository } from "../../database/repositories/login-order-session.repository";
import {
  LoginOrderSessionStatus,
  type LoginOrderSessionDocument,
} from "../../database/models/login-order-session.model";
import type { RobloxUserLookupResult } from "./roblox.service";

export interface LoginOrderSessionPayload {
  guildId: string;
  userId: string;
  robuxAmount: number;
  robloxUsername: string;
  robloxUser: RobloxUserLookupResult;
}

function buildExpiryDate(): Date {
  return new Date(Date.now() + GIFT_SESSION_EXPIRY_MS);
}

export function validateLoginUsernameInput(robloxUsername: string): string | null {
  if (!robloxUsername.trim()) {
    return "Roblox Username wajib diisi.";
  }

  return null;
}

export const loginOrderSessionService = {
  async expireStaleSessions(): Promise<number> {
    return loginOrderSessionRepository.expirePendingSessions();
  },

  async getSession(sessionId: string): Promise<LoginOrderSessionDocument | null> {
    const session = await loginOrderSessionRepository.findBySessionId(sessionId);

    if (!session) {
      return null;
    }

    if (
      session.status === LoginOrderSessionStatus.PENDING &&
      session.expiresAt.getTime() < Date.now()
    ) {
      await loginOrderSessionRepository.updateBySessionId(sessionId, {
        status: LoginOrderSessionStatus.EXPIRED,
      });
      session.status = LoginOrderSessionStatus.EXPIRED;
    }

    return session;
  },

  assertSessionUsable(
    session: LoginOrderSessionDocument,
    userId: string,
  ): "ok" | "expired" | "cancelled" | "confirmed" | "forbidden" {
    if (session.userId !== userId) {
      return "forbidden";
    }

    if (session.status === LoginOrderSessionStatus.EXPIRED) {
      return "expired";
    }

    if (session.status === LoginOrderSessionStatus.CANCELLED) {
      return "cancelled";
    }

    if (session.status === LoginOrderSessionStatus.CONFIRMED) {
      return "confirmed";
    }

    if (session.expiresAt.getTime() < Date.now()) {
      return "expired";
    }

    return "ok";
  },

  async createSession(payload: LoginOrderSessionPayload): Promise<LoginOrderSessionDocument> {
    if (!isValidLoginPackageAmount(payload.robuxAmount)) {
      throw new Error(`Invalid login package amount: ${payload.robuxAmount}`);
    }

    const finalPrice = getLoginPackagePrice(payload.robuxAmount)!;

    return loginOrderSessionRepository.create({
      sessionId: randomUUID(),
      orderCode: generateLoginOrderCode(),
      guildId: payload.guildId,
      userId: payload.userId,
      robuxAmount: payload.robuxAmount,
      finalPrice,
      robloxUserId: payload.robloxUser.userId,
      robloxUsername: payload.robloxUser.username,
      robloxDisplayName: payload.robloxUser.displayName,
      robloxAvatarUrl: payload.robloxUser.avatarUrl,
      status: LoginOrderSessionStatus.PENDING,
      expiresAt: buildExpiryDate(),
    });
  },

  async updateSession(
    sessionId: string,
    payload: LoginOrderSessionPayload,
  ): Promise<LoginOrderSessionDocument | null> {
    if (!isValidLoginPackageAmount(payload.robuxAmount)) {
      throw new Error(`Invalid login package amount: ${payload.robuxAmount}`);
    }

    const finalPrice = getLoginPackagePrice(payload.robuxAmount)!;

    return loginOrderSessionRepository.updateBySessionId(sessionId, {
      robuxAmount: payload.robuxAmount,
      finalPrice,
      robloxUserId: payload.robloxUser.userId,
      robloxUsername: payload.robloxUser.username,
      robloxDisplayName: payload.robloxUser.displayName,
      robloxAvatarUrl: payload.robloxUser.avatarUrl,
      status: LoginOrderSessionStatus.PENDING,
      expiresAt: buildExpiryDate(),
    });
  },

  async confirmSession(sessionId: string): Promise<LoginOrderSessionDocument | null> {
    return loginOrderSessionRepository.updateBySessionId(sessionId, {
      status: LoginOrderSessionStatus.CONFIRMED,
    });
  },

  async cancelSession(sessionId: string): Promise<LoginOrderSessionDocument | null> {
    return loginOrderSessionRepository.updateBySessionId(sessionId, {
      status: LoginOrderSessionStatus.CANCELLED,
    });
  },
};
