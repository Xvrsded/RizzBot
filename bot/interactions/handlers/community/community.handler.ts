import {
  MessageFlags,
  type ButtonInteraction,
  type InteractionEditReplyOptions,
  type ModalSubmitInteraction,
  type StringSelectMenuInteraction,
} from "discord.js";
import type { ParsedCustomId } from "../../custom-id";
import { ProductType } from "../../../../shared/products";
import { COMMUNITY_PAYOUT_ELIGIBLE_ROLE_ID, COMMUNITY_PAYOUT_GROUP_IDS } from "../../../../shared/community-payout";
import { parseCommunityPayoutPackageAmount } from "../../../../shared/community-payout-packages";
import { guildConfigService } from "../../../services/guild-config.service";
import {
  communityPayoutOrderSessionService,
  validateCommunityPayoutUsernameInput,
} from "../../../services/community-payout-order-session.service";
import { communityMembershipService } from "../../../services/community-membership.service";
import { robloxCommunityMembershipRepository } from "../../../../database/repositories/roblox-community-membership.repository";
import { lookupRobloxUser, RobloxApiError, RobloxUserNotFoundError } from "../../../services/roblox.service";
import { ticketService } from "../../../services/ticket.service";
import { TicketError } from "../../../services/ticket.errors";
import {
  buildCommunityEligibleEmbed,
  buildCommunityDmConfirmationEmbed,
  buildCommunityDmConfirmationRow,
  buildCommunityNotEligibleEmbed,
  buildCommunityOrderCancelledEmbed,
  buildCommunityOrderExpiredEmbed,
  buildCommunityOrderLockedEmbed,
  buildCommunityPackageSelectEmbed,
  buildCommunityPackageSelectRow,
  buildCommunityPayoutOrderPreviewEmbed,
  buildCommunityPayoutOrderPreviewRow,
  buildCommunityTicketErrorEmbed,
  buildCommunityTicketSuccessEmbed,
  buildCommunityUsernameNotFoundEmbed,
  buildCommunityValidationErrorEmbed,
  buildCommunityWaitingEmbed,
  createCommunityErrorEmbed,
  sessionToCommunityPayoutEmbedData,
} from "../../../utils/embeds/community-payout.embed";
import {
  guardCommunityPayoutEligibleRole,
  guardCommunityPayoutOrderAvailable,
} from "../../../utils/community-payout-guard";
import { replyEmbedEphemeral } from "../../../utils/reply";
import {
  buildCommunityCheckUsernameModal,
  buildCommunityOrderUsernameModal,
  buildCommunityDmConfirmUsernameModal,
  extractCommunityModalUsername,
  isCommunitySessionId,
} from "./community.modal";
import { buildActiveTicketWarningEmbed, buildBulkChoiceRow } from "../../../utils/embeds/bulk-ticket.embed";
import { logger } from "../../../../shared/logger";
import type { RobloxUserLookupResult } from "../../../services/roblox.service";

const pendingRobloxUsers = new Map<string, RobloxUserLookupResult>();

function pendingKey(guildId: string, userId: string): string {
  return `${guildId}:${userId}`;
}

async function acknowledgePreviewInteraction(interaction: ButtonInteraction): Promise<void> {
  if (interaction.deferred || interaction.replied) {
    return;
  }

  await interaction.deferUpdate();
}

async function editPreviewInteraction(
  interaction: ButtonInteraction,
  payload: InteractionEditReplyOptions,
): Promise<void> {
  await interaction.editReply(payload);
}

async function ensureEligibleRoleForUser(guildId: string, userId: string, client: ButtonInteraction["client"]): Promise<void> {
  const guild = client.guilds.cache.get(guildId) ?? (await client.guilds.fetch(guildId).catch(() => null));

  if (!guild) {
    return;
  }

  try {
    const member = await guild.members.fetch(userId);

    if (!member.roles.cache.has(COMMUNITY_PAYOUT_ELIGIBLE_ROLE_ID)) {
      await member.roles.add(COMMUNITY_PAYOUT_ELIGIBLE_ROLE_ID);
    }
  } catch (error) {
    logger.warn(`[COMMUNITY PAYOUT] Failed to assign eligible role for ${userId}`);
    logger.error("[COMMUNITY PAYOUT] Role assign detail", error);
  }
}

