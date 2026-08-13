export interface CommunityPayoutPackage {
  robuxAmount: number;
  priceIdr: number;
}

export const COMMUNITY_PAYOUT_PACKAGES: readonly CommunityPayoutPackage[] = [
  { robuxAmount: 100, priceIdr: 13_000 },
  { robuxAmount: 200, priceIdr: 26_000 },
  { robuxAmount: 300, priceIdr: 39_000 },
  { robuxAmount: 400, priceIdr: 52_000 },
  { robuxAmount: 500, priceIdr: 65_000 },
  { robuxAmount: 600, priceIdr: 78_000 },
  { robuxAmount: 700, priceIdr: 91_000 },
  { robuxAmount: 800, priceIdr: 104_000 },
  { robuxAmount: 900, priceIdr: 117_000 },
  { robuxAmount: 1000, priceIdr: 130_000 },
] as const;

const PACKAGE_MAP = new Map<number, number>(
  COMMUNITY_PAYOUT_PACKAGES.map((pkg) => [pkg.robuxAmount, pkg.priceIdr]),
);

export function isValidCommunityPayoutPackageAmount(robuxAmount: number): boolean {
  return PACKAGE_MAP.has(robuxAmount);
}

export function getCommunityPayoutPackagePrice(robuxAmount: number): number | null {
  return PACKAGE_MAP.get(robuxAmount) ?? null;
}

export function parseCommunityPayoutPackageAmount(value: string): number | null {
  const amount = Number.parseInt(value.trim(), 10);

  if (!Number.isInteger(amount) || !isValidCommunityPayoutPackageAmount(amount)) {
    return null;
  }

  return amount;
}
