export interface RobuxPackage {
  robuxAmount: number;
  priceIdr: number;
}

export const ROBUX_USERNAME_PACKAGES: readonly RobuxPackage[] = [
  { robuxAmount: 50, priceIdr: 8500 },
  { robuxAmount: 100, priceIdr: 15000 },
  { robuxAmount: 200, priceIdr: 30000 },
  { robuxAmount: 300, priceIdr: 45000 },
  { robuxAmount: 400, priceIdr: 60000 },
  { robuxAmount: 500, priceIdr: 75000 },
  { robuxAmount: 600, priceIdr: 90000 },
  { robuxAmount: 700, priceIdr: 105000 },
  { robuxAmount: 800, priceIdr: 120000 },
  { robuxAmount: 900, priceIdr: 135000 },
  { robuxAmount: 1000, priceIdr: 150000 },
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
