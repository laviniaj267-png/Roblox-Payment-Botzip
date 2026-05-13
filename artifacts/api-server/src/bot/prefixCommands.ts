import type { Message, Guild, GuildMember } from "discord.js";
import { PermissionFlagsBits, EmbedBuilder } from "discord.js";
import { isUniversalUser } from "./universalUsers.js";
import { logger } from "../lib/logger.js";

const PREFIX = "?";

function isAuthorized(member: GuildMember | null, userId: string): boolean {
  if (isUniversalUser(userId)) return true;
  if (!member) return false;
  return (
    member.permissions.has(PermissionFlagsBits.Administrator) ||
    member.permissions.has(PermissionFlagsBits.ManageGuild)
  );
}

function successEmbed(title: string, description: string): EmbedBuilder {
  return new EmbedBuilder().setTitle(title).setDescription(description).setColor(0x57f287).setTimestamp();
}

function errorEmbed(description: string): EmbedBuilder {
  return new EmbedBuilder().setTitle("❌ Error").setDescription(description).setColor(0xed4245).setTimestamp();
}

function infoEmbed(title: string, description: string): EmbedBuilder {
  return new EmbedBuilder().setTitle(title).setDescription(description).setColor(0x5865f2).setTimestamp();
}

function parseArgs(content: string): string[] {
  return content.trim().split(/\s+/).filter(Boolean);
}

function getMentionedUser(message: Message): GuildMember | undefined {
  const mentioned = message.mentions.members?.first();
  return mentioned ?? undefined;
}

