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

export function normalizeRobuxPackages(packages: readonly RobuxPackage[] | null | undefined): RobuxPackage[] {
  const source = packages?.length ? packages : ROBUX_USERNAME_PACKAGES;
  const unique = new Map<number, number>();

  for (const pkg of source) {
    if (
      Number.isInteger(pkg.robuxAmount) &&
      pkg.robuxAmount > 0 &&
      Number.isInteger(pkg.priceIdr) &&
      pkg.priceIdr > 0
    ) {
      unique.set(pkg.robuxAmount, pkg.priceIdr);
    }
  }

  return [...unique.entries()]
    .map(([robuxAmount, priceIdr]) => ({ robuxAmount, priceIdr }))
    .sort((left, right) => left.robuxAmount - right.robuxAmount);
}

export function formatRobuxPackages(packages: readonly RobuxPackage[]): string {
  return normalizeRobuxPackages(packages)
    .map((pkg) => `${pkg.robuxAmount.toLocaleString("id-ID")}⏣ = ${pkg.priceIdr}`)
    .join("\n");
}

export function parseRobuxPackages(input: string): RobuxPackage[] | null {
  const lines = input
    .split(/[\n,;]/)
    .map((line) => line.trim())
    .filter(Boolean);

  if (!lines.length) {
    return null;
  }

  const packages: RobuxPackage[] = [];

  for (const line of lines) {
    const match = line.match(/^([\d.\s,]+)\s*⏣?\s*[=:]\s*([\d.\s,]+)$/i);

    if (!match) {
      return null;
    }

    const robuxAmount = Number.parseInt(match[1].replace(/[.\s,]/g, ""), 10);
    const priceIdr = Number.parseInt(match[2].replace(/[.\s,]/g, ""), 10);

    if (!Number.isInteger(robuxAmount) || robuxAmount <= 0 || !Number.isInteger(priceIdr) || priceIdr <= 0) {
      return null;
    }

    packages.push({ robuxAmount, priceIdr });
  }

  const normalized = normalizeRobuxPackages(packages);
  return normalized.length === packages.length ? normalized : null;
}

export function getRobuxPackageMap(packages: readonly RobuxPackage[] = ROBUX_USERNAME_PACKAGES): Map<number, number> {
  return new Map(normalizeRobuxPackages(packages).map((pkg) => [pkg.robuxAmount, pkg.priceIdr]));
}

export function isValidRobuxPackageAmount(
  robuxAmount: number,
  packages: readonly RobuxPackage[] = ROBUX_USERNAME_PACKAGES,
): boolean {
  return getRobuxPackageMap(packages).has(robuxAmount);
}

export function getRobuxPackagePrice(
  robuxAmount: number,
  packages: readonly RobuxPackage[] = ROBUX_USERNAME_PACKAGES,
): number | null {
  return getRobuxPackageMap(packages).get(robuxAmount) ?? null;
}

export function parseRobuxPackageAmount(
  value: string,
  packages: readonly RobuxPackage[] = ROBUX_USERNAME_PACKAGES,
): number | null {
  const amount = Number.parseInt(value.trim(), 10);

  if (!Number.isInteger(amount) || !isValidRobuxPackageAmount(amount, packages)) {
    return null;
  }

  return amount;
}
