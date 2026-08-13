import { env } from "../config/env";
import { connectMongoDB, disconnectMongoDB, MongoConnectionError } from "../database/mongodb";
import "./interactions/handlers";
import { createClient } from "./client";
import { loadCommands } from "./loaders/command.loader";
import { loadEvents } from "./loaders/event.loader";
import { setupGlobalErrorHandlers } from "./utils/errorHandler";
import { logger } from "./utils/logger";

let isShuttingDown = false;

async function shutdown(signal: string): Promise<void> {
  if (isShuttingDown) {
    return;
  }

  isShuttingDown = true;
  logger.info(`Received ${signal}, shutting down gracefully...`);

  try {
    client.destroy();
    logger.discord("Discord client destroyed");
  } catch (error) {
    logger.error("Error destroying Discord client", error);
  }

  try {
    await disconnectMongoDB();
  } catch (error) {
    logger.error("Error during MongoDB disconnect", error);
  }

  logger.info("Shutdown complete");
  process.exit(0);
}

setupGlobalErrorHandlers();

const client = createClient();

async function startBot(): Promise<void> {
  logger.info("Starting RizzBot...");

  try {
    await connectMongoDB();
    await loadCommands(client, { strict: true });
    await loadEvents(client);

    logger.discord("Logging into Discord...");
    await client.login(env.DISCORD_TOKEN);
  } catch (error) {
    if (error instanceof MongoConnectionError) {
      logger.error("Failed to start RizzBot — MongoDB is required");
    } else {
      logger.error("Failed to start RizzBot", error);
    }

    process.exit(1);
  }
}

process.on("SIGINT", () => {
  void shutdown("SIGINT");
});

process.on("SIGTERM", () => {
  void shutdown("SIGTERM");
});

startBot().catch((error) => {
  logger.error("Unexpected startup error", error);
  process.exit(1);
});

export { client };
