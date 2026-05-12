import {
  type ChatInputCommandInteraction,
  SlashCommandBuilder,
  EmbedBuilder,
  PermissionFlagsBits,
} from "discord.js";
import { getProducts, removeProduct } from "../productStore.js";

export const removeCommand = {
  data: new SlashCommandBuilder()
    .setName("remove")
    .setDescription("Remove a product from the purchase panel")
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
    .addStringOption((opt) =>
      opt
        .setName("name")
        .setDescription("Exact name of the product to remove")
        .setRequired(true)
        .setMaxLength(50)
    ),

  async execute(interaction: ChatInputCommandInteraction): Promise<void> {
    await interaction.deferReply({ ephemeral: true });

    const name = interaction.options.getString("name", true).trim();
    const products = getProducts();
    const match = products.find((p) => p.name.toLowerCase() === name.toLowerCase());

    if (!match) {
      const list = products.map((p) => `• ${p.name}`).join("\n") || "*(none)*";
      await interaction.editReply({
        embeds: [
          new EmbedBuilder()
            .setTitle("❌ Product Not Found")
            .setDescription(`No product named **${name}** was found.\n\n**Current products:**\n${list}`)
            .setColor(0xed4245),
        ],
      });
      return;
    }

    removeProduct(match.id);

    await interaction.editReply({
      embeds: [
        new EmbedBuilder()
          .setTitle("🗑️ Product Removed")
          .setDescription(
            `**${match.name}** has been removed from the purchase panel.\n\n` +
              `Run \`/setup\` to re-post the panel with the updated product list.`
          )
          .setColor(0xfee75c)
          .setTimestamp(),
      ],
    });
  },
};
