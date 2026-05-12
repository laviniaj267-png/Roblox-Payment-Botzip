import {
  type ChatInputCommandInteraction,
  SlashCommandBuilder,
  EmbedBuilder,
  PermissionFlagsBits,
} from "discord.js";
import { addProduct } from "../productStore.js";

export const addCommand = {
  data: new SlashCommandBuilder()
    .setName("add")
    .setDescription("Add a new product to the purchase panel dropdown")
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
    .addStringOption((opt) =>
      opt
        .setName("name")
        .setDescription("Display name for this product (e.g. VIP Access)")
        .setRequired(true)
        .setMaxLength(50)
    )
    .addStringOption((opt) =>
      opt
        .setName("gamepassid")
        .setDescription("Roblox game pass ID (numeric, found in the game pass URL)")
        .setRequired(true)
    )
    .addStringOption((opt) =>
      opt
        .setName("description")
        .setDescription("Short description shown under the product in the dropdown (optional)")
        .setRequired(false)
        .setMaxLength(100)
    ),

  async execute(interaction: ChatInputCommandInteraction): Promise<void> {
    await interaction.deferReply({ ephemeral: true });

    const name = interaction.options.getString("name", true).trim();
    const gamePassId = interaction.options.getString("gamepassid", true).trim();
    const description = interaction.options.getString("description") ?? undefined;

    if (!/^\d+$/.test(gamePassId)) {
      await interaction.editReply({
        embeds: [
          new EmbedBuilder()
            .setTitle("❌ Invalid Game Pass ID")
            .setDescription("The game pass ID must be numeric. Find it in the Roblox game pass URL.")
            .setColor(0xed4245),
        ],
      });
      return;
    }

    const result = await addProduct(name, gamePassId, description);

    if ("error" in result) {
      await interaction.editReply({
        embeds: [
          new EmbedBuilder()
            .setTitle("❌ Could Not Add Product")
            .setDescription(result.error)
            .setColor(0xed4245),
        ],
      });
      return;
    }

    const { product, gpName, gpPrice, apiVerified } = result;
    const gamePassUrl = `https://www.roblox.com/game-pass/${gamePassId}`;

    const embedDescription = apiVerified
      ? `**${product.name}** has been added to the purchase panel.\n\n` +
        `**Roblox Game Pass:** [${gpName}](${gamePassUrl})\n` +
        `**Price:** ${gpPrice} Robux\n` +
        `**Game Pass ID:** \`${gamePassId}\`\n\n` +
        `Run \`/setup\` to re-post the panel with the updated product list.`
      : `**${product.name}** has been added to the purchase panel.\n\n` +
        `**Game Pass ID:** \`${gamePassId}\`\n` +
        `**Game Pass Link:** [Open on Roblox](${gamePassUrl})\n\n` +
        `⚠️ The Roblox API could not verify this game pass right now — double-check the ID is correct.\n\n` +
        `Run \`/setup\` to re-post the panel with the updated product list.`;

    await interaction.editReply({
      embeds: [
        new EmbedBuilder()
          .setTitle("✅ Product Added")
          .setDescription(embedDescription)
          .setColor(apiVerified ? 0x57f287 : 0xfee75c)
          .setTimestamp(),
      ],
    });
  },
};
