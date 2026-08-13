import { Events, type Interaction } from "discord.js";
import { routeInteraction } from "../interactions/router";

export default {
  name: Events.InteractionCreate,
  async execute(interaction: Interaction) {
    await routeInteraction(interaction);
  },
};
