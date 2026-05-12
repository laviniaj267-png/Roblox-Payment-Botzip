import {
  type ChatInputCommandInteraction,
  SlashCommandBuilder,
  PermissionFlagsBits,
  type TextChannel,
} from "discord.js";
import { buildPurchasePanel, buildErrorEmbed } from "../embeds.js";
import { getGamePassInfo } from "../roblox.js";
import { setGuildGamePassId } from "../guildConfig.js";

export const setupCommand = {
  data: new SlashCommandBuilder()
    .setName("setup")
    .setDescription("Post the purchase panel for a Roblox game pass")
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
    .addStringOption((opt) =>
      opt
        .setName("gamepassid")
        .setDescription("The numeric Roblox game pass ID (e.g. 12345678)")
        .setRequired(true)
    ),

  async execute(interaction: ChatInputCommandInteraction): Promise<void> {
    await interaction.deferReply({ ephemeral: true });

    const gamePassId = interaction.options.getString("gamepassid", true).trim();

    if (!/^\d+$/.test(gamePassId)) {
      await interaction.editReply({
        embeds: [buildErrorEmbed("Game pass ID must be numeric. You can find it in the game pass URL on Roblox.")],
      });
      return;
    }

    const gpInfo = await getGamePassInfo(gamePassId);
    if (!gpInfo) {
      await interaction.editReply({
        embeds: [
          buildErrorEmbed(
            `Could not find a game pass with ID **${gamePassId}**.\n` +
              `Please check the ID and make sure the game pass is public.`
          ),
        ],
      });
      return;
    }

    // Save the game pass ID for this guild
    if (interaction.guildId) {
      setGuildGamePassId(interaction.guildId, gamePassId);
    }

    const channel = interaction.channel as TextChannel;
    const { embeds, components } = buildPurchasePanel(gpInfo.name, gpInfo.price, gamePassId);
    await channel.send({ embeds, components });
    await interaction.editReply({
      content: `✅ Purchase panel posted for **${gpInfo.name}** (${gpInfo.price} Robux).`,
    });
  },
};
