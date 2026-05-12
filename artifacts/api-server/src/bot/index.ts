import {
  Client,
  GatewayIntentBits,
  REST,
  Routes,
  Events,
  type ChatInputCommandInteraction,
} from "discord.js";
import { validateConfig, config } from "./config.js";
import { handleInteraction } from "./interactionHandler.js";
import { setupCommand } from "./commands/setup.js";
import { logger } from "../lib/logger.js";

export async function startBot(): Promise<void> {
  validateConfig();

  const client = new Client({
    intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages],
  });

  // Register slash commands
  const rest = new REST({ version: "10" }).setToken(config.discordToken);

  client.once(Events.ClientReady, async (readyClient) => {
    const appId = readyClient.user.id;
    const inviteUrl =
      `https://discord.com/api/oauth2/authorize?client_id=${appId}` +
      `&permissions=536938496&scope=bot%20applications.commands`;

    logger.info({ tag: readyClient.user.tag }, "Discord bot is ready");
    logger.info(`>>> INVITE URL: ${inviteUrl}`);

    if (!config.guildId) {
      logger.warn(
        "DISCORD_GUILD_ID is not set — slash commands registered globally (may take up to 1 hour). " +
        "Set DISCORD_GUILD_ID to your server ID for instant registration."
      );
    }

    try {
      const commands = [setupCommand.data.toJSON()];

      if (config.guildId) {
        await rest.put(
          Routes.applicationGuildCommands(appId, config.guildId),
          { body: commands }
        );
        logger.info({ guildId: config.guildId }, "Slash commands registered to guild (instant)");
      } else {
        await rest.put(Routes.applicationCommands(appId), { body: commands });
        logger.info("Slash commands registered globally");
      }
    } catch (err) {
      logger.error({ err }, "Failed to register slash commands");
    }
  });

  client.on(Events.InteractionCreate, async (interaction) => {
    // Handle /setup command
    if (interaction.isChatInputCommand() && interaction.commandName === "setup") {
      await setupCommand.execute(interaction as ChatInputCommandInteraction);
      return;
    }

    await handleInteraction(interaction);
  });

  client.on(Events.Error, (err) => {
    logger.error({ err }, "Discord client error");
  });

  await client.login(config.discordToken);
}
