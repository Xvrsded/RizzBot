export const SERVICE_STATUS_KEYS = [
  "robuxLogin",
  "robuxSend",
  "giftInGame",
  "mmReber",
  "limitedItem",
  "communityPayout",
] as const;

export type ServiceStatusKey = (typeof SERVICE_STATUS_KEYS)[number];

export interface ServiceStatusMap {
  robuxLogin: boolean;
  robuxSend: boolean;
  giftInGame: boolean;
  mmReber: boolean;
  limitedItem: boolean;
  communityPayout: boolean;
}

export const DEFAULT_SERVICE_STATUS: ServiceStatusMap = {
  robuxLogin: true,
  robuxSend: true,
  giftInGame: true,
  mmReber: true,
  limitedItem: true,
  communityPayout: true,
};

export const SERVICE_TOGGLE_IDS: Record<ServiceStatusKey, string> = {
  robuxLogin: "robux-login",
  robuxSend: "robux-send",
  giftInGame: "gift-in-game",
  mmReber: "mm-reber",
  limitedItem: "limited-item",
  communityPayout: "community-payout",
};

export const SERVICE_LABELS: Record<ServiceStatusKey, string> = {
  robuxLogin: "Robux Via Login",
  robuxSend: "Robux Via Send",
  giftInGame: "Gift In Game",
  mmReber: "MM / Reber",
  limitedItem: "Limited Item",
  communityPayout: "Community Payout",
};

export const SERVICE_FOOTERS: Record<ServiceStatusKey, string> = {
  robuxLogin: "RizzBot • Robux Via Login",
  robuxSend: "RizzBot • Robux Via Send",
  giftInGame: "RizzBot • Gift In Game",
  mmReber: "RizzBot • MM / Reber",
  limitedItem: "RizzBot • Limited Item",
  communityPayout: "RizzBot • Community Payout",
};

export function parseServiceToggleId(toggleId: string): ServiceStatusKey | null {
  const entry = Object.entries(SERVICE_TOGGLE_IDS).find(([, id]) => id === toggleId);
  return entry ? (entry[0] as ServiceStatusKey) : null;
}
