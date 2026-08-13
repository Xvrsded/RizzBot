/**
 * Returns a safe host label for logs — never includes username, password, or full URI.
 */
export function getMongoHostDisplay(uri: string): string {
  const srvMatch = uri.match(/^mongodb\+srv:\/\/(?:[^@/]+@)?([^/?]+)/i);
  if (srvMatch?.[1]) {
    return srvMatch[1];
  }

  const standardMatch = uri.match(/^mongodb:\/\/(?:[^@/]+@)?([^/?]+)/i);
  if (standardMatch?.[1]) {
    return standardMatch[1];
  }

  return "(unable to parse host)";
}

export function getMongoSchemeDisplay(uri: string): "mongodb" | "mongodb+srv" | "unknown" {
  if (uri.startsWith("mongodb+srv://")) {
    return "mongodb+srv";
  }

  if (uri.startsWith("mongodb://")) {
    return "mongodb";
  }

  return "unknown";
}
