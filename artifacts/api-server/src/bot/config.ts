export const config = {
  discordToken: process.env["DISCORD_TOKEN"] ?? "",
  guildId: process.env["DISCORD_GUILD_ID"] ?? "",
  robloxGamePassId: process.env["ROBLOX_GAME_PASS_ID"] ?? "",
  robloxGameId: process.env["ROBLOX_GAME_ID"] ?? "",
  ticketCategoryId: process.env["DISCORD_TICKET_CATEGORY_ID"] ?? "",
};

export function validateConfig() {
  const missing: string[] = [];
  if (!config.discordToken) missing.push("DISCORD_TOKEN");
  if (!config.robloxGamePassId) missing.push("ROBLOX_GAME_PASS_ID");
  if (!config.robloxGameId) missing.push("ROBLOX_GAME_ID");
  if (missing.length > 0) {
    throw new Error(`Missing required environment variables: ${missing.join(", ")}`);
  }
}
