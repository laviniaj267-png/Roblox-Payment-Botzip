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
    logger.info({ tag: readyClient.user.tag }, "Discord bot is ready");

    try {
      const commands = [setupCommand.data.toJSON()];

      if (config.guildId) {
        // Register to specific guild (instant)
        await rest.put(
          Routes.applicationGuildCommands(readyClient.user.id, config.guildId),
          { body: commands }
        );
        logger.info({ guildId: config.guildId }, "Slash commands registered to guild");
      } else {
        // Register globally (up to 1h propagation)
        await rest.put(Routes.applicationCommands(readyClient.user.id), { body: commands });
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
