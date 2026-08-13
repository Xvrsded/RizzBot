import path from "node:path";
import { AttachmentBuilder } from "discord.js";

export const TICKET_QR_ATTACHMENT_NAME = "Qr.png";

const ticketQrPath = path.join(process.cwd(), "Public", TICKET_QR_ATTACHMENT_NAME);

export function buildTicketQrAttachment(): AttachmentBuilder {
  return new AttachmentBuilder(ticketQrPath, { name: TICKET_QR_ATTACHMENT_NAME });
}

export function getTicketQrImageUrl(): `attachment://${string}` {
  return `attachment://${TICKET_QR_ATTACHMENT_NAME}`;
}
