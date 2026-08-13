import {
  GuildMember,
  type APIInteractionGuildMember,
  type Interaction,
} from "discord.js";
import { guildConfigService } from "../services/guild-config.service";
import { comparePermissionLevel, PermissionLevel } from "./roles";

export class PermissionDeniedError extends Error {
  constructor(message = "You do not have permission to perform this action.") {
    super(message);
    this.name = "PermissionDeniedError";
  }
}

function resolveMemberRoles(
  member: GuildMember | APIInteractionGuildMember,
): string[] {
  if (member instanceof GuildMember) {
    return [...member.roles.cache.keys()];
  }

  return member.roles;
}

export async function getMemberPermissionLevel(
  interaction: Interaction,
  guildId: string,
): Promise<PermissionLevel> {
  if (!interaction.inGuild()) {
    return PermissionLevel.Member;
  }

  const guild = interaction.guild;

  if (guild && interaction.user.id === guild.ownerId) {
    return PermissionLevel.Owner;
  }

  if (!interaction.member) {
    return PermissionLevel.Member;
  }

  const config = await guildConfigService.getGuildConfig(guildId);
  const memberRoles = resolveMemberRoles(interaction.member);

  if (config?.ownerRoleId && memberRoles.includes(config.ownerRoleId)) {
    return PermissionLevel.Owner;
  }

  if (config?.adminRoleId && memberRoles.includes(config.adminRoleId)) {
    return PermissionLevel.Admin;
  }

  if (config?.staffRoleId && memberRoles.includes(config.staffRoleId)) {
    return PermissionLevel.Staff;
  }

  return PermissionLevel.Member;
}

async function assertPermission(
  interaction: Interaction,
  guildId: string,
  required: PermissionLevel,
): Promise<void> {
  const level = await getMemberPermissionLevel(interaction, guildId);

  if (!comparePermissionLevel(level, required)) {
    throw new PermissionDeniedError();
  }
}

export async function requireOwner(interaction: Interaction, guildId: string): Promise<void> {
  await assertPermission(interaction, guildId, PermissionLevel.Owner);
}

export async function requireAdmin(interaction: Interaction, guildId: string): Promise<void> {
  await assertPermission(interaction, guildId, PermissionLevel.Admin);
}

export async function requireStaff(interaction: Interaction, guildId: string): Promise<void> {
  await assertPermission(interaction, guildId, PermissionLevel.Staff);
}
