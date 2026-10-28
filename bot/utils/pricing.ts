import { DEFAULT_GIG_PRICING, type GigPriceConfig } from "../../shared/products";

export interface GiftInGamePriceResult {
  robuxAmount: number;
  rawPrice: number;
  finalPrice: number;
}

export function calculateGiftInGamePrice(
  robuxAmount: number,
  pricing: GigPriceConfig = {
    rateIdr: DEFAULT_GIG_PRICING.globalRateIdr,
    roundingIdr: DEFAULT_GIG_PRICING.roundingIdr,
  },
): GiftInGamePriceResult {
  const rawPrice = robuxAmount * pricing.rateIdr;
  const finalPrice = Math.ceil(rawPrice / pricing.roundingIdr) * pricing.roundingIdr;

  return { robuxAmount, rawPrice, finalPrice };
}

export function formatIdr(amount: number): string {
  return `Rp${amount.toLocaleString("id-ID")}`;
}

/** Parses admin-entered IDR amounts such as `150000` or `Rp150.000`. Returns null if invalid. */
export function parseIdrAmount(input: string): number | null {
  const trimmed = input.trim();

  if (!trimmed) {
    return null;
  }

  const normalized = trimmed
    .replace(/^rp\s*/i, "")
    .replace(/[\s.]/g, "")
    .replace(/,/g, "");

  const amount = Number.parseInt(normalized, 10);

  if (!Number.isFinite(amount) || amount <= 0) {
    return null;
  }

  return amount;
}
