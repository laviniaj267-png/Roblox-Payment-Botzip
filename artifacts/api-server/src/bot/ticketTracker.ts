import type { TextChannel, Client } from "discord.js";
import { checkGamePassOwnership } from "./roblox.js";
import { buildVerificationSuccessEmbed } from "./embeds.js";
import type { RobloxUser } from "./roblox.js";
import { logger } from "../lib/logger.js";

const MAX_ATTEMPTS = 40; // ~20 minutes at 30s intervals
const POLL_INTERVAL_MS = 30_000;

interface PendingTicket {
  robloxUser: RobloxUser;
  channel: TextChannel;
  discordUserId: string;
  gamePassId: string;
  gamePassName: string;
  intervalId: ReturnType<typeof setInterval>;
}

const pendingTickets = new Map<string, PendingTicket>();

export function startVerificationPolling(
  _client: Client,
  channel: TextChannel,
  robloxUser: RobloxUser,
  discordUserId: string,
  gamePassId: string,
  gamePassName: string
): void {
  const key = `${channel.id}_${robloxUser.id}`;

  // Clear any existing poll for this ticket
  const existing = pendingTickets.get(key);
  if (existing) clearInterval(existing.intervalId);

  let attempts = 0;

  const intervalId = setInterval(async () => {
    attempts++;
    try {
      const owns = await checkGamePassOwnership(robloxUser.id, gamePassId);

      if (owns) {
        clearInterval(intervalId);
        pendingTickets.delete(key);

        await channel.send({
          content: `<@${discordUserId}>`,
          embeds: [buildVerificationSuccessEmbed(discordUserId, robloxUser, gamePassName)],
        });

        // Auto-close ticket after 60s
        setTimeout(async () => {
          try {
            await channel.send("✅ This ticket will close in 10 seconds.");
            setTimeout(() => channel.delete("Purchase verified — auto-closing").catch(() => {}), 10_000);
          } catch {
            // Channel may already be gone
          }
        }, 60_000);

        logger.info({ robloxUserId: robloxUser.id, channelId: channel.id }, "Game pass ownership verified");
        return;
      }

      if (attempts >= MAX_ATTEMPTS) {
        clearInterval(intervalId);
        pendingTickets.delete(key);
        await channel.send(
          `⏰ <@${discordUserId}> Verification timed out after 20 minutes. ` +
            `If you did purchase the game pass, please contact a staff member.`
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
    gamePassId,
    gamePassName,
    intervalId,
  });
}
