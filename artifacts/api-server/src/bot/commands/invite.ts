import {
  type ChatInputCommandInteraction,
  SlashCommandBuilder,
  EmbedBuilder,
  PermissionFlagsBits,
} from "discord.js";

export const inviteCommand = {
  data: new SlashCommandBuilder()
    .setName("invite")
    .setDescription("Get the bot invite link")
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild),

  async execute(interaction: ChatInputCommandInteraction): Promise<void> {
    const appId = interaction.client.user.id;
    const inviteUrl =
      `https://discord.com/api/oauth2/authorize?client_id=${appId}` +
      `&permissions=536938496&scope=bot%20applications.commands`;

    const embed = new EmbedBuilder()
      .setTitle("🔗 Invite WSA HUB")
      .setDescription(
        `Use the link below to add this bot to another server.\n\n` +
          `[**Click here to invite**](${inviteUrl})\n\n` +
          `**Required permissions:**\n` +
          `• Manage Channels *(create ticket channels)*\n` +
          `• Send Messages\n` +
          `• Read Message History\n` +
          `• View Channels`
      )
      .setColor(0x5865f2)
      .setTimestamp();

    await interaction.reply({ embeds: [embed], ephemeral: true });
  },
};
