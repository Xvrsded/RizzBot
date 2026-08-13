import { GuildMember, type APIInteractionGuildMember, type Interaction } from "discord.js";
import { GIFT_ADMIN_ROLE_ID, GIFT_OWNER_ROLE_ID } from "../../shared/products";

function resolveMemberRoleIds(member: GuildMember | APIInteractionGuildMember): string[] {
  if (member instanceof GuildMember) {
    return [...member.roles.cache.keys()];
  }

  return member.roles;
}

export function memberHasGiftTicketAdminOrOwnerRole(
  member: GuildMember | APIInteractionGuildMember,
): boolean {
  const roleIds = resolveMemberRoleIds(member);
  return roleIds.includes(GIFT_ADMIN_ROLE_ID) || roleIds.includes(GIFT_OWNER_ROLE_ID);
}

export function interactionHasGiftTicketAdminOrOwnerRole(interaction: Interaction): boolean {
  if (!interaction.inGuild() || !interaction.member) {
    return false;
  }

  return memberHasGiftTicketAdminOrOwnerRole(interaction.member);
}
