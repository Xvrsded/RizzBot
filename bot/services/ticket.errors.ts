export type TicketErrorCode =
  | "TICKET_CATEGORY_NOT_CONFIGURED"
  | "TICKET_CATEGORY_NOT_FOUND"
  | "TICKET_CATEGORY_INVALID"
  | "TICKET_CREATE_FAILED"
  | "TICKET_PERMISSION_DENIED"
  | "TICKET_ALREADY_COMPLETED"
  | "TICKET_PAYMENT_NOT_PAID";

export class TicketError extends Error {
  constructor(
    public readonly code: TicketErrorCode,
    message: string,
    public readonly cause?: unknown,
  ) {
    super(message);
    this.name = "TicketError";
  }
}
