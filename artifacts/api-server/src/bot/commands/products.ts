import {
  type ChatInputCommandInteraction,
  SlashCommandBuilder,
  EmbedBuilder,
  PermissionFlagsBits,
} from "discord.js";
import { getProducts } from "../productStore.js";
import { getGamePassInfo } from "../roblox.js";

export const productsCommand = {
  data: new SlashCommandBuilder()
    .setName("products")
    .setDescription("List all configured products and verify their Roblox game passes")
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild),

  async execute(interaction: ChatInputCommandInteraction): Promise<void> {
    await interaction.deferReply({ ephemeral: true });

    const products = getProducts();

    if (products.length === 0) {
      await interaction.editReply({
        embeds: [
          new EmbedBuilder()
            .setTitle("📦 No Products Configured")
            .setDescription("Use `/add` to add a product to the purchase panel.")
            .setColor(0xfee75c),
        ],
      });
      return;
    }

    // Verify each game pass via Roblox API in parallel
    const verified = await Promise.all(
      products.map(async (p) => {
        const info = await getGamePassInfo(p.gamePassId);
        return { product: p, info };
      })
    );

    const lines = verified.map(({ product, info }) => {
      const url = `https://www.roblox.com/game-pass/${product.gamePassId}`;
      if (info) {
        return (
          `**${product.name}** ✅\n` +
          `> [${info.name}](${url}) — ${info.price} Robux\n` +
          `> ID: \`${product.gamePassId}\``
        );
      }
      return (
        `**${product.name}** ⚠️ *(game pass not found — ID may be wrong)*\n` +
        `> ID: \`${product.gamePassId}\``
      );
    });

    await interaction.editReply({
      embeds: [
        new EmbedBuilder()
          .setTitle(`📦 Products (${products.length})`)
          .setDescription(lines.join("\n\n"))
          .setColor(0x5865f2)
          .setFooter({ text: "✅ = verified via Roblox API  •  ⚠️ = not found" })
          .setTimestamp(),
      ],
    });
  },
};
