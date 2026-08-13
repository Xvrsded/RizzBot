import { ChannelType } from "discord.js";
import { env } from "../config/env";
import { connectMongoDB, disconnectMongoDB } from "../database/mongodb";
import { ticketRepository } from "../database/repositories/ticket.repository";
import { createClient } from "../bot/client";
import { logger } from "../shared/logger";

const TICKET_CHANNEL_PREFIXES = ["gig-", "gift-"];

function isTicketChannelName(name: string): boolean {
  return TICKET_CHANNEL_PREFIXES.some((prefix) => name.startsWith(prefix));
}

async function closeAllTickets(): Promise<void> {
  await connectMongoDB();

  const client = createClient();

  try {
    await client.login(env.DISCORD_TOKEN);

    const guildId = env.DISCORD_GUILD_ID;

    if (!guildId) {
      throw new Error("DISCORD_GUILD_ID is required to close tickets.");
    }

    const guild = await client.guilds.fetch(guildId);
    await guild.channels.fetch();

    const openTickets = await ticketRepository.findAllActive();
    let closedCount = 0;
    let deletedChannels = 0;

    logger.info(`Found ${openTickets.length} open ticket(s) in database.`);

    for (const ticket of openTickets) {
      const channel = guild.channels.cache.get(ticket.channelId);

      if (channel?.isTextBased() && !channel.isDMBased()) {
        await channel.delete(`Closing ticket ${ticket.orderCode}`).catch((error) => {
          logger.error(`Failed to delete channel ${ticket.channelId} for ${ticket.orderCode}`, error);
        });
        deletedChannels += 1;
      }

      await ticketRepository.closeByTicketId(ticket.ticketId);
      closedCount += 1;
      logger.info(`Closed ticket ${ticket.orderCode} (${ticket.ticketId})`);
    }

    const orphanChannels = guild.channels.cache.filter(
      (channel) =>
        channel.type === ChannelType.GuildText &&
        isTicketChannelName(channel.name) &&
        !openTickets.some((ticket) => ticket.channelId === channel.id),
    );

    for (const channel of orphanChannels.values()) {
      if (!channel.isTextBased() || channel.isDMBased()) {
        continue;
      }

      await channel.delete("Closing orphan ticket channel").catch((error) => {
        logger.error(`Failed to delete orphan channel ${channel.id} (${channel.name})`, error);
      });
      deletedChannels += 1;
      logger.info(`Deleted orphan ticket channel ${channel.name}`);
    }

    console.log("");
    console.log("[CLOSE TICKETS] Done");
    console.log(`- Tickets marked CLOSED: ${closedCount}`);
    console.log(`- Discord channels deleted: ${deletedChannels}`);
    console.log(`- Orphan channels removed: ${orphanChannels.size}`);
  } finally {
    client.destroy();
    await disconnectMongoDB();
  }
}

closeAllTickets().catch((error) => {
  logger.error("Failed to close tickets", error);
  process.exit(1);
});
