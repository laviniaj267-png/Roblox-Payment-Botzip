import type { TextChannel, Client } from "discord.js";
import {
  checkGamePassOwnership,
} from "./roblox.js";
import {
  buildVerificationSuccessEmbed,
} from "./embeds.js";
import { config } from "./config.js";
import type { RobloxUser } from "./roblox.js";
import { logger } from "../lib/logger.js";

interface PendingTicket {
  robloxUser: RobloxUser;
  channel: TextChannel;
  discordUserId: string;
  intervalId: ReturnType<typeof setInterval>;
  attempts: number;
}

const MAX_ATTEMPTS = 40; // ~20 minutes at 30s intervals
const POLL_INTERVAL_MS = 30_000;

const pendingTickets = new Map<string, PendingTicket>();

export function startVerificationPolling(
  client: Client,
  channel: TextChannel,
  robloxUser: RobloxUser,
  discordUserId: string
): void {
  const key = `${channel.id}_${robloxUser.id}`;

  if (pendingTickets.has(key)) {
    clearInterval(pendingTickets.get(key)!.intervalId);
  }

  let attempts = 0;

  const intervalId = setInterval(async () => {
    attempts++;
    try {
      const owns = await checkGamePassOwnership(robloxUser.id, config.robloxGamePassId);

      if (owns) {
        clearInterval(intervalId);
        pendingTickets.delete(key);

        await channel.send({
          content: `<@${discordUserId}>`,
          embeds: [buildVerificationSuccessEmbed(robloxUser, "Game Pass")],
        });

        // Archive ticket channel after 60s
        setTimeout(async () => {
          try {
            await channel.send("✅ This ticket will be closed in 10 seconds.");
            setTimeout(() => channel.delete("Purchase verified - auto-closing").catch(() => {}), 10_000);
          } catch {
            // Channel may already be deleted
          }
        }, 60_000);

        logger.info({ userId: robloxUser.id, channelId: channel.id }, "Game pass verified");
        return;
      }

      if (attempts >= MAX_ATTEMPTS) {
        clearInterval(intervalId);
        pendingTickets.delete(key);
        await channel.send(
          `⏰ <@${discordUserId}> Verification timed out after 20 minutes. ` +
          `If you purchased the game pass, please contact support.`
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
    intervalId,
    attempts,
  });
}
