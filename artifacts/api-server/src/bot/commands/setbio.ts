import {
  type ChatInputCommandInteraction,
  SlashCommandBuilder,
  PermissionFlagsBits,
  EmbedBuilder,
} from "discord.js";

export const setBioCommand = {
  data: new SlashCommandBuilder()
    .setName("setbio")
    .setDescription("Edit the bot's About Me bio")
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
    .addStringOption((opt) =>
      opt
        .setName("bio")
        .setDescription("The new bio text (leave empty to clear it)")
        .setRequired(false)
        .setMaxLength(190)
    ),

  async execute(interaction: ChatInputCommandInteraction): Promise<void> {
    await interaction.deferReply({ flags: 64 });

    const bio = interaction.options.getString("bio") ?? "";

    try {
      await interaction.client.application?.edit({ description: bio });
      await interaction.editReply({
        embeds: [
          new EmbedBuilder()
            .setTitle("✅ Bot Bio Updated")
            .setDescription(bio ? `New bio:\n> ${bio}` : "Bio has been cleared.")
            .setColor(0x57f287)
            .setTimestamp(),
        ],
      });
    } catch (err) {
      await interaction.editReply({
        embeds: [
          new EmbedBuilder()
            .setTitle("❌ Failed to Update Bio")
            .setDescription("Could not edit the bot's bio. Make sure the bot token has the correct application ownership.")
            .setColor(0xed4245)
            .setTimestamp(),
        ],
      });
    }
  },
};
