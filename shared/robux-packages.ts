export interface RobuxPackage {
  robuxAmount: number;
  priceIdr: number;
}

export const ROBUX_USERNAME_PACKAGES: readonly RobuxPackage[] = [
  { robuxAmount: 100, priceIdr: 16000 },
  { robuxAmount: 200, priceIdr: 32000 },
  { robuxAmount: 300, priceIdr: 48000 },
  { robuxAmount: 400, priceIdr: 64000 },
  { robuxAmount: 500, priceIdr: 80000 },
  { robuxAmount: 600, priceIdr: 96000 },
  { robuxAmount: 700, priceIdr: 112000 },
  { robuxAmount: 800, priceIdr: 128000 },
  { robuxAmount: 900, priceIdr: 144000 },
  { robuxAmount: 1000, priceIdr: 160000 },
] as const;

const PACKAGE_MAP = new Map<number, number>(
  ROBUX_USERNAME_PACKAGES.map((pkg) => [pkg.robuxAmount, pkg.priceIdr]),
);

export function isValidRobuxPackageAmount(robuxAmount: number): boolean {
  return PACKAGE_MAP.has(robuxAmount);
}

export function getRobuxPackagePrice(robuxAmount: number): number | null {
  return PACKAGE_MAP.get(robuxAmount) ?? null;
}

export function parseRobuxPackageAmount(value: string): number | null {
  const amount = Number.parseInt(value.trim(), 10);

  if (!Number.isInteger(amount) || !isValidRobuxPackageAmount(amount)) {
    return null;
  }

  return amount;
}
