import { readFileSync, writeFileSync, mkdirSync, existsSync } from "node:fs";
import { join } from "node:path";
import { logger } from "../lib/logger.js";

interface LinkedAccount {
  robloxId: number;
  robloxName: string;
  linkedAt: string;
}

const DATA_DIR = join(process.cwd(), "data");
const DATA_FILE = join(DATA_DIR, "linked-accounts.json");

let accounts: Record<string, LinkedAccount> = {};

export function loadLinkedAccounts(): void {
  if (!existsSync(DATA_DIR)) mkdirSync(DATA_DIR, { recursive: true });
  if (existsSync(DATA_FILE)) {
    try {
      accounts = JSON.parse(readFileSync(DATA_FILE, "utf-8")) as Record<string, LinkedAccount>;
      logger.info({ count: Object.keys(accounts).length }, "Linked accounts loaded from disk");
    } catch {
      accounts = {};
    }
  }
}

function save(): void {
  if (!existsSync(DATA_DIR)) mkdirSync(DATA_DIR, { recursive: true });
  writeFileSync(DATA_FILE, JSON.stringify(accounts, null, 2), "utf-8");
}

export function getLinkedAccount(discordUserId: string): LinkedAccount | undefined {
  return accounts[discordUserId];
}

export function linkAccount(discordUserId: string, robloxId: number, robloxName: string): void {
  accounts[discordUserId] = { robloxId, robloxName, linkedAt: new Date().toISOString() };
  save();
}
