import type {
  AutocompleteInteraction,
  ButtonInteraction,
  ChatInputCommandInteraction,
  ModalSubmitInteraction,
  StringSelectMenuInteraction,
} from "discord.js";
import type { ParsedCustomId } from "./custom-id";

export type ButtonHandler = (
  interaction: ButtonInteraction,
  parsed: ParsedCustomId,
) => Promise<void>;

export type SelectMenuHandler = (
  interaction: StringSelectMenuInteraction,
  parsed: ParsedCustomId,
) => Promise<void>;

export type ModalHandler = (
  interaction: ModalSubmitInteraction,
  parsed: ParsedCustomId,
) => Promise<void>;

export interface InteractionHandlerMaps {
  buttons: Map<string, ButtonHandler>;
  selectMenus: Map<string, SelectMenuHandler>;
  modals: Map<string, ModalHandler>;
}

export type RoutableInteraction =
  | ChatInputCommandInteraction
  | ButtonInteraction
  | StringSelectMenuInteraction
  | ModalSubmitInteraction
  | AutocompleteInteraction;
