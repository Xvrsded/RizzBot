export interface LoginPackage {
  robuxAmount: number;
  priceIdr: number;
}

export const ROBUX_LOGIN_PACKAGES: readonly LoginPackage[] = [
  { robuxAmount: 100, priceIdr: 16_000 },
  { robuxAmount: 200, priceIdr: 32_000 },
  { robuxAmount: 300, priceIdr: 48_000 },
  { robuxAmount: 400, priceIdr: 64_000 },
  { robuxAmount: 500, priceIdr: 80_000 },
  { robuxAmount: 600, priceIdr: 96_000 },
  { robuxAmount: 700, priceIdr: 112_000 },
  { robuxAmount: 800, priceIdr: 128_000 },
  { robuxAmount: 900, priceIdr: 144_000 },
  { robuxAmount: 1000, priceIdr: 160_000 },
] as const;

const PACKAGE_MAP = new Map<number, number>(
  ROBUX_LOGIN_PACKAGES.map((pkg) => [pkg.robuxAmount, pkg.priceIdr]),
);

export function isValidLoginPackageAmount(robuxAmount: number): boolean {
  return PACKAGE_MAP.has(robuxAmount);
}

export function getLoginPackagePrice(robuxAmount: number): number | null {
  return PACKAGE_MAP.get(robuxAmount) ?? null;
}

export function parseLoginPackageAmount(value: string): number | null {
  const amount = Number.parseInt(value.trim(), 10);

  if (!Number.isInteger(amount) || !isValidLoginPackageAmount(amount)) {
    return null;
  }

  return amount;
}
