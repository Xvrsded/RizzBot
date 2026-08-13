import type { APIEmbed } from "discord.js";
import { parseIdrAmount } from "../utils/pricing";

export interface ParsedTransactionLog {
  messageId: string;
  customerId: string;
  amountIdr: number;
}

export interface LeaderboardAggregation {
  customers: CustomerLeaderboardEntry[];
  totalCustomers: number;
  totalTransactions: number;
  totalRevenueIdr: number;
}

export interface CustomerLeaderboardEntry {
  customerId: string;
  totalSpentIdr: number;
  transactionCount: number;
}

const PANEL_DIVIDER = "━━━━━━━━━━━━━━━━━━━━";

function extractCustomerId(value: string): string | null {
  const match = value.match(/<@!?(\d+)>/);
  return match?.[1] ?? null;
}

function isSuccessStatus(value: string): boolean {
  const normalized = value.toLowerCase();

  if (
    normalized.includes("pending") ||
    normalized.includes("cancel") ||
    normalized.includes("fail") ||
    normalized.includes("expir")
  ) {
    return false;
  }

  return normalized.includes("success") || value.includes("🟢") || value.includes("✅");
}

function isSuccessTransactionEmbed(embed: APIEmbed): boolean {
  const title = embed.title ?? "";

  if (!/transaction completed/i.test(title)) {
    return false;
  }

  const statusField = embed.fields?.find((field) => field.name.toLowerCase().includes("status"));

  if (!statusField) {
    return false;
  }

  return isSuccessStatus(statusField.value);
}

function extractTotalAmount(embed: APIEmbed): number | null {
  const fields = embed.fields ?? [];

  for (const field of fields) {
    if (/total payment/i.test(field.name)) {
      const amount = parseIdrAmount(field.value);
      if (amount !== null) {
        return amount;
      }
    }
  }

  for (const field of fields) {
    const name = field.name.toLowerCase();

    if (name.includes("total") && !name.includes("orders") && !name.includes("robux")) {
      const amount = parseIdrAmount(field.value);
      if (amount !== null) {
        return amount;
      }
    }
  }

  return null;
}

function extractCustomerIdFromEmbed(embed: APIEmbed): string | null {
  const customerField = embed.fields?.find((field) => field.name.toLowerCase().includes("customer"));

  if (!customerField) {
    return null;
  }

  return extractCustomerId(customerField.value);
}

export function parseTransactionLogEmbed(
  messageId: string,
  embed: APIEmbed,
): ParsedTransactionLog | null {
  if (!isSuccessTransactionEmbed(embed)) {
    return null;
  }

  const customerId = extractCustomerIdFromEmbed(embed);
  const amountIdr = extractTotalAmount(embed);

  if (!customerId || amountIdr === null || amountIdr <= 0) {
    return null;
  }

  return {
    messageId,
    customerId,
    amountIdr,
  };
}

export function aggregateLeaderboard(transactions: ParsedTransactionLog[]): LeaderboardAggregation {
  const customerMap = new Map<string, CustomerLeaderboardEntry>();

  for (const transaction of transactions) {
    const existing = customerMap.get(transaction.customerId) ?? {
      customerId: transaction.customerId,
      totalSpentIdr: 0,
      transactionCount: 0,
    };

    existing.totalSpentIdr += transaction.amountIdr;
    existing.transactionCount += 1;
    customerMap.set(transaction.customerId, existing);
  }

  const customers = [...customerMap.values()].sort((a, b) => {
    if (b.totalSpentIdr !== a.totalSpentIdr) {
      return b.totalSpentIdr - a.totalSpentIdr;
    }

    return b.transactionCount - a.transactionCount;
  });

  const totalTransactions = transactions.length;
  const totalRevenueIdr = transactions.reduce((sum, transaction) => sum + transaction.amountIdr, 0);

  return {
    customers,
    totalCustomers: customers.length,
    totalTransactions,
    totalRevenueIdr,
  };
}

export { PANEL_DIVIDER };
