export function parseInventoryAmount(raw: string): number | null {
  const normalized = raw.trim().replace(/\./g, "").replace(/,/g, "").replace(/\s/g, "");

  if (!normalized) {
    return null;
  }

  if (!/^\d+$/.test(normalized)) {
    return null;
  }

  const value = Number.parseInt(normalized, 10);

  if (!Number.isFinite(value) || value < 0) {
    return null;
  }

  return value;
}
