import type { APIEmbedField } from "discord.js";
import { DEFAULT_GIG_PRICING, type GigPricingConfig } from "../../shared/products";
import { GIFT_PAYMENT_METHODS } from "../../shared/payment-methods";
import { formatIdr } from "./pricing";
const CODE_BLOCK = (content: string): string => `\`\`\`text\n${content}\n\`\`\``;

function padColumns(label: string, value: string, labelWidth = 12): string {
  return `${label.padEnd(labelWidth)}: ${value}`;
}

export function formatRupiah(amount: number): string {
  return formatIdr(amount);
}

export function formatGiftRecipient(username: string, displayName: string): string {
  return CODE_BLOCK(
    [padColumns("Username", username), padColumns("Display", displayName)].join("\n"),
  );
}

export function formatGiftGame(gameName: string): string {
  const trimmed = gameName.trim();
  return CODE_BLOCK(padColumns("Map", trimmed));
}

export function formatGiftGameField(gameName: string): string {
  const trimmed = gameName.trim();

  if (/^https?:\/\//i.test(trimmed)) {
    return `[Buka Link Game](${trimmed})`;
  }

  return formatGiftGame(trimmed);
}

export function formatGiftGamepass(name: string, robuxAmount: number): string {
  return CODE_BLOCK(
    [padColumns("Nama", name), padColumns("Value", `${robuxAmount.toLocaleString("id-ID")} Robux`)].join("\n"),
  );
}

export function formatGiftValue(robuxAmount: number): string {
  return CODE_BLOCK(padColumns("Robux", robuxAmount.toLocaleString("id-ID")));
}

export function formatGiftPayment(
  robuxAmount: number,
  rawPrice: number,
  finalPrice: number,
  pricing: GigPricingConfig = DEFAULT_GIG_PRICING,
): string {
  const rateLabel = `${robuxAmount} Robux × ${formatIdr(pricing.rateIdr)}`;
  const adjustment = finalPrice - rawPrice;

  const lines = [`${rateLabel.padEnd(22)}${formatIdr(rawPrice)}`];

  if (adjustment > 0) {
    lines.push(`${"Penyesuaian".padEnd(22)}+${formatIdr(adjustment)}`);
  }

  lines.push("─".repeat(28));
  lines.push(`${"TOTAL".padEnd(22)}${formatIdr(finalPrice)}`);

  return CODE_BLOCK(lines.join("\n"));
}

export function formatGiftOrderSummary(
  gamepassName: string,
  robuxAmount: number,
  finalPrice: number,
): string {
  return CODE_BLOCK(
    [
      padColumns("Gamepass", gamepassName),
      padColumns("Robux", robuxAmount.toLocaleString("id-ID")),
      padColumns("Total", formatIdr(finalPrice)),
    ].join("\n"),
  );
}

export function formatTicketCustomer(discordMention: string, username: string, displayName: string): string {
  return CODE_BLOCK(
    [
      padColumns("Discord", discordMention),
      padColumns("Roblox", username),
      padColumns("Display", displayName),
    ].join("\n"),
  );
}

export function formatTicketPaymentCustomer(username: string): string {
  return CODE_BLOCK(padColumns("Username", username));
}

export function formatTicketActiveGamepass(gamepassName: string): string {
  return CODE_BLOCK(padColumns("Gamepass", gamepassName));
}

export function formatTicketActiveRobuxValue(robuxAmount: number): string {
  return CODE_BLOCK(`${robuxAmount.toLocaleString("id-ID")} Robux`);
}

export function formatTicketActiveTotal(finalPrice: number): string {
  return CODE_BLOCK(formatIdr(finalPrice));
}

export function formatTicketGameDisplay(gameName: string): string {
  const trimmed = gameName.trim();

  if (/^https?:\/\//i.test(trimmed)) {
    return `[Buka Link Game](${trimmed})`;
  }

  return trimmed;
}

export function formatRobloxUsernameCopy(username: string): string {
  return CODE_BLOCK(username);
}

export function formatTicketPaymentNumber(number: string): string {
  return CODE_BLOCK(number);
}

export function formatTicketPaymentMethods(): string {
  return GIFT_PAYMENT_METHODS.map(({ name, number }) => `${name}\n\n${CODE_BLOCK(number)}`).join("\n\n");
}

export function buildTicketPaymentMethodFields(): APIEmbedField[] {
  return GIFT_PAYMENT_METHODS.map(({ name, number }) => ({
    name,
    value: formatTicketPaymentNumber(number),
    inline: true,
  }));
}
export function formatTicketPaymentNotes(): string {
  return [
    "• Pastikan nominal transfer sesuai dengan Total Pembayaran.",
    "• Kirim bukti pembayaran langsung di ticket ini.",
    "• Pembayaran akan diverifikasi oleh Staff.",
    "• Maksimal pembayaran QRIS adalah Rp500.000 per transaksi.",
    "• Untuk nominal di atas Rp500.000, gunakan lebih dari satu pembayaran atau metode pembayaran lain sesuai arahan Staff.",
  ].join("\n");
}

export function formatOrderCodeLabel(orderCode: string): string {
  return `Pesanan **#${orderCode}**`;
}

export function formatGameLinkMarkdown(gameName: string): string {
  const trimmed = gameName.trim();

  if (/^https?:\/\//i.test(trimmed)) {
    return `[Buka Link Game](${trimmed})`;
  }

  return trimmed;
}
