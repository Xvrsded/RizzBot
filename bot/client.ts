import { Client, Collection, GatewayIntentBits, Partials } from "discord.js";
import type { Command } from "./types/command";

export function createClient(): Client {
  const client = new Client({
    intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages],
    partials: [Partials.Channel, Partials.Message],
  });

  client.commands = new Collection<string, Command>();

  return client;
}