async function ensureEligibleRole(interaction: ButtonInteraction): Promise<void> {
  if (!interaction.inGuild()) {
    return;
  }

  await ensureEligibleRoleForUser(interaction.guild!.id, interaction.user.id, interaction.client);
}

export async function handleCommunityButton(
  interaction: ButtonInteraction,
  parsed: ParsedCustomId,
): Promise<void> {
  if (!interaction.inGuild() || !interaction.guild) {
    await replyEmbedEphemeral(
      interaction,
      createCommunityErrorEmbed("❌ TERJADI KESALAHAN", "Interaksi ini hanya tersedia di dalam server."),
    );
    return;
  }

  switch (parsed.action) {
    case "join": {
      await interaction.deferReply({ flags: MessageFlags.Ephemeral });
      
      try {
        await interaction.user.send({
          embeds: [buildCommunityDmConfirmationEmbed()],
          components: [buildCommunityDmConfirmationRow()]
        });

        await interaction.editReply({
          embeds: [createCommunityErrorEmbed("✅ DM TERKIRIM", "Silakan periksa DM kamu untuk melakukan konfirmasi membership.")
            .setColor(0x00FF00)
            .setTitle("✅ DM TERKIRIM")]
        });
      } catch (error) {
        await interaction.editReply({
          embeds: [createCommunityErrorEmbed("❌ DM TIDAK DAPAT DIKIRIM", "Silakan aktifkan Direct Message dari server ini lalu coba kembali.")],
        });
      }
      return;
    }

    case "check": {
      await interaction.deferReply({ flags: MessageFlags.Ephemeral });

      try {
        const result = await communityMembershipService.checkAndProcessEligibility(
          interaction.client,
          interaction.guild.id,
          interaction.user.id
        );

        if (!result.robloxUsername) {
          await interaction.editReply({
            embeds: [createCommunityErrorEmbed("❌ DATA BELUM DITEMUKAN", "Silakan join Community terlebih dahulu dan lakukan konfirmasi membership melalui DM.")],
          });
          return;
        }

        if (result.status === "eligible") {
          await ensureEligibleRole(interaction);
          await interaction.editReply({ embeds: [buildCommunityEligibleEmbed(result)] });
          return;
        }

        if (result.status === "waiting") {
          await interaction.editReply({ embeds: [buildCommunityWaitingEmbed(result)] });
          return;
        }

        await interaction.editReply({ embeds: [buildCommunityNotEligibleEmbed(result)] });
      } catch (error) {
        logger.error("[COMMUNITY PAYOUT] Check eligibility failed", error);
        await interaction.editReply({
          embeds: [createCommunityErrorEmbed("❌ TERJADI KESALAHAN", "Gagal mengecek eligibility.")],
        });
      }

      return;
    }

    case "order": {
      if (!(await guardCommunityPayoutOrderAvailable(interaction, interaction.guild.id))) {
        return;
      }

      if (!(await guardCommunityPayoutEligibleRole(interaction))) {
        return;
      }

      await interaction.showModal(buildCommunityOrderUsernameModal());
      return;
    }

    case "edit": {
      if (!(await guardCommunityPayoutOrderAvailable(interaction, interaction.guild.id))) {
        return;
      }

      if (!parsed.id) {
        await interaction.showModal(buildCommunityOrderUsernameModal());
        return;
      }

      const session = await communityPayoutOrderSessionService.getSession(parsed.id);

      if (!session) {
        await replyEmbedEphemeral(
          interaction,
          createCommunityErrorEmbed("❌ TERJADI KESALAHAN", "Sesi pesanan tidak ditemukan."),
        );
        return;
      }

      const usability = communityPayoutOrderSessionService.assertSessionUsable(
        session,
        interaction.user.id,
      );

      if (usability !== "ok") {
        await replyEmbedEphemeral(
          interaction,
          createCommunityErrorEmbed("❌ TERJADI KESALAHAN", "Sesi pesanan tidak dapat diedit."),
        );
        return;
      }

      await interaction.reply({
        embeds: [buildCommunityPackageSelectEmbed()],
        components: [buildCommunityPackageSelectRow(session.sessionId)],
        flags: MessageFlags.Ephemeral,
      });
      return;
    }

    case "cancel": {
      if (!parsed.id) {
        return;
      }

      await acknowledgePreviewInteraction(interaction);

      const session = await communityPayoutOrderSessionService.getSession(parsed.id);

      if (!session || session.userId !== interaction.user.id) {
        await editPreviewInteraction(interaction, {
          embeds: [createCommunityErrorEmbed("❌ TERJADI KESALAHAN", "Sesi pesanan tidak ditemukan.")],
        });
        return;
      }

      await communityPayoutOrderSessionService.cancelSession(session.sessionId);

      await editPreviewInteraction(interaction, {
        embeds: [buildCommunityOrderCancelledEmbed(session.orderCode)],
        components: [buildCommunityPayoutOrderPreviewRow(session.sessionId, true)],
      });
      return;
    }

    case "confirm": {
      if (!(await guardCommunityPayoutOrderAvailable(interaction, interaction.guild.id))) {
        return;
      }

      if (!(await guardCommunityPayoutEligibleRole(interaction))) {
        return;
      }

      if (!parsed.id) {
        return;
      }

      await acknowledgePreviewInteraction(interaction);

      const session = await communityPayoutOrderSessionService.getSession(parsed.id);

      if (!session || session.userId !== interaction.user.id) {
        await editPreviewInteraction(interaction, {
          embeds: [createCommunityErrorEmbed("❌ TERJADI KESALAHAN", "Sesi pesanan tidak ditemukan.")],
        });
        return;
      }

      const usability = communityPayoutOrderSessionService.assertSessionUsable(
        session,
        interaction.user.id,
      );

      if (usability === "expired") {
        await editPreviewInteraction(interaction, {
          embeds: [buildCommunityOrderExpiredEmbed()],
          components: [buildCommunityPayoutOrderPreviewRow(session.sessionId, true)],
        });
        return;
      }

      if (usability !== "ok") {
        await editPreviewInteraction(interaction, {
          embeds: [createCommunityErrorEmbed("❌ TERJADI KESALAHAN", "Sesi pesanan tidak dapat dikonfirmasi.")],
        });
        return;
      }

      const openTicket = await ticketService.findOpenTicketByUser(session.guildId, session.userId);

      if (openTicket) {
        await editPreviewInteraction(interaction, {
          embeds: [buildActiveTicketWarningEmbed(openTicket, ProductType.COMMUNITY_PAYOUT)],
          components: [buildBulkChoiceRow(session.sessionId)],
        });
        return;
      }

      const config = await guildConfigService.getOrCreateGuildConfig(
        interaction.guild.id,
        interaction.guild.name,
      );

      try {
        const confirmedSession = await communityPayoutOrderSessionService.confirmSession(session.sessionId);

        if (!confirmedSession) {
          await editPreviewInteraction(interaction, {
            embeds: [createCommunityErrorEmbed("❌ TERJADI KESALAHAN", "Gagal mengonfirmasi pesanan.")],
          });
          return;
        }

        const ticket = await ticketService.createCommunityPayoutTicket(
          interaction.guild,
          config,
          confirmedSession,
          interaction.user.id,
        );

        await editPreviewInteraction(interaction, {
          embeds: [buildCommunityTicketSuccessEmbed(confirmedSession.orderCode, ticket.channelId)],
          components: [buildCommunityPayoutOrderPreviewRow(confirmedSession.sessionId, true)],
        });

        logger.order(
          `Community Payout order ${confirmedSession.orderCode} confirmed by ${interaction.user.tag} → ticket ${ticket.ticketId}`,
        );
      } catch (error) {
        if (error instanceof TicketError) {
          await editPreviewInteraction(interaction, {
            embeds: [buildCommunityTicketErrorEmbed(error.code)],
          });
          return;
        }

        logger.error("[COMMUNITY PAYOUT] Confirm failed", error);
        await editPreviewInteraction(interaction, {
          embeds: [createCommunityErrorEmbed("❌ TERJADI KESALAHAN", "Gagal membuat ticket Community Payout.")],
        });
      }

      return;
    }

    default:
      return;
  }
}

