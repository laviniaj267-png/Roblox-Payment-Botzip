/**
 * In-memory per-guild configuration set via /setup.
 */
interface GuildConfig {
  customMessage: string;
}

const guildConfigs = new Map<string, GuildConfig>();

export function setGuildConfig(guildId: string, config: GuildConfig): void {
  guildConfigs.set(guildId, config);
}

export function getGuildConfig(guildId: string): GuildConfig | undefined {
  return guildConfigs.get(guildId);
}
