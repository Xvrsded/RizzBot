import { EmbedBuilder } from "discord.js";
import { formatIdr } from "../pricing";
import { formatJakartaDateTime } from "../datetime";
import { createBaseEmbed, EMBED_COLORS } from "./base.embed";
import type { GiftOrderSessionDocument } from "../../../database/models/gift-order-session.model";
import type { RobuxOrderSessionDocument } from "../../../database/models/robux-order-session.model";
import type { LoginOrderSessionDocument } from "../../../database/models/login-order-session.model";
import type { LimitedOrderSessionDocument } from "../../../database/models/limited-order-session.model";
import type { MiddlemanOrderSessionDocument } from "../../../database/models/middleman-order-session.model";
import type { CommunityPayoutOrderSessionDocument } from "../../../database/models/community-payout-order-session.model";
import type { TicketOrderItemDocument } from "../../../database/models/ticket-order-item.model";
import { ProductType } from "../../../shared/products";
import { formatVouchProductLabel } from "./vouch.embed";

export interface TransactionLogData {
  session: GiftOrderSessionDocument;
  customerMention: string;
  staffMention: string;
  completedAt: Date;
}

export interface RobuxTransactionLogData {
  session: RobuxOrderSessionDocument;
  customerMention: string;
  staffMention: string;
  completedAt: Date;
}

export interface LoginTransactionLogData {
  session: LoginOrderSessionDocument;
  customerMention: string;
  staffMention: string;
  completedAt: Date;
}

export interface BulkTransactionLogData {
  items: TicketOrderItemDocument[];
  customerMention: string;
  staffMention: string;
  completedAt: Date;
  totalRobux: number;
  totalPaymentIdr: number;
  productTypes: ProductType[];
}

export interface LimitedTransactionLogData {
  session: LimitedOrderSessionDocument;
  customerMention: string;
  staffMention: string;
  completedAt: Date;
}

export interface MiddlemanTransactionLogData {
  session: MiddlemanOrderSessionDocument;
  customerMention: string;
  staffMention: string;
  completedAt: Date;
}

export interface CommunityPayoutTransactionLogData {
  session: CommunityPayoutOrderSessionDocument;
  customerMention: string;
  staffMention: string;
  completedAt: Date;
}

export function buildGiftTransactionLogEmbed(data: TransactionLogData): EmbedBuilder {
  const { session, customerMention, staffMention, completedAt } = data;

  return createBaseEmbed("🧾 Transaction Completed", EMBED_COLORS.success)
    .setDescription("Pesanan telah berhasil diproses oleh Staff RizzBlox.")
    .addFields(
      { name: "👤 Customer", value: customerMention, inline: true },
      { name: "🧑‍💼 Staff", value: staffMention, inline: true },
      { name: "📦 Produk", value: "Gift In Game", inline: true },
      { name: "🎮 Game", value: session.gameName.trim(), inline: true },
      { name: "🎁 Gamepass", value: session.gamepassName, inline: true },
      {
        name: "💎 Jumlah",
        value: `${session.robuxAmount.toLocaleString("id-ID")} Robux`,
        inline: true,
      },
      { name: "💰 Total", value: formatIdr(session.finalPrice), inline: true },
      { name: "📌 Status", value: "🟢 Success", inline: true },
      { name: "🆔 Order ID", value: session.orderCode, inline: true },
      { name: "🕐 Waktu", value: formatJakartaDateTime(completedAt), inline: true },
    )
    .setTimestamp(completedAt)
    .setFooter({ text: "RizzBlox • Transaction Log" });
}

export function buildRobuxTransactionLogEmbed(data: RobuxTransactionLogData): EmbedBuilder {
  const { session, customerMention, staffMention, completedAt } = data;

  return createBaseEmbed("🧾 Transaction Completed", EMBED_COLORS.success)
    .setDescription("Pesanan Robux Via Username telah berhasil diproses oleh Staff RizzBlox.")
    .addFields(
      { name: "👤 Customer", value: customerMention, inline: true },
      { name: "🧑‍💼 Staff", value: staffMention, inline: true },
      { name: "📦 Produk", value: "Robux Via Username", inline: true },
      {
        name: "👤 Username Roblox",
        value: session.robloxUsername,
        inline: true,
      },
      {
        name: "💎 Jumlah",
        value: `${session.robuxAmount.toLocaleString("id-ID")} Robux`,
        inline: true,
      },
      { name: "💰 Total", value: formatIdr(session.finalPrice), inline: true },
      { name: "📌 Status", value: "🟢 Success", inline: true },
      { name: "🆔 Order ID", value: session.orderCode, inline: true },
      { name: "🕐 Waktu", value: formatJakartaDateTime(completedAt), inline: true },
    )
    .setTimestamp(completedAt)
    .setFooter({ text: "RizzBlox • Transaction Log" });
}

export function buildLoginTransactionLogEmbed(data: LoginTransactionLogData): EmbedBuilder {
  const { session, customerMention, staffMention, completedAt } = data;

  return createBaseEmbed("📄 TRANSACTION COMPLETED", EMBED_COLORS.success)
    .addFields(
      { name: "👤 CUSTOMER", value: customerMention, inline: true },
      { name: "🧑‍💼 STAFF", value: staffMention, inline: true },
      {
        name: "🎮 ROBLOX USERNAME",
        value: session.robloxUsername,
        inline: false,
      },
      { name: "🏷️ PRODUCT", value: "ROBUX VIA LOGIN", inline: true },
      {
        name: "💎 ROBUX",
        value: `${session.robuxAmount.toLocaleString("id-ID")} Robux`,
        inline: true,
      },
      { name: "💰 TOTAL", value: formatIdr(session.finalPrice), inline: true },
      { name: "📦 STATUS", value: "✅ SUCCESS", inline: true },
      { name: "🕒 TIME", value: formatJakartaDateTime(completedAt), inline: true },
    )
    .setTimestamp(completedAt)
    .setFooter({ text: "RizzBlox • Transaction Log" });
}

