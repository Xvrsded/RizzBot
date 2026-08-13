import { Events, type Message } from "discord.js";
import { paymentProofService } from "../services/payment-proof.service";
import { logger } from "../../shared/logger";

export default {
  name: Events.MessageCreate,
  async execute(message: Message) {
    try {
      await paymentProofService.handleTicketMessage(message);
    } catch (error) {
      logger.error("Payment proof handler error", error);
    }
  },
};
