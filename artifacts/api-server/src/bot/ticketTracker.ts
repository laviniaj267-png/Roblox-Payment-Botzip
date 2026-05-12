import type { TextChannel, Client, Guild } from "discord.js";
import { checkGamePassOwnership, getGamePassInfo } from "./roblox.js";
import {
  buildVerificationSuccessEmbed,
  buildOrderConfirmedDmEmbed,
} from "./embeds.js";
import type { RobloxUser } from "./roblox.js";
import type { Product } from "./productStore.js";
import { releaseTicket } from "./activeTickets.js";
import { createWhitelistChannel } from "./whitelistTracker.js";
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

  let attempts = 0;

  const intervalId = setInterval(async () => {
    attempts++;
    try {
      const owns = await checkGamePassOwnership(robloxUser.id, product.gamePassId);

      if (owns) {
        clearInterval(intervalId);
        pendingTickets.delete(key);
        releaseTicket(robloxUser.id);

        const gpInfo = await getGamePassInfo(product.gamePassId);
        const finalPrice = gpInfo?.price ?? gamePassPrice;

        // 1. Post success embed in ticket channel
        await channel.send({
          content: `<@${discordUserId}>`,
          embeds: [buildVerificationSuccessEmbed(discordUserId, robloxUser, product, gamePassName, orderId)],
        });

        // 2. DM user with order confirmation
        try {
          const discordUser = await client.users.fetch(discordUserId);
          await discordUser.send({
            embeds: [buildOrderConfirmedDmEmbed(robloxUser, product, gamePassName, finalPrice, orderId)],
          });
        } catch {
          logger.warn({ discordUserId }, "Could not DM user order confirmation (DMs disabled)");
          await channel.send(
            `⚠️ <@${discordUserId}> Could not send your confirmation DM — please enable DMs from server members. ` +
              `Your Order ID: \`${orderId}\``
          );
        }

        // 3. Create whitelist channel for staff approval
        await createWhitelistChannel(client, guild, {
          discordUserId,
          robloxUser,
          product,
          gamePassName,
          orderId,
          guildId: guild.id,
        });

        // 4. Auto-close ticket after 60s
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
        releaseTicket(robloxUser.id);
        await channel.send(
          `⏰ <@${discordUserId}> Verification timed out after 20 minutes.\n` +
            `If you purchased the game pass, contact staff with Order ID: \`${orderId}\`.`
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
