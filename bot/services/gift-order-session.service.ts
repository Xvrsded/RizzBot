import { randomUUID } from "node:crypto";
import { generateGiftOrderCode } from "../utils/order-code";
import { GIFT_SESSION_EXPIRY_MS } from "../../shared/products";
import { calculateGiftInGamePrice } from "../utils/pricing";
import { giftOrderSessionRepository } from "../../database/repositories/gift-order-session.repository";
import {
  GiftOrderSessionStatus,
  type GiftOrderSessionDocument,
} from "../../database/models/gift-order-session.model";
import type { RobloxUserLookupResult } from "./roblox.service";
import { guildConfigService } from "./guild-config.service";

export interface GiftOrderFormInput {
  gameName: string;
  gamepassName: string;
  robuxAmount: number;
  robloxUsername: string;
}

export interface GiftOrderSessionPayload extends GiftOrderFormInput {
  guildId: string;
  userId: string;
  robloxUser: RobloxUserLookupResult;
}

export function validateGiftOrderForm(input: GiftOrderFormInput): string | null {
  if (!input.gameName.trim()) {
    return "Nama Map / Link Game wajib diisi.";
  }

  if (!input.gamepassName.trim()) {
    return "Nama Gamepass wajib diisi.";
  }

  if (!Number.isInteger(input.robuxAmount) || input.robuxAmount <= 0) {
    return "Jumlah Robux harus berupa angka bulat positif.";
  }

  if (!input.robloxUsername.trim()) {
    return "Roblox Username wajib diisi.";
  }

  return null;
}

export function parseRobuxAmount(value: string): number | null {
  const trimmed = value.trim();

  if (!/^\d+$/.test(trimmed)) {
    return null;
  }

  const amount = Number.parseInt(trimmed, 10);

  if (!Number.isInteger(amount) || amount <= 0) {
    return null;
  }

  return amount;
}

function buildExpiryDate(): Date {
  return new Date(Date.now() + GIFT_SESSION_EXPIRY_MS);
}

export const giftOrderSessionService = {
  async expireStaleSessions(): Promise<number> {
    return giftOrderSessionRepository.expirePendingSessions();
  },

  async getSession(sessionId: string): Promise<GiftOrderSessionDocument | null> {
    const session = await giftOrderSessionRepository.findBySessionId(sessionId);

    if (!session) {
      return null;
    }

    if (
      session.status === GiftOrderSessionStatus.PENDING &&
      session.expiresAt.getTime() < Date.now()
    ) {
      await giftOrderSessionRepository.updateBySessionId(sessionId, {
        status: GiftOrderSessionStatus.EXPIRED,
      });
      session.status = GiftOrderSessionStatus.EXPIRED;
    }

    return session;
  },

  assertSessionUsable(
    session: GiftOrderSessionDocument,
    userId: string,
  ): "ok" | "expired" | "cancelled" | "confirmed" | "forbidden" {
    if (session.userId !== userId) {
      return "forbidden";
    }

    if (session.status === GiftOrderSessionStatus.EXPIRED) {
      return "expired";
    }

    if (session.status === GiftOrderSessionStatus.CANCELLED) {
      return "cancelled";
    }

    if (session.status === GiftOrderSessionStatus.CONFIRMED) {
      return "confirmed";
    }

    if (session.expiresAt.getTime() < Date.now()) {
      return "expired";
    }

    return "ok";
  },

  async createSession(payload: GiftOrderSessionPayload): Promise<GiftOrderSessionDocument> {
    const gigPricing = await guildConfigService.getGigPricing(payload.guildId);
    const pricing = calculateGiftInGamePrice(payload.robuxAmount, gigPricing);

    return giftOrderSessionRepository.create({
      sessionId: randomUUID(),
      orderCode: generateGiftOrderCode(),
      guildId: payload.guildId,
      userId: payload.userId,
      gameName: payload.gameName.trim(),
      gamepassName: payload.gamepassName.trim(),
      robuxAmount: payload.robuxAmount,
      robloxUserId: payload.robloxUser.userId,
      robloxUsername: payload.robloxUser.username,
      robloxDisplayName: payload.robloxUser.displayName,
      robloxAvatarUrl: payload.robloxUser.avatarUrl,
      rawPrice: pricing.rawPrice,
      finalPrice: pricing.finalPrice,
      rateIdr: gigPricing.rateIdr,
      status: GiftOrderSessionStatus.PENDING,
      expiresAt: buildExpiryDate(),
    });
  },

  async updateSession(
    sessionId: string,
    payload: GiftOrderSessionPayload,
  ): Promise<GiftOrderSessionDocument | null> {
    const gigPricing = await guildConfigService.getGigPricing(payload.guildId);
    const pricing = calculateGiftInGamePrice(payload.robuxAmount, gigPricing);

    return giftOrderSessionRepository.updateBySessionId(sessionId, {
      gameName: payload.gameName.trim(),
      gamepassName: payload.gamepassName.trim(),
      robuxAmount: payload.robuxAmount,
      robloxUserId: payload.robloxUser.userId,
      robloxUsername: payload.robloxUser.username,
      robloxDisplayName: payload.robloxUser.displayName,
      robloxAvatarUrl: payload.robloxUser.avatarUrl,
      rawPrice: pricing.rawPrice,
      finalPrice: pricing.finalPrice,
      rateIdr: gigPricing.rateIdr,
      status: GiftOrderSessionStatus.PENDING,
      expiresAt: buildExpiryDate(),
    });
  },

  async confirmSession(sessionId: string): Promise<GiftOrderSessionDocument | null> {
    return giftOrderSessionRepository.updateBySessionId(sessionId, {
      status: GiftOrderSessionStatus.CONFIRMED,
    });
  },

  async completeSession(sessionId: string): Promise<GiftOrderSessionDocument | null> {
    return giftOrderSessionRepository.updateBySessionId(sessionId, {
      status: GiftOrderSessionStatus.COMPLETED,
    });
  },

  async cancelSession(sessionId: string): Promise<GiftOrderSessionDocument | null> {
    return giftOrderSessionRepository.updateBySessionId(sessionId, {
      status: GiftOrderSessionStatus.CANCELLED,
    });
  },
};
