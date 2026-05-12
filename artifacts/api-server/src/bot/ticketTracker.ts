import { type TextChannel, type Client, type Guild, EmbedBuilder, ChannelType } from "discord.js";
import { checkGamePassOwnership, getGamePassInfo } from "./roblox.js";
import {
  buildVerificationSuccessEmbed,
  buildOrderConfirmedDmEmbed,
} from "./embeds.js";
import type { RobloxUser } from "./roblox.js";
import type { Product } from "./productStore.js";
import { releaseTicket } from "./activeTickets.js";
import { createWhitelistChannel } from "./whitelistTracker.js";
import { linkAccount } from "./linkedAccounts.js";
import { getGuildConfig } from "./serverConfig.js";
import { logger } from "../lib/logger.js";

const MAX_ATTEMPTS = 40;
const POLL_INTERVAL_MS = 30_000;

interface PendingTicket {
  robloxUser: RobloxUser;
  channel: TextChannel;
  guild: Guild;
  discordUserId: string;
  product: Product;
  gamePassName: string;
  gamePassPrice: number;
  orderId: string;
  intervalId: ReturnType<typeof setInterval>;
}

const pendingTickets = new Map<string, PendingTicket>();

async function postLog(client: Client, guildId: string, embed: EmbedBuilder): Promise<void> {
  const { logsChannelId } = getGuildConfig(guildId);
  if (!logsChannelId) return;
  try {
    const ch = await client.channels.fetch(logsChannelId);
    if (ch && ch.type === ChannelType.GuildText) {
      await (ch as TextChannel).send({ embeds: [embed] });
    }
  } catch {
    // logs channel deleted or bot missing perms — silent
  }
}

export function startVerificationPolling(
  client: Client,
  channel: TextChannel,
  guild: Guild,
  robloxUser: RobloxUser,
  discordUserId: string,
  product: Product,
  gamePassName: string,
  gamePassPrice: number,
  orderId: string
): void {
  const key = `${channel.id}_${robloxUser.id}`;

  const existing = pendingTickets.get(key);
  if (existing) clearInterval(existing.intervalId);

  // Post ticket opened log
  void postLog(client, guild.id, new EmbedBuilder()
    .setTitle("🎫 Ticket Opened")
    .addFields(
      { name: "Discord", value: `<@${discordUserId}>`, inline: true },
      { name: "Roblox", value: `${robloxUser.name} (${robloxUser.id})`, inline: true },
      { name: "Product", value: product.name, inline: true },
      { name: "Order ID", value: `\`${orderId}\``, inline: true },
      { name: "Channel", value: `<#${channel.id}>`, inline: true },
    )
    .setColor(0x5865f2)
    .setTimestamp()
  );

  let attempts = 0;

  const intervalId = setInterval(async () => {
    attempts++;
    try {
      const owns = await checkGamePassOwnership(robloxUser.id, product.gamePassId);

      if (owns) {
        clearInterval(intervalId);
        pendingTickets.delete(key);
        releaseTicket(discordUserId, product.id);

        const gpInfo = await getGamePassInfo(product.gamePassId);
        const finalPrice = gpInfo?.price ?? gamePassPrice;

        // 1. Link Roblox account to Discord ID permanently
        linkAccount(discordUserId, robloxUser.id, robloxUser.name);

        // 2. Assign Roblox Verified role
        const { robloxVerifiedRoleId } = getGuildConfig(guild.id);
        if (robloxVerifiedRoleId) {
          try {
            const member = await guild.members.fetch(discordUserId);
            await member.roles.add(robloxVerifiedRoleId, `Roblox verified — ${orderId}`);
          } catch (err) {
            logger.warn({ err }, "Could not assign Roblox Verified role");
          }
        }

        // 3. Post success embed in ticket channel
        await channel.send({
          content: `<@${discordUserId}>`,
          embeds: [buildVerificationSuccessEmbed(discordUserId, robloxUser, product, gamePassName, orderId)],
        });

        // 4. DM user with order confirmation
        try {
          const discordUser = await client.users.fetch(discordUserId);
          await discordUser.send({
            embeds: [buildOrderConfirmedDmEmbed(robloxUser, product, gamePassName, finalPrice, orderId)],
          });
        } catch {
          logger.warn({ discordUserId }, "Could not DM user order confirmation (DMs disabled)");
          await channel.send(
            `⚠️ <@${discordUserId}> Could not send your confirmation DM — enable DMs from server members.\n` +
              `Your Order ID: \`${orderId}\``
          );
        }

        // 5. Create whitelist channel for staff approval
        await createWhitelistChannel(client, guild, {
          discordUserId,
          robloxUser,
          product,
          gamePassName,
          orderId,
          guildId: guild.id,
        });

        // 6. Post verification log
        void postLog(client, guild.id, new EmbedBuilder()
          .setTitle("✅ Purchase Verified")
          .addFields(
            { name: "Discord", value: `<@${discordUserId}>`, inline: true },
            { name: "Roblox", value: `${robloxUser.name} (${robloxUser.id})`, inline: true },
            { name: "Product", value: product.name, inline: true },
            { name: "Price", value: `${finalPrice} Robux`, inline: true },
            { name: "Order ID", value: `\`${orderId}\``, inline: true },
          )
          .setColor(0x57f287)
          .setTimestamp()
        );

        // 7. Auto-close ticket after 60s
        setTimeout(async () => {
          try {
            await channel.send("🔒 This ticket will close in 10 seconds.");
            setTimeout(() => channel.delete("Purchase verified — auto-closing").catch(() => {}), 10_000);
          } catch {
            // already gone
          }
        }, 60_000);

        logger.info(
          { robloxUserId: robloxUser.id, channelId: channel.id, product: product.id, orderId },
          "Game pass verified, whitelist channel created"
        );
        return;
      }

      if (attempts >= MAX_ATTEMPTS) {
        clearInterval(intervalId);
        pendingTickets.delete(key);
        releaseTicket(discordUserId, product.id);

        await channel.send(
          `⏰ <@${discordUserId}> Verification timed out after 20 minutes.\n` +
            `If you purchased the game pass, contact staff with Order ID: \`${orderId}\`.`
        );

        void postLog(client, guild.id, new EmbedBuilder()
          .setTitle("⏰ Verification Timed Out")
          .addFields(
            { name: "Discord", value: `<@${discordUserId}>`, inline: true },
            { name: "Roblox", value: `${robloxUser.name} (${robloxUser.id})`, inline: true },
            { name: "Product", value: product.name, inline: true },
            { name: "Order ID", value: `\`${orderId}\``, inline: true },
          )
          .setColor(0xed4245)
          .setTimestamp()
        );
      }
    } catch (err) {
      logger.error({ err }, "Error during game pass verification poll");
    }
  }, POLL_INTERVAL_MS);

  pendingTickets.set(key, {
    robloxUser,
    channel,
    guild,
    discordUserId,
    product,
    gamePassName,
    gamePassPrice,
    orderId,
    intervalId,
  });
}