export async function handleCommunitySelectMenu(
  interaction: StringSelectMenuInteraction,
  parsed: ParsedCustomId,
): Promise<void> {
  if (parsed.action === "dm_select") {
    const communityId = interaction.values[0];
    if (!communityId) return;

    await interaction.showModal(buildCommunityDmConfirmUsernameModal(communityId));
    return;
  }

  if (!interaction.inGuild() || !interaction.guild || parsed.action !== "package") {
    return;
  }

  if (!(await guardCommunityPayoutOrderAvailable(interaction, interaction.guild.id))) {
    return;
  }

  if (!(await guardCommunityPayoutEligibleRole(interaction))) {
    return;
  }

  const robuxAmount = parseCommunityPayoutPackageAmount(interaction.values[0] ?? "");

  if (robuxAmount === null) {
    await replyEmbedEphemeral(interaction, buildCommunityValidationErrorEmbed("Paket Robux tidak valid."));
    return;
  }

  let sessionId: string | undefined;

  if (parsed.id && isCommunitySessionId(parsed.id)) {
    sessionId = parsed.id;
    const existingSession = await communityPayoutOrderSessionService.getSession(sessionId);

    if (!existingSession || existingSession.userId !== interaction.user.id) {
      await interaction.update({
        embeds: [createCommunityErrorEmbed("❌ TERJADI KESALAHAN", "Sesi pesanan tidak ditemukan.")],
        components: [],
      });
      return;
    }

    const payload = {
      guildId: interaction.guild.id,
      userId: interaction.user.id,
      robuxAmount,
      robloxUser: {
        userId: existingSession.robloxUserId,
        username: existingSession.robloxUsername,
        displayName: existingSession.robloxDisplayName,
        avatarUrl: existingSession.robloxAvatarUrl,
      },
    };

    const session = await communityPayoutOrderSessionService.updateSession(sessionId, payload);

    if (!session) {
      await interaction.update({
        embeds: [createCommunityErrorEmbed("❌ TERJADI KESALAHAN", "Gagal memperbarui pesanan.")],
        components: [],
      });
      return;
    }

    await interaction.update({
      embeds: [
        buildCommunityPayoutOrderPreviewEmbed(
          sessionToCommunityPayoutEmbedData(session, `<@${interaction.user.id}>`),
        ),
      ],
      components: [buildCommunityPayoutOrderPreviewRow(session.sessionId)],
    });

    return;
  }

  const robloxUser = pendingRobloxUsers.get(pendingKey(interaction.guild.id, interaction.user.id));

  if (!robloxUser) {
    await interaction.update({
      embeds: [
        createCommunityErrorEmbed(
          "❌ TERJADI KESALAHAN",
          "Sesi order tidak ditemukan. Silakan mulai order dari awal.",
        ),
      ],
      components: [],
    });
    return;
  }

  const session = await communityPayoutOrderSessionService.createSession({
    guildId: interaction.guild.id,
    userId: interaction.user.id,
    robuxAmount,
    robloxUser,
  });

  pendingRobloxUsers.delete(pendingKey(interaction.guild.id, interaction.user.id));

  await interaction.update({
    embeds: [
      buildCommunityPayoutOrderPreviewEmbed(
        sessionToCommunityPayoutEmbedData(session, `<@${interaction.user.id}>`),
      ),
    ],
    components: [buildCommunityPayoutOrderPreviewRow(session.sessionId)],
  });
}

