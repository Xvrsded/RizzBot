import { randomUUID } from "node:crypto";
import { generateRobuxUsernameOrderCode } from "../utils/order-code";
import { GIFT_SESSION_EXPIRY_MS } from "../../shared/products";
import { getRobuxPackagePrice, isValidRobuxPackageAmount } from "../../shared/robux-packages";
import { robuxOrderSessionRepository } from "../../database/repositories/robux-order-session.repository";
import {
  RobuxOrderSessionStatus,
  type RobuxOrderSessionDocument,
} from "../../database/models/robux-order-session.model";
import type { RobloxUserLookupResult } from "./roblox.service";

export interface RobuxOrderSessionPayload {
  guildId: string;
  userId: string;
  robuxAmount: number;
  robloxUsername: string;
  robloxUser: RobloxUserLookupResult;
}

function buildExpiryDate(): Date {
  return new Date(Date.now() + GIFT_SESSION_EXPIRY_MS);
}

export function validateRobuxUsernameInput(robloxUsername: string): string | null {
  if (!robloxUsername.trim()) {
    return "Roblox Username wajib diisi.";
  }

  return null;
}

export const robuxOrderSessionService = {
  async expireStaleSessions(): Promise<number> {
    return robuxOrderSessionRepository.expirePendingSessions();
  },

  async getSession(sessionId: string): Promise<RobuxOrderSessionDocument | null> {
    const session = await robuxOrderSessionRepository.findBySessionId(sessionId);

    if (!session) {
      return null;
    }

    if (
      session.status === RobuxOrderSessionStatus.PENDING &&
      session.expiresAt.getTime() < Date.now()
    ) {
      await robuxOrderSessionRepository.updateBySessionId(sessionId, {
        status: RobuxOrderSessionStatus.EXPIRED,
      });
      session.status = RobuxOrderSessionStatus.EXPIRED;
    }

    return session;
  },

  assertSessionUsable(
    session: RobuxOrderSessionDocument,
    userId: string,
  ): "ok" | "expired" | "cancelled" | "confirmed" | "forbidden" {
    if (session.userId !== userId) {
      return "forbidden";
    }

    if (session.status === RobuxOrderSessionStatus.EXPIRED) {
      return "expired";
    }

    if (session.status === RobuxOrderSessionStatus.CANCELLED) {
      return "cancelled";
    }

    if (session.status === RobuxOrderSessionStatus.CONFIRMED) {
      return "confirmed";
    }

    if (session.expiresAt.getTime() < Date.now()) {
      return "expired";
    }

    return "ok";
  },

  async createSession(payload: RobuxOrderSessionPayload): Promise<RobuxOrderSessionDocument> {
    if (!isValidRobuxPackageAmount(payload.robuxAmount)) {
      throw new Error(`Invalid Robux package amount: ${payload.robuxAmount}`);
    }

    const finalPrice = getRobuxPackagePrice(payload.robuxAmount)!;

    return robuxOrderSessionRepository.create({
      sessionId: randomUUID(),
      orderCode: generateRobuxUsernameOrderCode(),
      guildId: payload.guildId,
      userId: payload.userId,
      robuxAmount: payload.robuxAmount,
      finalPrice,
      robloxUserId: payload.robloxUser.userId,
      robloxUsername: payload.robloxUser.username,
      robloxDisplayName: payload.robloxUser.displayName,
      robloxAvatarUrl: payload.robloxUser.avatarUrl,
      status: RobuxOrderSessionStatus.PENDING,
      expiresAt: buildExpiryDate(),
    });
  },

  async updateSession(
    sessionId: string,
    payload: RobuxOrderSessionPayload,
  ): Promise<RobuxOrderSessionDocument | null> {
    if (!isValidRobuxPackageAmount(payload.robuxAmount)) {
      throw new Error(`Invalid Robux package amount: ${payload.robuxAmount}`);
    }

    const finalPrice = getRobuxPackagePrice(payload.robuxAmount)!;

    return robuxOrderSessionRepository.updateBySessionId(sessionId, {
      robuxAmount: payload.robuxAmount,
      finalPrice,
      robloxUserId: payload.robloxUser.userId,
      robloxUsername: payload.robloxUser.username,
      robloxDisplayName: payload.robloxUser.displayName,
      robloxAvatarUrl: payload.robloxUser.avatarUrl,
      status: RobuxOrderSessionStatus.PENDING,
      expiresAt: buildExpiryDate(),
    });
  },

  async confirmSession(sessionId: string): Promise<RobuxOrderSessionDocument | null> {
    return robuxOrderSessionRepository.updateBySessionId(sessionId, {
      status: RobuxOrderSessionStatus.CONFIRMED,
    });
  },

  async cancelSession(sessionId: string): Promise<RobuxOrderSessionDocument | null> {
    return robuxOrderSessionRepository.updateBySessionId(sessionId, {
      status: RobuxOrderSessionStatus.CANCELLED,
    });
  },
};
