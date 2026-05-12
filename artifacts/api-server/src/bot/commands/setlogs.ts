import {
  type ChatInputCommandInteraction,
  SlashCommandBuilder,
  PermissionFlagsBits,
  ChannelType,
  EmbedBuilder,
} from "discord.js";
import { setGuildConfig } from "../serverConfig.js";

export const setLogsCommand = {
  data: new SlashCommandBuilder()
    .setName("setlogs")
    .setDescription("Set the channel where purchase and verification logs are posted")
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
    .addChannelOption((opt) =>
      opt
        .setName("channel")
        .setDescription("The logs channel")
        .addChannelTypes(ChannelType.GuildText)
        .setRequired(true)
    ),

  async execute(interaction: ChatInputCommandInteraction): Promise<void> {
    const channel = interaction.options.getChannel("channel", true);
    setGuildConfig(interaction.guildId!, { logsChannelId: channel.id });
    await interaction.reply({
      embeds: [
        new EmbedBuilder()
          .setTitle("✅ Logs Channel Set")
          .setDescription(`All purchase and verification events will be logged in <#${channel.id}>.`)
          .setColor(0x57f287)
          .setTimestamp(),
      ],
      ephemeral: true,
    });
  },
};
