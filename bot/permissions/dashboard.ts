import { GuildMember, type APIInteractionGuildMember, type Interaction } from "discord.js";
import { DASHBOARD_ADMIN_ROLE_ID, DASHBOARD_OWNER_ROLE_ID } from "../../shared/products";
import { PermissionDeniedError } from "./guards";

function resolveMemberRoleIds(member: GuildMember | APIInteractionGuildMember): string[] {
  if (member instanceof GuildMember) {
    return [...member.roles.cache.keys()];
  }

  return member.roles;
}

export function memberHasDashboardAccess(member: GuildMember | APIInteractionGuildMember): boolean {
  const roleIds = resolveMemberRoleIds(member);
  return roleIds.includes(DASHBOARD_OWNER_ROLE_ID) || roleIds.includes(DASHBOARD_ADMIN_ROLE_ID);
}

export function interactionHasDashboardAccess(interaction: Interaction): boolean {
  if (!interaction.inGuild() || !interaction.member) {
    return false;
  }

  return memberHasDashboardAccess(interaction.member);
}

export function requireDashboardAccess(interaction: Interaction): void {
  if (!interactionHasDashboardAccess(interaction)) {
    throw new PermissionDeniedError();
  }
}
