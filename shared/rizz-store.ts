export const RIZZ_STORE_CATEGORY_NAME = "📊 RIZZSTORE";

export const RIZZ_STORE_CHANNEL_KEYS = [
  "queue",
  "stockViaSend",
  "stockGig",
  "giftGamepass",
  "robuxUsername",
  "robuxLogin",
  "limitedItem",
  "groupPayout",
  "mmRekber",
] as const;

export type RizzStoreChannelKey = (typeof RIZZ_STORE_CHANNEL_KEYS)[number];

export type RizzStoreChannelMap = Record<RizzStoreChannelKey, string | null>;

export interface RizzStoreConfig {
  categoryId: string | null;
  channels: RizzStoreChannelMap;
  groupPayoutEnabled: boolean;
}

export const DEFAULT_RIZZ_STORE_CHANNELS: RizzStoreChannelMap = {
  queue: null,
  stockViaSend: null,
  stockGig: null,
  giftGamepass: null,
  robuxUsername: null,
  robuxLogin: null,
  limitedItem: null,
  groupPayout: null,
  mmRekber: null,
};

export const DEFAULT_RIZZ_STORE_CONFIG: RizzStoreConfig = {
  categoryId: null,
  channels: { ...DEFAULT_RIZZ_STORE_CHANNELS },
  groupPayoutEnabled: true,
};

export interface RizzStoreChannelDefinition {
  key: RizzStoreChannelKey;
  namePrefix: string;
}

export const RIZZ_STORE_CHANNEL_DEFINITIONS: RizzStoreChannelDefinition[] = [
  { key: "queue", namePrefix: "🎟️ | ANTRIAN:" },
  { key: "stockViaSend", namePrefix: "📦 | STOCK VIA SEND:" },
  { key: "stockGig", namePrefix: "📦 | STOCK GIG:" },
  { key: "giftGamepass", namePrefix: "🎁 | GIFT GAMEPASS:" },
  { key: "robuxUsername", namePrefix: "💎 | ROBUX VIA USERNAME:" },
  { key: "robuxLogin", namePrefix: "🔐 | ROBUX VIA LOGIN:" },
  { key: "limitedItem", namePrefix: "💎 | LIMITED ITEM:" },
  { key: "groupPayout", namePrefix: "💸 | GROUP PAYOUT:" },
  { key: "mmRekber", namePrefix: "🛡️ | MM REKBER:" },
];

export function formatStockDisplay(value: number): string {
  if (!Number.isFinite(value) || value <= 0) {
    return "HABIS";
  }

  return Math.floor(value).toLocaleString("id-ID");
}

export function formatServiceDisplay(enabled: boolean): string {
  return enabled ? "✅" : "❌";
}

export function buildRizzStoreChannelName(prefix: string, value: string): string {
  const name = `${prefix} ${value}`.trim();
  return name.length > 100 ? name.slice(0, 100) : name;
}
