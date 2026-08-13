import { EmbedBuilder } from "discord.js";
import { createBaseEmbed, createErrorEmbed, EMBED_COLORS } from "./base.embed";
import { formatIdr } from "../pricing";
import type { CustomerTierSyncResult } from "../../services/customer-tier.service";
import { CUSTOMER_TIERS } from "../../services/customer-tier.service";

export function buildSyncTierSuccessEmbed(
  customerMention: string,
  result: CustomerTierSyncResult,
): EmbedBuilder {
  const allTiers = CUSTOMER_TIERS;
  const milestoneLines = allTiers.map((tier) => {
    const hasTier = result.addedRoles.some((r) => r.roleId === tier.roleId) ||
                    result.alreadyHasRoles.some((r) => r.roleId === tier.roleId);
    return `${hasTier ? "✅" : "❌"} ${tier.label}`;
  });

  return createBaseEmbed("🏆 CUSTOMER TIER SYNC", EMBED_COLORS.success)
    .setDescription(
      [
        "**Customer:**",
        customerMention,
        "",
        "**Total Belanja:**",
        formatIdr(result.totalSpentIdr),
        "",
        "**Milestone:**",
        ...milestoneLines,
        "",
        "**Status:**",
        "SYNCED",
      ].join("\n"),
    );
}

export function buildSyncTierFailedEmbed(): EmbedBuilder {
  return createErrorEmbed(
    "❌ SINKRONISASI GAGAL",
    "Gagal menyinkronkan data tier customer. Silakan cek error log.",
  );
}

export function buildSyncTierAccessDeniedEmbed(): EmbedBuilder {
  return createErrorEmbed(
    "⛔ AKSES DITOLAK",
    "Command ini hanya dapat digunakan oleh admin RizzStore.",
  );
}
