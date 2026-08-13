import fs from "node:fs";
import path from "node:path";
import { Client } from "discord.js";
import { loadModule } from "../../shared/load-module";
import { logger } from "../utils/logger";

interface BotEvent {
  name: string;
  once?: boolean;
  execute: (...args: unknown[]) => Promise<void> | void;
}

function isLoadableEventFile(fileName: string): boolean {
  return (
    (fileName.endsWith(".ts") || fileName.endsWith(".js")) &&
    !fileName.endsWith(".d.ts") &&
    !fileName.endsWith(".test.ts") &&
    !fileName.endsWith(".spec.ts")
  );
}

export async function loadEvents(client: Client): Promise<void> {
  const eventsPath = path.join(__dirname, "..", "events");

  if (!fs.existsSync(eventsPath)) {
    logger.warn("Events directory not found");
    return;
  }

  const eventFiles = fs.readdirSync(eventsPath).filter(isLoadableEventFile);

  let loadedCount = 0;

  for (const file of eventFiles) {
    const filePath = path.join(eventsPath, file);
    const eventModule = await loadModule<{ default?: BotEvent } & Partial<BotEvent>>(filePath);
    const event = eventModule.default ?? eventModule;

    if (!event.name || !event.execute) {
      logger.warn(`Skipping invalid event file: ${file}`);
      continue;
    }

    const eventName = event.name;
    const eventExecute = event.execute;

    if (event.once) {
      client.once(eventName, (...args) => {
        void Promise.resolve(eventExecute(...args)).catch((error) => {
          logger.error(`Error in once event "${eventName}"`, error);
        });
      });
    } else {
      client.on(eventName, (...args) => {
        void Promise.resolve(eventExecute(...args)).catch((error) => {
          logger.error(`Error in event "${eventName}"`, error);
        });
      });
    }

    loadedCount++;
    logger.info(`Loaded event: ${eventName}${event.once ? " (once)" : ""}`);
  }

  logger.info(`Loaded ${loadedCount} event(s)`);
}
