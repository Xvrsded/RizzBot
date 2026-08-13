export interface ParsedCustomId {
  domain: string;
  action: string;
  id?: string;
  raw: string;
}

const CUSTOM_ID_SEPARATOR = ":";

export function buildCustomId(domain: string, action: string, id?: string): string {
  if (id !== undefined && id.length > 0) {
    return `${domain}${CUSTOM_ID_SEPARATOR}${action}${CUSTOM_ID_SEPARATOR}${id}`;
  }

  return `${domain}${CUSTOM_ID_SEPARATOR}${action}`;
}

export function parseCustomId(customId: string): ParsedCustomId | null {
  const parts = customId.split(CUSTOM_ID_SEPARATOR);

  if (parts.length < 2 || parts.length > 3) {
    return null;
  }

  const [domain, action, id] = parts;

  if (!domain || !action) {
    return null;
  }

  return {
    domain,
    action,
    id: parts.length === 3 ? id : undefined,
    raw: customId,
  };
}

export function matchesDomain(customId: string, domain: string): boolean {
  const parsed = parseCustomId(customId);
  return parsed?.domain === domain;
}
