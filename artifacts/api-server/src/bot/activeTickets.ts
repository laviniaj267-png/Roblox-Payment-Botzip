import { randomBytes } from "node:crypto";

/**
 * Tracks active open tickets by Roblox user ID.
 * Prevents the same Roblox account from having multiple simultaneous tickets.
 */
const byRobloxUserId = new Map<number, string>(); // robloxUserId → channelId

export function registerTicket(robloxUserId: number, channelId: string): void {
  byRobloxUserId.set(robloxUserId, channelId);
}

export function hasActiveTicket(robloxUserId: number): string | undefined {
  return byRobloxUserId.get(robloxUserId);
}

export function releaseTicket(robloxUserId: number): void {
  byRobloxUserId.delete(robloxUserId);
}

export function generateOrderId(): string {
  return "WSA-" + randomBytes(4).toString("hex").toUpperCase();
}
