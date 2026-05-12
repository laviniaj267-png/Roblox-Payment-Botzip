import {
  type ChatInputCommandInteraction,
  SlashCommandBuilder,
  PermissionFlagsBits,
  type TextChannel,
} from "discord.js";
import { buildPurchasePanel, buildErrorEmbed } from "../embeds.js";
import { getActiveProducts } from "../products.js";
import { setGuildConfig } from "../guildConfig.js";

export const setupCommand = {
  data: new SlashCommandBuilder()
    .setName("setup")
    .setDescription("Post the purchase panel in this channel")
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
    .addStringOption((opt) =>
      opt
        .setName("message")
        .setDescription("Custom message shown inside the purchase panel embed")
        .setRequired(true)
        .setMaxLength(1000)
    ),

  async execute(interaction: ChatInputCommandInteraction): Promise<void> {
    await interaction.deferReply({ ephemeral: true });

    const customMessage = interaction.options.getString("message", true);
    const products = getActiveProducts();

    if (products.length === 0) {
      await interaction.editReply({
        embeds: [
          buildErrorEmbed(
            "No products are configured yet.\n\n" +
              "Set the `GAMEPASS_MAIN_HUB` environment variable to the Roblox game pass ID and restart the bot."
          ),
        ],
      });
      return;
    }

    // Save guild config
    if (interaction.guildId) {
      setGuildConfig(interaction.guildId, { customMessage });
    }

    const channel = interaction.channel as TextChannel;
    const { embeds, components } = buildPurchasePanel(customMessage, products);
    await channel.send({ embeds, components });

    await interaction.editReply({
      content: `✅ Purchase panel posted with **${products.length}** product(s).`,
    });
  },
};
