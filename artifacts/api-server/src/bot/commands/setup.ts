import {
  type ChatInputCommandInteraction,
  SlashCommandBuilder,
  PermissionFlagsBits,
  type TextChannel,
} from "discord.js";
import { buildPurchasePanel, buildErrorEmbed } from "../embeds.js";
import { getProducts } from "../productStore.js";
import { setGuildConfig } from "../serverConfig.js";

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
    const products = getProducts();

    if (products.length === 0) {
      await interaction.editReply({
        embeds: [
          buildErrorEmbed(
            "No products configured yet.\n\nUse `/add name:<name> gamepassid:<id>` to add a product first."
          ),
        ],
      });
      return;
    }

    if (interaction.guildId) {
      setGuildConfig(interaction.guildId, { customMessage });
    }

    const channel = interaction.channel ?? await interaction.client.channels.fetch(interaction.channelId).catch(() => null);
    if (!channel || !channel.isTextBased()) {
      await interaction.editReply({ embeds: [buildErrorEmbed("Could not resolve the channel. Make sure I have **View Channel** permission here.")] });
      return;
    }

    const { embeds, components } = buildPurchasePanel(customMessage, products);
    await (channel as TextChannel).send({ embeds, components });

    await interaction.editReply({
      content: `✅ Purchase panel posted with **${products.length}** product(s).`,
    });
  },
};
