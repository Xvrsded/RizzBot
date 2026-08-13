import type { Command } from "../types/command";

export interface CommandFileEntry {
  file: string;
  command: Partial<Command>;
}

export interface CommandValidationIssue {
  file: string;
  reason: string;
}

export interface CommandValidationResult {
  valid: Array<{ file: string; command: Command; name: string }>;
  issues: CommandValidationIssue[];
  duplicates: string[];
}

export function validateCommands(entries: CommandFileEntry[]): CommandValidationResult {
  const valid: CommandValidationResult["valid"] = [];
  const issues: CommandValidationIssue[] = [];
  const seenNames = new Map<string, string>();
  const duplicates: string[] = [];

  for (const entry of entries) {
    const { file, command } = entry;
    const baseName = file.split(/[/\\]/).pop() ?? file;

    if (!command.data) {
      issues.push({ file: baseName, reason: "missing command data (SlashCommandBuilder)" });
      continue;
    }

    if (typeof command.execute !== "function") {
      issues.push({ file: baseName, reason: "missing execute handler" });
      continue;
    }

    const name = command.data.name;

    if (!name || name.trim().length === 0) {
      issues.push({ file: baseName, reason: "command name is empty" });
      continue;
    }

    const previousFile = seenNames.get(name);

    if (previousFile) {
      duplicates.push(name);
      issues.push({
        file: baseName,
        reason: `duplicate command name "/${name}" (also defined in ${previousFile})`,
      });
      continue;
    }

    seenNames.set(name, baseName);
    valid.push({ file: baseName, command: command as Command, name });
  }

  return { valid, issues, duplicates: [...new Set(duplicates)] };
}
