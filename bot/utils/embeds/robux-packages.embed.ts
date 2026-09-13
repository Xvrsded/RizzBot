import {
  ActionRowBuilder,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
} from "discord.js";
import { buildCustomId } from "../../interactions/custom-id";
import { formatIdr } from "../pricing";
import {
  formatRobuxPackages,
  type RobuxPackage,
} from "../../../shared/robux-packages";
import { createErrorEmbed, createSuccessEmbed } from "./base.embed";

const PACKAGES_FOOTER = { text: "RizzBot • Robux Packages" };

export function buildRobuxPackagesModal(packages: readonly RobuxPackage[]): ModalBuilder {
  const packagesInput = new TextInputBuilder()
    .setCustomId("robux_packages")
    .setLabel("Paket Robux = Harga Rupiah")
    .setPlaceholder("100=15500\n200=31000\n300=46500")
    .setStyle(TextInputStyle.Paragraph)
    .setRequired(true)
    .setMaxLength(1500)
    .setValue(formatRobuxPackages(packages));

  return new ModalBuilder()
    .setCustomId(buildCustomId("dashboard", "robux-packages-save"))
    .setTitle("Robux Packages")
    .addComponents(new ActionRowBuilder<TextInputBuilder>().addComponents(packagesInput));
}

export function extractRobuxPackagesModalInput(interaction: {
  fields: { getTextInputValue: (customId: string) => string };
}): string {
  return interaction.fields.getTextInputValue("robux_packages");
}

export function buildRobuxPackagesInvalidEmbed(): ReturnType<typeof createErrorEmbed> {
  return createErrorEmbed(
    "PAKET TIDAK VALID",
    "Gunakan format satu paket per baris: jumlah Robux=harga Rupiah. Jumlah Robux tidak boleh duplikat.",
  ).setFooter(PACKAGES_FOOTER);
}

export function buildRobuxPackagesSavedEmbed(packages: readonly RobuxPackage[]): ReturnType<typeof createSuccessEmbed> {
  return createSuccessEmbed(
    "ROBUX PACKAGES UPDATED",
    [
      `Jumlah paket: **${packages.length}**`,
      "",
      packages.map((pkg) => `${pkg.robuxAmount} Robux = ${formatIdr(pkg.priceIdr)}`).join("\n"),
      "",
      "Embed, daftar pilihan order, dan ticket baru telah diperbarui.",
    ].join("\n"),
  ).setFooter(PACKAGES_FOOTER);
}
