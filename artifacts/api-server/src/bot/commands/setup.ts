import {
  type ChatInputCommandInteraction,
  SlashCommandBuilder,
  PermissionFlagsBits,
} from "discord.js";
import { buildPurchasePanel } from "../embeds.js";
import { getGamePassInfo } from "../roblox.js";
import { config } from "../config.js";
import { buildErrorEmbed } from "../embeds.js";

export const setupCommand = {
  data: new SlashCommandBuilder()
    .setName("setup")
    .setDescription("Post the purchase panel in this channel")
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild),

  async execute(interaction: ChatInputCommandInteraction): Promise<void> {
    await interaction.deferReply({ ephemeral: true });

    const gpInfo = await getGamePassInfo(config.robloxGamePassId);
    if (!gpInfo) {
      await interaction.editReply({
        embeds: [buildErrorEmbed(
          `Could not fetch game pass info for ID **${config.robloxGamePassId}**.\n` +
          `Please verify the \`ROBLOX_GAME_PASS_ID\` environment variable is correct.`
        )],
      });
      return;
    }

    const { embeds, components } = buildPurchasePanel(gpInfo.name, gpInfo.price);
    await interaction.channel!.send({ embeds, components });
    await interaction.editReply({ content: "✅ Purchase panel posted successfully!" });
  },
};