export function buildLimitedTransactionLogEmbed(data: LimitedTransactionLogData): EmbedBuilder {
  const { session, customerMention, staffMention, completedAt } = data;
  const total = session.price ?? 0;

  return createBaseEmbed("📄 TRANSACTION COMPLETED", EMBED_COLORS.success)
    .addFields(
      { name: "👤 CUSTOMER", value: customerMention, inline: true },
      { name: "🧑‍💼 STAFF", value: staffMention, inline: true },
      {
        name: "🎮 ROBLOX USERNAME",
        value: session.robloxUsername,
        inline: false,
      },
      { name: "💎 ITEM", value: session.itemName, inline: false },
      { name: "🏷️ PRODUCT", value: "ITEM LIMITED", inline: true },
      { name: "💰 TOTAL", value: formatIdr(total), inline: true },
      { name: "📦 STATUS", value: "✅ SUCCESS", inline: true },
      { name: "🆔 ORDER", value: session.orderCode, inline: true },
      { name: "🕒 TIME", value: formatJakartaDateTime(completedAt), inline: true },
    )
    .setTimestamp(completedAt)
    .setFooter({ text: "RizzBlox • Transaction Log" });
}

export function buildMiddlemanTransactionLogEmbed(data: MiddlemanTransactionLogData): EmbedBuilder {
  const { session, customerMention, staffMention, completedAt } = data;

  return createBaseEmbed("🤝 MIDDLEMAN TRANSACTION", EMBED_COLORS.success)
    .addFields(
      { name: "👤 Customer", value: customerMention, inline: true },
      { name: "🧑‍💼 Staff", value: staffMention, inline: true },
      { name: "💰 Nominal Transaksi", value: formatIdr(session.transactionAmountIdr), inline: false },
      { name: "🧾 Fee Middleman", value: formatIdr(session.middlemanFeeIdr), inline: true },
      { name: "💵 Total", value: formatIdr(session.finalPrice), inline: true },
      { name: "🟢 Status", value: "Success", inline: true },
      { name: "🆔 Order ID", value: session.orderCode, inline: true },
      { name: "🕐 Waktu", value: formatJakartaDateTime(completedAt), inline: true },
    )
    .setTimestamp(completedAt)
    .setFooter({ text: "RizzBlox • Transaction Log" });
}

export function buildCommunityPayoutTransactionLogEmbed(
  data: CommunityPayoutTransactionLogData,
): EmbedBuilder {
  const { session, customerMention, staffMention, completedAt } = data;

  return createBaseEmbed("💸 Transaction Completed", EMBED_COLORS.success)
    .addFields(
      { name: "Customer", value: customerMention, inline: true },
      { name: "Staff", value: staffMention, inline: true },
      { name: "Product", value: "Robux Community Payout", inline: true },
      { name: "Roblox Username", value: session.robloxUsername, inline: true },
      { name: "Robux", value: `${session.robuxAmount.toLocaleString("id-ID")} Robux`, inline: true },
      { name: "Total", value: formatIdr(session.finalPrice), inline: true },
      { name: "Status", value: "🟢 Success", inline: true },
      { name: "Order ID", value: session.orderCode, inline: true },
      { name: "Waktu", value: formatJakartaDateTime(completedAt), inline: true },
    )
    .setTimestamp(completedAt)
    .setFooter({ text: "RizzBlox • Transaction Log" });
}

export function buildBulkTransactionLogEmbed(data: BulkTransactionLogData): EmbedBuilder {
  const { items, customerMention, staffMention, completedAt, totalRobux, totalPaymentIdr, productTypes } =
    data;

  const productLabel =
    productTypes.length === 1
      ? formatVouchProductLabel(productTypes[0]!)
      : productTypes.map((type) => formatVouchProductLabel(type)).join(" • ");

  const accountsField = items
    .filter((item) => item.robuxAmount !== null)
    .map(
      (item, index) =>
        `${index + 1}. ${item.robloxUsername} — ${item.robuxAmount!.toLocaleString("id-ID")} Robux`,
    )
    .join("\n");

  const embed = createBaseEmbed("📄 TRANSACTION COMPLETED", EMBED_COLORS.success).addFields(
    { name: "👤 CUSTOMER", value: customerMention, inline: true },
    { name: "🧑‍💼 STAFF", value: staffMention, inline: true },
    { name: "🏷️ PRODUCT", value: productLabel, inline: false },
    { name: "📦 TOTAL ORDERS", value: String(items.length), inline: true },
    ...(totalRobux > 0
      ? [{ name: "💎 TOTAL ROBUX", value: `${totalRobux.toLocaleString("id-ID")} Robux`, inline: true }]
      : []),
    { name: "💰 TOTAL PAYMENT", value: formatIdr(totalPaymentIdr), inline: true },
    { name: "🆔 ORDERS", value: items.map((item) => item.orderCode).join("\n"), inline: false },
    { name: "📦 STATUS", value: "✅ SUCCESS", inline: true },
    { name: "🕒 TIME", value: formatJakartaDateTime(completedAt), inline: true },
  );

  if (accountsField) {
    embed.addFields({ name: "👤 ROBLOX ACCOUNTS", value: accountsField, inline: false });
  }

  return embed.setTimestamp(completedAt).setFooter({ text: "RizzBlox • Transaction Log" });
}
