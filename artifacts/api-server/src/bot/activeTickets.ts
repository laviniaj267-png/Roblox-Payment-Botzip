import { randomBytes } from "node:crypto";

/**
 * Tracks active open tickets by discordUserId + productId.
 * Allows the same user to buy multiple different products simultaneously,
 * but prevents duplicate open tickets for the exact same user + product combo.
 */
const activeTickets = new Map<string, string>(); // `${discordId}_${productId}` → channelId

function key(discordUserId: string, productId: string): string {
  return `${discordUserId}_${productId}`;
}

export function registerTicket(discordUserId: string, productId: string, channelId: string): void {
  activeTickets.set(key(discordUserId, productId), channelId);
}

export function hasActiveTicket(discordUserId: string, productId: string): string | undefined {
  return activeTickets.get(key(discordUserId, productId));
}

export function releaseTicket(discordUserId: string, productId: string): void {
  activeTickets.delete(key(discordUserId, productId));
}

export function generateOrderId(): string {
  return "NEXXI-" + randomBytes(4).toString("hex").toUpperCase();
}

export function activeTicketCount(): number {
  return activeTickets.size;
}
