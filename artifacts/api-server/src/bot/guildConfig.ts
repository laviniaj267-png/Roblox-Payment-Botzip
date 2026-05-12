/**
 * In-memory per-guild configuration.
 * Stores the active game pass ID set via /setup.
 */
const guildGamePassIds = new Map<string, string>();

export function setGuildGamePassId(guildId: string, gamePassId: string): void {
  guildGamePassIds.set(guildId, gamePassId);
}

export function getGuildGamePassId(guildId: string): string | undefined {
  return guildGamePassIds.get(guildId);
}
