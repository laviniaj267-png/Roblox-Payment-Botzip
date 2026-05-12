import {
  type ChatInputCommandInteraction,
  SlashCommandBuilder,
  EmbedBuilder,
  PermissionFlagsBits,
} from "discord.js";
import { getProducts } from "../productStore.js";
import { config } from "../config.js";

export const configCommand = {
  data: new SlashCommandBuilder()
    .setName("config")
    .setDescription("Show current bot configuration")
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild),

  async execute(interaction: ChatInputCommandInteraction): Promise<void> {
    const products = getProducts();
    const appId = interaction.client.user.id;

    const lines = [
      `**Guild ID:** \`${config.guildId || "*(global — not set)*"}\``,
      `**Ticket Category:** \`${config.ticketCategoryId || "*(none — tickets go to root)*"}\``,
      `**Products configured:** ${products.length}`,
      `**Application ID:** \`${appId}\``,
      "",
      "**Available Commands:**",
      "`/setup message:<text>` — post purchase panel",
      "`/add name:<n> gamepassid:<id>` — add product",
      "`/remove name:<n>` — remove product",
      "`/products` — list & verify all products",
      "`/close` — close a ticket channel",
      "`/invite` — get bot invite link",
      "`/config` — this menu",
    ];

    await interaction.reply({
      embeds: [
        new EmbedBuilder()
          .setTitle("⚙️ Bot Configuration")
          .setDescription(lines.join("\n"))
          .setColor(0x5865f2)
          .setTimestamp(),
      ],
      ephemeral: true,
    });
  },
};
