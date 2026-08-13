export enum PermissionLevel {
  Owner = "owner",
  Admin = "admin",
  Staff = "staff",
  Member = "member",
}

const PERMISSION_RANK: Record<PermissionLevel, number> = {
  [PermissionLevel.Owner]: 4,
  [PermissionLevel.Admin]: 3,
  [PermissionLevel.Staff]: 2,
  [PermissionLevel.Member]: 1,
};

export function comparePermissionLevel(
  actual: PermissionLevel,
  required: PermissionLevel,
): boolean {
  return PERMISSION_RANK[actual] >= PERMISSION_RANK[required];
}
