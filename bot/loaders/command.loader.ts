import fs from "node:fs";
import path from "node:path";
import { Client } from "discord.js";
import { collectModuleFiles, loadModule } from "../../shared/load-module";
import { logger } from "../utils/logger";
import type { Command } from "../types/command";
import { validateCommands, type CommandValidationResult } from "./command.validation";

export interface LoadCommandsResult extends CommandValidationResult {
  loadedCount: number;
}

export interface LoadCommandsOptions {
  /** When true, invalid or duplicate commands cause a thrown error instead of being skipped. */
  strict?: boolean;
}

function applyValidatedCommands(client: Client, result: CommandValidationResult): number {
  client.commands.clear();

  for (const entry of result.valid) {
    client.commands.set(entry.name, entry.command);
  }

  return result.valid.length;
}

function reportValidationIssues(result: CommandValidationResult, strict: boolean): void {
  for (const issue of result.issues) {
    const message = `${issue.file}: ${issue.reason}`;

    if (strict) {
      logger.error(`[COMMAND] ${message}`);
    } else {
      logger.warn(`Skipping invalid command file: ${message}`);
    }
  }
}

export async function loadCommands(
  client: Client,
  options: LoadCommandsOptions = {},
): Promise<LoadCommandsResult> {
  const strict = options.strict ?? false;
  const commandsPath = path.join(__dirname, "..", "commands");

  if (!fs.existsSync(commandsPath)) {
    const message = "Commands directory not found";
    logger.warn(message);

    if (strict) {
      throw new Error(message);
    }

    return { valid: [], issues: [], duplicates: [], loadedCount: 0 };
  }

  const commandFiles = collectModuleFiles(commandsPath);
  const entries: Array<{ file: string; command: Partial<Command> }> = [];

  for (const filePath of commandFiles) {
    const commandModule = await loadModule<{ default?: Command } & Partial<Command>>(filePath);
    const command = commandModule.default ?? commandModule;
    entries.push({ file: filePath, command });
  }

  const validation = validateCommands(entries);

  if (validation.issues.length > 0) {
    reportValidationIssues(validation, strict);

    if (strict) {
      throw new Error(
        `Command validation failed (${validation.issues.length} issue(s), ${validation.duplicates.length} duplicate name(s))`,
      );
    }
  }

  const loadedCount = applyValidatedCommands(client, validation);

  for (const entry of validation.valid) {
    logger.command(`Loaded command: /${entry.name}`);
  }

  logger.info(`Loaded ${loadedCount} command(s)`);

  return { ...validation, loadedCount };
}

export function getAllCommands(client: Client): Command[] {
  return [...client.commands.values()];
}
