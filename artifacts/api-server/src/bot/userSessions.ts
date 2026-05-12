import type { RobloxUser } from "./roblox.js";

interface UserSession {
  productId: string;
  robloxUser?: RobloxUser;
}

/**
 * Ephemeral per-user session store.
 * Tracks which product a user selected and their Roblox account during the purchase flow.
 */
const sessions = new Map<string, UserSession>();

export function setSession(discordUserId: string, data: UserSession): void {
  sessions.set(discordUserId, data);
}

export function updateSession(discordUserId: string, data: Partial<UserSession>): void {
  const existing = sessions.get(discordUserId) ?? { productId: "" };
  sessions.set(discordUserId, { ...existing, ...data });
}

export function getSession(discordUserId: string): UserSession | undefined {
  return sessions.get(discordUserId);
}

export function clearSession(discordUserId: string): void {
  sessions.delete(discordUserId);
}
