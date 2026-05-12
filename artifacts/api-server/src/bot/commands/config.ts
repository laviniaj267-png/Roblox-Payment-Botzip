import {
  type ChatInputCommandInteraction,
  SlashCommandBuilder,
  EmbedBuilder,
  PermissionFlagsBits,
} from "discord.js";
import { getProducts } from "../productStore.js";
import { getGuildConfig } from "../serverConfig.js";
import { config } from "../config.js";
import { isUniversalUser } from "../universalUsers.js";

export const configCommand = {
  data: new SlashCommandBuilder()
    .setName("config")
    .setDescription("Show current bot configuration")
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild),

  async execute(interaction: ChatInputCommandInteraction): Promise<void> {
    const products = getProducts();
    const guildCfg = getGuildConfig(interaction.guildId ?? "");
    const appId = interaction.client.user.id;
    const isUniversal = isUniversalUser(interaction.user.id);

    const roleInfo = [
      `**Staff Role:** ${guildCfg.staffRoleId ? `<@&${guildCfg.staffRoleId}>` : "*(not set — use /stuff)*"}`,
      `**Whitelist Role:** ${guildCfg.wsaUserRoleId ? `<@&${guildCfg.wsaUserRoleId}>` : "*(not set — use /whitelist)*"}`,
      `**Blacklist Role:** ${guildCfg.blacklistRoleId ? `<@&${guildCfg.blacklistRoleId}>` : "*(not set — use /blacklist)*"}`,
      `**Roblox Verified Role:** ${guildCfg.robloxVerifiedRoleId ? `<@&${guildCfg.robloxVerifiedRoleId}>` : "*(not set — use /verifiedrole)*"}`,
      `**Logs Channel:** ${guildCfg.logsChannelId ? `<#${guildCfg.logsChannelId}>` : "*(not set — use /setlogs)*"}`,
    ].join("\n");

    const lines = [
      `**Application ID:** \`${appId}\``,
      `**Guild ID:** \`${config.guildId || "*(global)*"}\``,
      `**Products configured:** ${products.length}`,
      `**Your access:** ${isUniversal ? "🌐 Universal User" : "Standard"}`,
      "",
      "**Role Configuration:**",
      roleInfo,
      "",
      "**Slash Commands:**",
      "`/setup` `/add` `/remove` `/products` `/close` `/stuff` `/whitelist` `/blacklist` `/invite` `/config`",
      "",
      "**Prefix Commands (`?`):**",
      "`?ban` `?kick` `?mute` `?unmute` `?warn` `?grant` `?revoke` `?unban` `?addrole` `?serverinfo` `?userinfo` `?help`",
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
