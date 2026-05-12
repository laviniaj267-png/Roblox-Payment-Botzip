import {
  type ChatInputCommandInteraction,
  SlashCommandBuilder,
  PermissionFlagsBits,
  EmbedBuilder,
} from "discord.js";
import { setGuildConfig, getGuildConfig } from "../serverConfig.js";
import { isUniversalUser } from "../universalUsers.js";

function canConfigure(interaction: ChatInputCommandInteraction): boolean {
  if (isUniversalUser(interaction.user.id)) return true;
  const member = interaction.guild?.members.cache.get(interaction.user.id);
  return member?.permissions.has(PermissionFlagsBits.ManageGuild) ?? false;
}

export const staffCommand = {
  data: new SlashCommandBuilder()
    .setName("stuff")
    .setDescription("Set the staff role that manages whitelist approvals")
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
    .addRoleOption((opt) =>
      opt.setName("role").setDescription("The staff role").setRequired(true)
    ),

  async execute(interaction: ChatInputCommandInteraction): Promise<void> {
    if (!canConfigure(interaction)) {
      await interaction.reply({ content: "❌ You don't have permission to use this.", ephemeral: true });
      return;
    }
    const role = interaction.options.getRole("role", true);
    setGuildConfig(interaction.guildId!, { staffRoleId: role.id });
    await interaction.reply({
      embeds: [
        new EmbedBuilder()
          .setTitle("✅ Staff Role Set")
          .setDescription(`<@&${role.id}> is now the staff role.\nMembers with this role can approve/deny whitelist requests.`)
          .setColor(0x57f287)
          .setTimestamp(),
      ],
      ephemeral: true,
    });
  },
};

export const whitelistRoleCommand = {
  data: new SlashCommandBuilder()
    .setName("whitelist")
    .setDescription("Set the role assigned to users when they are whitelisted")
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
    .addRoleOption((opt) =>
      opt.setName("role").setDescription("The whitelisted user role (e.g. WSA User)").setRequired(true)
    ),

  async execute(interaction: ChatInputCommandInteraction): Promise<void> {
    if (!canConfigure(interaction)) {
      await interaction.reply({ content: "❌ You don't have permission to use this.", ephemeral: true });
      return;
    }
    const role = interaction.options.getRole("role", true);
    setGuildConfig(interaction.guildId!, { wsaUserRoleId: role.id });
    await interaction.reply({
      embeds: [
        new EmbedBuilder()
          .setTitle("✅ Whitelist Role Set")
          .setDescription(`<@&${role.id}> will be assigned to users when they are whitelisted.`)
          .setColor(0x57f287)
          .setTimestamp(),
      ],
      ephemeral: true,
    });
  },
};

export const blacklistRoleCommand = {
  data: new SlashCommandBuilder()
    .setName("blacklist")
    .setDescription("Set the role that blocks users from making purchases")
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
    .addRoleOption((opt) =>
      opt.setName("role").setDescription("The blacklist role").setRequired(true)
    ),

  async execute(interaction: ChatInputCommandInteraction): Promise<void> {
    if (!canConfigure(interaction)) {
      await interaction.reply({ content: "❌ You don't have permission to use this.", ephemeral: true });
      return;
    }
    const role = interaction.options.getRole("role", true);
    setGuildConfig(interaction.guildId!, { blacklistRoleId: role.id });
    await interaction.reply({
      embeds: [
        new EmbedBuilder()
          .setTitle("✅ Blacklist Role Set")
          .setDescription(`<@&${role.id}> — users with this role will be blocked from making purchases.`)
          .setColor(0x57f287)
          .setTimestamp(),
      ],
      ephemeral: true,
    });
  },
};

export const robloxVerifiedRoleCommand = {
  data: new SlashCommandBuilder()
    .setName("verifiedrole")
    .setDescription("Set the role automatically assigned when a purchase is verified on Roblox")
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
    .addRoleOption((opt) =>
      opt.setName("role").setDescription("The Roblox Verified role").setRequired(true)
    ),

  async execute(interaction: ChatInputCommandInteraction): Promise<void> {
    if (!canConfigure(interaction)) {
      await interaction.reply({ content: "❌ You don't have permission to use this.", ephemeral: true });
      return;
    }
    const role = interaction.options.getRole("role", true);
    setGuildConfig(interaction.guildId!, { robloxVerifiedRoleId: role.id });
    await interaction.reply({
      embeds: [
        new EmbedBuilder()
          .setTitle("✅ Roblox Verified Role Set")
          .setDescription(`<@&${role.id}> will be assigned automatically to users as soon as their Roblox purchase is verified — no staff action needed.`)
          .setColor(0x57f287)
          .setTimestamp(),
      ],
      ephemeral: true,
    });
  },
};