export async function handleCommunityModal(
  interaction: ModalSubmitInteraction,
  parsed: ParsedCustomId,
): Promise<void> {
  const robloxUsername = extractCommunityModalUsername(interaction);
  const validationError = validateCommunityPayoutUsernameInput(robloxUsername);

  if (validationError) {
    await replyEmbedEphemeral(interaction, buildCommunityValidationErrorEmbed(validationError));
    return;
  }

  if (parsed.action === "dm_submit") {
    const communityId = parsed.id;
    if (!communityId) return;

    await interaction.deferReply({ flags: MessageFlags.Ephemeral });

    try {
      // Find the guild for the user to store their membership context.
      // Assuming user interacts with the bot on 1 server.
      // If multiple, this will just pick the first mutual one.
      const guilds = [...interaction.client.guilds.cache.values()];
      const guild = guilds.find(g => g.members.cache.has(interaction.user.id)) ?? guilds[0];

      if (!guild) {
        await interaction.editReply({
          embeds: [createCommunityErrorEmbed("❌ TERJADI KESALAHAN", "Bot tidak dapat menemukan server kamu.")]
        });
        return;
      }

      // Check if already confirmed
      const existing = await robloxCommunityMembershipRepository.findByDiscordUserAndCommunity(
        interaction.user.id,
        guild.id,
        communityId
      );

      const communityIndex = COMMUNITY_PAYOUT_GROUP_IDS.findIndex(id => id.toString() === communityId);
      const communityName = `Community ${communityIndex + 1}`;

      if (existing) {
        // Update username if they input a different one, but keep timer.
        if (existing.robloxUsername !== robloxUsername) {
          existing.robloxUsername = robloxUsername;
          await existing.save();
        }

        const formatter = new Intl.DateTimeFormat("id-ID", {
          day: "2-digit", month: "long", year: "numeric", hour: "2-digit", minute: "2-digit", timeZone: "Asia/Jakarta"
        });
        
        await interaction.editReply({
          embeds: [
            createCommunityErrorEmbed("ℹ️ COMMUNITY SUDAH DIKONFIRMASI", `${communityName} sudah tercatat sejak:\n\n**${formatter.format(existing.confirmedAt)} WIB**`)
              .setColor(0x3498db)
              .setTitle("ℹ️ COMMUNITY SUDAH DIKONFIRMASI")
          ]
        });
        return;
      }

      // New confirmation
      await communityMembershipService.confirmCommunityMembership(
        interaction.user.id,
        guild.id,
        robloxUsername,
        communityId,
        communityName
      );

      await interaction.editReply({
        embeds: [
          createCommunityErrorEmbed("✅ BERHASIL DIKONFIRMASI", `Kamu berhasil mencatat konfirmasi untuk **${communityName}** dengan username **${robloxUsername}**.\n\nMasa tunggu 14 hari dimulai dari sekarang.`)
            .setColor(0x00FF00)
            .setTitle("✅ BERHASIL DIKONFIRMASI")
        ]
      });

    } catch (error) {
      logger.error("[COMMUNITY PAYOUT] DM confirm modal failed", error);
      await interaction.editReply({
        embeds: [createCommunityErrorEmbed("❌ TERJADI KESALAHAN", "Gagal menyimpan konfirmasi.")]
      });
    }

    return;
  }

  if (!interaction.inGuild() || !interaction.guild) {
    await replyEmbedEphemeral(
      interaction,
      createCommunityErrorEmbed("❌ TERJADI KESALAHAN", "Interaksi ini hanya tersedia di dalam server."),
    );
    return;
  }

  if (parsed.action === "order-submit") {
    if (!(await guardCommunityPayoutOrderAvailable(interaction, interaction.guild.id))) {
      return;
    }

    if (!(await guardCommunityPayoutEligibleRole(interaction))) {
      return;
    }

    await interaction.deferReply({ flags: MessageFlags.Ephemeral });

    try {
      const robloxUser = await lookupRobloxUser(robloxUsername);

      if (parsed.id && isCommunitySessionId(parsed.id)) {
        const existingSession = await communityPayoutOrderSessionService.getSession(parsed.id);

        if (!existingSession || existingSession.userId !== interaction.user.id) {
          await interaction.editReply({
            embeds: [createCommunityErrorEmbed("❌ TERJADI KESALAHAN", "Sesi pesanan tidak ditemukan.")],
          });
          return;
        }

        await communityPayoutOrderSessionService.updateSession(parsed.id, {
          guildId: interaction.guild.id,
          userId: interaction.user.id,
          robuxAmount: existingSession.robuxAmount,
          robloxUser,
        });

        await interaction.editReply({
          embeds: [buildCommunityPackageSelectEmbed()],
          components: [buildCommunityPackageSelectRow(parsed.id)],
        });
        return;
      }

      pendingRobloxUsers.set(pendingKey(interaction.guild.id, interaction.user.id), robloxUser);

      await interaction.editReply({
        embeds: [buildCommunityPackageSelectEmbed()],
        components: [buildCommunityPackageSelectRow()],
      });
    } catch (error) {
      if (error instanceof RobloxUserNotFoundError) {
        await interaction.editReply({ embeds: [buildCommunityUsernameNotFoundEmbed(error.username)] });
        return;
      }

      logger.error("[COMMUNITY PAYOUT] Order username modal failed", error);
      await interaction.editReply({
        embeds: [createCommunityErrorEmbed("❌ TERJADI KESALAHAN", "Gagal memvalidasi username Roblox.")],
      });
    }
  }
}
