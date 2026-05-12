export const config = {
  discordToken: process.env["DISCORD_TOKEN"] ?? "",
  guildId: process.env["DISCORD_GUILD_ID"] ?? "",
  ticketCategoryId: process.env["DISCORD_TICKET_CATEGORY_ID"] ?? "",
};

export function validateConfig(): void {
  if (!config.discordToken) {
    throw new Error("Missing required environment variable: DISCORD_TOKEN");
  }
}