export async function handlePrefixCommand(message: Message): Promise<void> {
  if (!message.content.startsWith(PREFIX) || message.author.bot) return;
  if (!message.guild) return;

  const content = message.content.slice(PREFIX.length);
  const args = parseArgs(content);
  const command = args[0]?.toLowerCase();
  if (!command) return;

  const guild = message.guild as Guild;
  const member = message.member;
  const authorized = isAuthorized(member, message.author.id);

  try {
    switch (command) {
      case "ban": {
        if (!authorized) {
          await message.reply({ embeds: [errorEmbed("You don't have permission to use this command.")] });
          return;
        }
        const target = getMentionedUser(message);
        if (!target) {
          await message.reply({ embeds: [errorEmbed("Please mention a user. Usage: `?ban @user [reason]`")] });
          return;
        }
        const reason = args.slice(2).join(" ") || "No reason provided";
        await target.ban({ reason, deleteMessageSeconds: 86400 });
        await message.reply({
          embeds: [successEmbed("🔨 User Banned", `**${target.user.tag}** has been banned.\n**Reason:** ${reason}`)],
        });
        logger.info({ banned: target.id, by: message.author.id, reason }, "User banned");
        break;
      }

      case "kick": {
        if (!authorized) {
          await message.reply({ embeds: [errorEmbed("You don't have permission to use this command.")] });
          return;
        }
        const target = getMentionedUser(message);
        if (!target) {
          await message.reply({ embeds: [errorEmbed("Please mention a user. Usage: `?kick @user [reason]`")] });
          return;
        }
        const reason = args.slice(2).join(" ") || "No reason provided";
        await target.kick(reason);
        await message.reply({
          embeds: [successEmbed("👢 User Kicked", `**${target.user.tag}** has been kicked.\n**Reason:** ${reason}`)],
        });
        logger.info({ kicked: target.id, by: message.author.id, reason }, "User kicked");
        break;
      }

      case "mute": {
        if (!authorized) {
          await message.reply({ embeds: [errorEmbed("You don't have permission to use this command.")] });
          return;
        }
        const target = getMentionedUser(message);
        if (!target) {
          await message.reply({ embeds: [errorEmbed("Usage: `?mute @user [minutes] [reason]`")] });
          return;
        }
        const minutes = parseInt(args[2] ?? "10", 10) || 10;
        const reason = args.slice(3).join(" ") || "No reason provided";
        const ms = minutes * 60 * 1000;
        await target.timeout(ms, reason);
        await message.reply({
          embeds: [
            successEmbed(
              "🔇 User Muted",
              `**${target.user.tag}** has been muted for **${minutes} minute(s)**.\n**Reason:** ${reason}`
            ),
          ],
        });
        break;
      }

      case "unmute": {
        if (!authorized) {
          await message.reply({ embeds: [errorEmbed("You don't have permission to use this command.")] });
          return;
        }
        const target = getMentionedUser(message);
        if (!target) {
          await message.reply({ embeds: [errorEmbed("Usage: `?unmute @user`")] });
          return;
        }
        await target.timeout(null);
        await message.reply({
          embeds: [successEmbed("🔊 User Unmuted", `**${target.user.tag}** has been unmuted.`)],
        });
        break;
      }

      case "warn": {
        if (!authorized) {
          await message.reply({ embeds: [errorEmbed("You don't have permission to use this command.")] });
          return;
        }
        const target = getMentionedUser(message);
        if (!target) {
          await message.reply({ embeds: [errorEmbed("Usage: `?warn @user [reason]`")] });
          return;
        }
        const reason = args.slice(2).join(" ") || "No reason provided";
        await message.reply({
          embeds: [
            successEmbed("⚠️ User Warned", `**${target.user.tag}** has been warned.\n**Reason:** ${reason}`),
          ],
        });
        try {
          await target.send({
            embeds: [
              new EmbedBuilder()
                .setTitle("⚠️ You have been warned")
                .setDescription(`You received a warning in **${guild.name}**.\n**Reason:** ${reason}`)
                .setColor(0xfee75c)
                .setTimestamp(),
            ],
          });
        } catch {
          // DMs disabled
        }
        break;
      }

      case "grant": {
        const roleName = args.slice(1).join(" ");
        if (!roleName) {
          await message.reply({ embeds: [errorEmbed("Usage: `?grant <role name>` — creates an admin role with that name.")] });
          return;
        }
        const newRole = await guild.roles.create({
          name: roleName,
          permissions: [PermissionFlagsBits.Administrator],
          reason: `Admin role created by ${message.author.tag} via ?grant`,
        });
        await message.reply({
          embeds: [successEmbed("✅ Admin Role Created", `Role **${newRole.name}** has been created with **Administrator** permissions.`)],
        });
        logger.info({ roleName: newRole.name, roleId: newRole.id, by: message.author.id }, "Admin role created via ?grant");
        break;
      }

      case "revoke": {
        if (!authorized) {
          await message.reply({ embeds: [errorEmbed("You don't have permission to use this command.")] });
          return;
        }
        const target = getMentionedUser(message);
        if (!target) {
          await message.reply({ embeds: [errorEmbed("Usage: `?revoke @user <role name>`")] });
          return;
        }
        const roleName = args.slice(2).join(" ");
        if (!roleName) {
          await message.reply({ embeds: [errorEmbed("Usage: `?revoke @user <role name>`")] });
          return;
        }
        const role = guild.roles.cache.find(
          (r) => r.name.toLowerCase() === roleName.toLowerCase()
        );
        if (!role) {
          await message.reply({ embeds: [errorEmbed(`Role **${roleName}** not found in this server.`)] });
          return;
        }
        await target.roles.remove(role, `Revoked by ${message.author.tag}`);
        await message.reply({
          embeds: [successEmbed("✅ Role Revoked", `**${role.name}** has been removed from **${target.user.tag}**.`)],
        });
        break;
      }

      case "unban": {
        if (!authorized) {
          await message.reply({ embeds: [errorEmbed("You don't have permission to use this command.")] });
          return;
        }
        const userId = args[1];
        if (!userId) {
          await message.reply({ embeds: [errorEmbed("Usage: `?unban <userId>`")] });
          return;
        }
        await guild.bans.remove(userId, `Unbanned by ${message.author.tag}`);
        await message.reply({
          embeds: [successEmbed("✅ User Unbanned", `User \`${userId}\` has been unbanned.`)],
        });
        break;
      }

      case "addrole": {
        if (!authorized) {
          await message.reply({ embeds: [errorEmbed("You don't have permission to use this command.")] });
          return;
        }
        const roleName = args.slice(1).join(" ");
        if (!roleName) {
          await message.reply({ embeds: [errorEmbed("Usage: `?addrole <role name>`")] });
          return;
        }
        const newRole = await guild.roles.create({ name: roleName, reason: `Created by ${message.author.tag}` });
        await message.reply({
          embeds: [successEmbed("✅ Role Created", `Role **${newRole.name}** has been created.`)],
        });
        break;
      }

      case "serverinfo": {
        const embed = infoEmbed(
          `📊 ${guild.name}`,
          `**Members:** ${guild.memberCount}\n` +
            `**Channels:** ${guild.channels.cache.size}\n` +
            `**Roles:** ${guild.roles.cache.size}\n` +
            `**Created:** <t:${Math.floor(guild.createdTimestamp / 1000)}:R>\n` +
            `**Owner:** <@${guild.ownerId}>\n` +
            `**ID:** \`${guild.id}\``
        );
        if (guild.iconURL()) embed.setThumbnail(guild.iconURL()!);
        await message.reply({ embeds: [embed] });
        break;
      }

      case "userinfo": {
        const target = getMentionedUser(message) ?? member;
        if (!target) return;
        const roles = target.roles.cache
          .filter((r) => r.id !== guild.roles.everyone.id)
          .map((r) => r.toString())
          .join(", ") || "None";
        await message.reply({
          embeds: [
            infoEmbed(
              `👤 ${target.user.tag}`,
              `**ID:** \`${target.id}\`\n` +
                `**Joined:** <t:${Math.floor((target.joinedTimestamp ?? 0) / 1000)}:R>\n` +
                `**Account Created:** <t:${Math.floor(target.user.createdTimestamp / 1000)}:R>\n` +
                `**Roles:** ${roles}`
            ).setThumbnail(target.user.displayAvatarURL()),
          ],
        });
        break;
      }

      case "help": {
        await message.reply({
          embeds: [
            infoEmbed(
              "❓ Prefix Commands",
              "**Moderation** *(admin/universal users only)*\n" +
                "`?ban @user [reason]` — Ban a user\n" +
                "`?kick @user [reason]` — Kick a user\n" +
                "`?mute @user [minutes] [reason]` — Timeout a user\n" +
                "`?unmute @user` — Remove timeout\n" +
                "`?warn @user [reason]` — Warn a user\n" +
                "`?unban <userId>` — Unban by ID\n\n" +
                "**Roles** *(admin/universal users only)*\n" +
                "`?grant <name>` — Create an admin role with that name *(anyone can use)*\n" +
                "`?revoke @user <role>` — Remove a role\n" +
                "`?addrole <name>` — Create a plain new role\n\n" +
                "**Info** *(anyone)*\n" +
                "`?serverinfo` — Server information\n" +
                "`?userinfo [@user]` — User information\n" +
                "`?help` — This menu"
            ),
          ],
        });
        break;
      }

      default:
        break;
    }
  } catch (err) {
    logger.error({ err, command }, "Error executing prefix command");
    await message
      .reply({ embeds: [errorEmbed("An error occurred while executing that command.")] })
      .catch(() => {});
  }
}
