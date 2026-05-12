import type { TextChannel, Client } from "discord.js";
import { checkGamePassOwnership, getGamePassInfo } from "./roblox.js";
import { buildVerificationSuccessEmbed, buildOrderConfirmedDmEmbed } from "./embeds.js";
import type { RobloxUser } from "./roblox.js";
import type { Product } from "./productStore.js";
import { releaseTicket } from "./activeTickets.js";
import { logger } from "../lib/logger.js";

const MAX_ATTEMPTS = 40; // ~20 minutes at 30s intervals
const POLL_INTERVAL_MS = 30_000;

interface PendingTicket {
  robloxUser: RobloxUser;
  channel: TextChannel;
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

        // Fetch latest price info for the DM
        const gpInfo = await getGamePassInfo(product.gamePassId);
        const finalPrice = gpInfo?.price ?? gamePassPrice;

        // Send success embed in channel
        await channel.send({
          content: `<@${discordUserId}>`,
          embeds: [buildVerificationSuccessEmbed(discordUserId, robloxUser, product, gamePassName, orderId)],
        });

        // DM the user their order confirmation
        try {
          const discordUser = await client.users.fetch(discordUserId);
          await discordUser.send({
            embeds: [buildOrderConfirmedDmEmbed(robloxUser, product, gamePassName, finalPrice, orderId)],
          });
        } catch {
          // User may have DMs disabled — log and continue
          logger.warn({ discordUserId }, "Could not DM user order confirmation (DMs may be disabled)");
          await channel.send(
            `⚠️ <@${discordUserId}> Could not send your confirmation DM — please enable DMs from server members. ` +
              `Your Order ID is \`${orderId}\`.`
          );
        }

        // Auto-close after 60s
        setTimeout(async () => {
          try {
            await channel.send("🔒 This ticket will close in 10 seconds.");
            setTimeout(() => channel.delete("Purchase verified — auto-closing").catch(() => {}), 10_000);
          } catch {
            // Channel may already be gone
          }
        }, 60_000);

        logger.info(
          { robloxUserId: robloxUser.id, channelId: channel.id, product: product.id, orderId },
          "Game pass verified, order confirmed"
        );
        return;
      }

      if (attempts >= MAX_ATTEMPTS) {
        clearInterval(intervalId);
        pendingTickets.delete(key);
        releaseTicket(robloxUser.id);
        await channel.send(
          `⏰ <@${discordUserId}> Verification timed out after 20 minutes.\n` +
            `If you did purchase the game pass, please contact a staff member with your Order ID: \`${orderId}\`.`
        );
      }
    } catch (err) {
      logger.error({ err }, "Error during game pass verification poll");
    }
  }, POLL_INTERVAL_MS);

  pendingTickets.set(key, {
    robloxUser,
    channel,
    discordUserId,
    product,
    gamePassName,
    gamePassPrice,
    orderId,
    intervalId,
  });
}
