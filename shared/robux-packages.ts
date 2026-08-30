export interface RobuxPackage {
  robuxAmount: number;
  priceIdr: number;
}

export const ROBUX_USERNAME_PACKAGES: readonly RobuxPackage[] = [
  { robuxAmount: 100, priceIdr: 15500 },
  { robuxAmount: 200, priceIdr: 31000 },
  { robuxAmount: 300, priceIdr: 46500 },
  { robuxAmount: 400, priceIdr: 62000 },
  { robuxAmount: 500, priceIdr: 77500 },
  { robuxAmount: 600, priceIdr: 93000 },
  { robuxAmount: 700, priceIdr: 108500 },
  { robuxAmount: 800, priceIdr: 124000 },
  { robuxAmount: 900, priceIdr: 139500 },
  { robuxAmount: 1000, priceIdr: 155000 },
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
