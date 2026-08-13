const ORDER_CODE_CHARS = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

export function generateGiftOrderCode(): string {
  let suffix = "";

  for (let index = 0; index < 4; index++) {
    suffix += ORDER_CODE_CHARS[Math.floor(Math.random() * ORDER_CODE_CHARS.length)];
  }

  return `GFT-${suffix}`;
}

export function generateRobuxUsernameOrderCode(): string {
  let suffix = "";

  for (let index = 0; index < 4; index++) {
    suffix += ORDER_CODE_CHARS[Math.floor(Math.random() * ORDER_CODE_CHARS.length)];
  }

  return `VIS-${suffix}`;
}

export function generateLoginOrderCode(): string {
  let suffix = "";

  for (let index = 0; index < 4; index++) {
    suffix += ORDER_CODE_CHARS[Math.floor(Math.random() * ORDER_CODE_CHARS.length)];
  }

  return `LOGIN-${suffix}`;
}

export function generateLimitedOrderCode(): string {
  let suffix = "";

  for (let index = 0; index < 4; index++) {
    suffix += ORDER_CODE_CHARS[Math.floor(Math.random() * ORDER_CODE_CHARS.length)];
  }

  return `LTD-${suffix}`;
}

export function generateMiddlemanOrderCode(): string {
  let suffix = "";

  for (let index = 0; index < 4; index++) {
    suffix += ORDER_CODE_CHARS[Math.floor(Math.random() * ORDER_CODE_CHARS.length)];
  }

  return `MM-${suffix}`;
}

export function generateCommunityPayoutOrderCode(): string {
  let suffix = "";

  for (let index = 0; index < 4; index++) {
    suffix += ORDER_CODE_CHARS[Math.floor(Math.random() * ORDER_CODE_CHARS.length)];
  }

  return `RCP-${suffix}`;
}
