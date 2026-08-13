import { REST, Routes } from "discord.js";
import { env } from "../config/env";
import { createClient } from "../bot/client";
import { loadCommands, getAllCommands } from "../bot/loaders/command.loader";
import { logger } from "../shared/logger";

function logDeploySummary(commandNames: string[]): void {
  console.log("[COMMAND DEPLOY]");
  console.log(`Found ${commandNames.length} command(s)\n`);

  for (const name of commandNames) {
    console.log(`✓ ${name}`);
  }

  console.log("");
}

async function deployCommands(): Promise<void> {
  logger.info("Deploying slash commands...");

  const client = createClient();
  const result = await loadCommands(client, { strict: true });

  const commandNames = result.valid.map((entry) => entry.name).sort();
  logDeploySummary(commandNames);

  const commands = getAllCommands(client).map((command) => command.data.toJSON());

  if (commands.length === 0) {
    logger.warn("No commands found to deploy");
    process.exit(1);
  }

  const rest = new REST({ version: "10" }).setToken(env.DISCORD_TOKEN);

  console.log("Deploying...");

  try {
    if (env.DISCORD_GUILD_ID) {
      await rest.put(Routes.applicationGuildCommands(env.DISCORD_CLIENT_ID, env.DISCORD_GUILD_ID), {
        body: commands,
      });
      console.log(`Success — deployed ${commands.length} guild command(s) to guild ${env.DISCORD_GUILD_ID}`);
    } else {
      await rest.put(Routes.applicationCommands(env.DISCORD_CLIENT_ID), {
        body: commands,
      });
      console.log(`Success — deployed ${commands.length} global command(s)`);
    }
  } catch (error) {
    logger.error("Failed to deploy commands to Discord", error);
    process.exit(1);
  }
}

deployCommands().catch((error) => {
  logger.error("Command deployment failed", error);
  process.exit(1);
});
