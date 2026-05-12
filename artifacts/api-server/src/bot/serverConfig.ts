import { readFileSync, writeFileSync, mkdirSync, existsSync } from "node:fs";
import { join } from "node:path";
import { logger } from "../lib/logger.js";

export interface GuildConfig {
  customMessage?: string;
  staffRoleId?: string;      // role that manages whitelisting
  wsaUserRoleId?: string;    // role assigned on whitelist approval
  blacklistRoleId?: string;  // role that blocks users from purchasing
}

const DATA_DIR = join(process.cwd(), "data");
const DATA_FILE = join(DATA_DIR, "server-config.json");

let configs: Record<string, GuildConfig> = {};

export function loadServerConfig(): void {
  if (!existsSync(DATA_DIR)) mkdirSync(DATA_DIR, { recursive: true });
  if (existsSync(DATA_FILE)) {
    try {
      configs = JSON.parse(readFileSync(DATA_FILE, "utf-8")) as Record<string, GuildConfig>;
      logger.info({ guilds: Object.keys(configs).length }, "Server configs loaded from disk");
    } catch {
      configs = {};
    }
  }
}

function save(): void {
  if (!existsSync(DATA_DIR)) mkdirSync(DATA_DIR, { recursive: true });
  writeFileSync(DATA_FILE, JSON.stringify(configs, null, 2), "utf-8");
}

export function getGuildConfig(guildId: string): GuildConfig {
  return configs[guildId] ?? {};
}

export function setGuildConfig(guildId: string, partial: Partial<GuildConfig>): void {
  configs[guildId] = { ...configs[guildId], ...partial };
  save();
}
