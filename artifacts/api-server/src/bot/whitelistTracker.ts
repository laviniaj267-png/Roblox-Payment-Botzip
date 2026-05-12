import {
  type Client,
  type TextChannel,
  type Guild,
  type OverwriteResolvable,
  ChannelType,
  PermissionFlagsBits,
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
} from "discord.js";
import type { RobloxUser } from "./roblox.js";
import type { Product } from "./productStore.js";
import { getGuildConfig } from "./serverConfig.js";
import { logger } from "../lib/logger.js";

export interface PendingWhitelistEntry {
  discordUserId: string;
  robloxUser: RobloxUser;
  product: Product;
  gamePassName: string;
  orderId: string;
  guildId: string;
}

/** channelId → pending whitelist entry */
export const pendingWhitelists = new Map<string, PendingWhitelistEntry>();

export async function createWhitelistChannel(
  client: Client,
  guild: Guild,
  entry: PendingWhitelistEntry
): Promise<void> {
  const { discordUserId, robloxUser, product, gamePassName, orderId } = entry;
  const guildCfg = getGuildConfig(guild.id);
  const me = guild.members.me;
  if (!me) return;

  const channelName = `whitelist-${robloxUser.name.toLowerCase().replace(/[^a-z0-9]/g, "-").slice(0, 20)}`;

  const overrides: OverwriteResolvable[] = [
    { id: guild.roles.everyone, deny: [PermissionFlagsBits.ViewChannel] },
    {
      id: discordUserId,
      allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.ReadMessageHistory],
      deny: [PermissionFlagsBits.SendMessages],
    },
    {
      id: me.id,
      allow: [
        PermissionFlagsBits.ViewChannel,
        PermissionFlagsBits.SendMessages,
        PermissionFlagsBits.ManageChannels,
        PermissionFlagsBits.ReadMessageHistory,
      ],
    },
  ];

  if (guildCfg.staffRoleId) {
    overrides.push({
      id: guildCfg.staffRoleId,
      allow: [
        PermissionFlagsBits.ViewChannel,
        PermissionFlagsBits.SendMessages,
        PermissionFlagsBits.ReadMessageHistory,
      ],
    });
  }

  let whitelistChannel: TextChannel;
  try {
    whitelistChannel = (await guild.channels.create({
      name: channelName,
      type: ChannelType.GuildText,
      permissionOverwrites: overrides,
    })) as TextChannel;
  } catch (err) {
    logger.error({ err }, "Failed to create whitelist channel");
    return;
  }

  pendingWhitelists.set(whitelistChannel.id, entry);

  const staffMention = guildCfg.staffRoleId ? `<@&${guildCfg.staffRoleId}>` : "@staff";
  const gamePassUrl = `https://www.roblox.com/game-pass/${product.gamePassId}`;

  const embed = new EmbedBuilder()
    .setTitle("🔔 Whitelist Request")
    .setDescription(
      `${staffMention} — a user is awaiting whitelist approval.\n\n` +
        `**Discord:** <@${discordUserId}>\n` +
        `**Roblox:** [${robloxUser.name}](https://www.roblox.com/users/${robloxUser.id}/profile) *(ID: ${robloxUser.id})*\n` +
        `**Product:** ${product.name}\n` +
        `**Game Pass:** [${gamePassName}](${gamePassUrl})\n` +
        `**Order ID:** \`${orderId}\`\n\n` +
        `Please review and approve or deny the whitelist below.`
    )
    .setThumbnail(robloxUser.avatarUrl)
    .setColor(0xfee75c)
    .setFooter({ text: `Order ${orderId}` })
    .setTimestamp();

  const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder()
      .setCustomId(`wl_approve_${discordUserId}`)
      .setLabel("Whitelisted")
      .setStyle(ButtonStyle.Success)
      .setEmoji("✅"),
    new ButtonBuilder()
      .setCustomId(`wl_deny_${discordUserId}`)
      .setLabel("Not Whitelisted")
      .setStyle(ButtonStyle.Danger)
      .setEmoji("❌")
  );

  await whitelistChannel.send({
    content: staffMention,
    embeds: [embed],
    components: [row],
  });

  logger.info({ channelId: whitelistChannel.id, robloxUser: robloxUser.name, orderId }, "Whitelist channel created");
}
