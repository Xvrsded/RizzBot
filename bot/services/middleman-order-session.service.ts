import { randomUUID } from "node:crypto";
import { GIFT_SESSION_EXPIRY_MS } from "../../shared/products";
import { calculateMiddlemanFee } from "../../shared/middleman";
import { generateMiddlemanOrderCode } from "../utils/order-code";
import { middlemanOrderSessionRepository } from "../../database/repositories/middleman-order-session.repository";
import {
  MiddlemanOrderSessionStatus,
  type MiddlemanOrderSessionDocument,
} from "../../database/models/middleman-order-session.model";

export interface MiddlemanOrderFormInput {
  party1Username: string;
  party2Username: string;
  transactionDetail: string;
}

export interface MiddlemanOrderSessionPayload extends MiddlemanOrderFormInput {
  guildId: string;
  userId: string;
  transactionAmountIdr: number;
}

function buildExpiryDate(): Date {
  return new Date(Date.now() + GIFT_SESSION_EXPIRY_MS);
}

export function validateMiddlemanUsername(value: string, label: string): string | null {
  const trimmed = value.trim();

  if (!trimmed) {
    return `${label} wajib diisi.`;
  }

  if (trimmed.length > 50) {
    return `${label} terlalu panjang.`;
  }

  return null;
}

export function validateMiddlemanTransactionDetail(value: string): string | null {
  const trimmed = value.trim();

  if (!trimmed) {
    return "Detail transaksi wajib diisi.";
  }

  if (trimmed.length > 500) {
    return "Detail transaksi terlalu panjang.";
  }

  return null;
}

export const middlemanOrderSessionService = {
  async expireStaleSessions(): Promise<number> {
    return middlemanOrderSessionRepository.expirePendingSessions();
  },

  async getSession(sessionId: string): Promise<MiddlemanOrderSessionDocument | null> {
    const session = await middlemanOrderSessionRepository.findBySessionId(sessionId);

    if (!session) {
      return null;
    }

    if (
      session.status === MiddlemanOrderSessionStatus.PENDING &&
      session.expiresAt.getTime() < Date.now()
    ) {
      await middlemanOrderSessionRepository.updateBySessionId(sessionId, {
        status: MiddlemanOrderSessionStatus.EXPIRED,
      });
      session.status = MiddlemanOrderSessionStatus.EXPIRED;
    }

    return session;
  },

  assertSessionUsable(
    session: MiddlemanOrderSessionDocument,
    userId: string,
  ): "ok" | "expired" | "cancelled" | "confirmed" | "forbidden" {
    if (session.userId !== userId) {
      return "forbidden";
    }

    if (session.status === MiddlemanOrderSessionStatus.EXPIRED) {
      return "expired";
    }

    if (session.status === MiddlemanOrderSessionStatus.CANCELLED) {
      return "cancelled";
    }

    if (session.status === MiddlemanOrderSessionStatus.CONFIRMED) {
      return "confirmed";
    }

    if (session.expiresAt.getTime() < Date.now()) {
      return "expired";
    }

    return "ok";
  },

  async createSession(payload: MiddlemanOrderSessionPayload): Promise<MiddlemanOrderSessionDocument> {
    const feeResult = calculateMiddlemanFee(payload.transactionAmountIdr);

    return middlemanOrderSessionRepository.create({
      sessionId: randomUUID(),
      orderCode: generateMiddlemanOrderCode(),
      guildId: payload.guildId,
      userId: payload.userId,
      transactionAmountIdr: payload.transactionAmountIdr,
      middlemanFeeIdr: feeResult.fee,
      finalPrice: feeResult.total,
      party1Username: payload.party1Username.trim(),
      party2Username: payload.party2Username.trim(),
      transactionDetail: payload.transactionDetail.trim(),
      status: MiddlemanOrderSessionStatus.PENDING,
      expiresAt: buildExpiryDate(),
    });
  },

  async updateSession(
    sessionId: string,
    payload: MiddlemanOrderSessionPayload,
  ): Promise<MiddlemanOrderSessionDocument | null> {
    const feeResult = calculateMiddlemanFee(payload.transactionAmountIdr);

    return middlemanOrderSessionRepository.updateBySessionId(sessionId, {
      transactionAmountIdr: payload.transactionAmountIdr,
      middlemanFeeIdr: feeResult.fee,
      finalPrice: feeResult.total,
      party1Username: payload.party1Username.trim(),
      party2Username: payload.party2Username.trim(),
      transactionDetail: payload.transactionDetail.trim(),
      expiresAt: buildExpiryDate(),
    });
  },

  async confirmSession(sessionId: string): Promise<MiddlemanOrderSessionDocument | null> {
    return middlemanOrderSessionRepository.updateBySessionId(sessionId, {
      status: MiddlemanOrderSessionStatus.CONFIRMED,
    });
  },

  async cancelSession(sessionId: string): Promise<MiddlemanOrderSessionDocument | null> {
    return middlemanOrderSessionRepository.updateBySessionId(sessionId, {
      status: MiddlemanOrderSessionStatus.CANCELLED,
    });
  },
};
