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
import { handlePrefixCommand } from "./prefixCommands.js";
import { loadProducts } from "./productStore.js";
import { loadServerConfig } from "./serverConfig.js";
import { setupCommand } from "./commands/setup.js";
import { addCommand } from "./commands/add.js";
import { removeCommand } from "./commands/remove.js";
import { productsCommand } from "./commands/products.js";
import { closeCommand } from "./commands/close.js";
import { configCommand } from "./commands/config.js";
import { inviteCommand } from "./commands/invite.js";
import { staffCommand, whitelistRoleCommand, blacklistRoleCommand } from "./commands/setroles.js";
import { logger } from "../lib/logger.js";

const allCommands = [
  setupCommand,
  addCommand,
  removeCommand,
  productsCommand,
  closeCommand,
  configCommand,
  inviteCommand,
  staffCommand,
  whitelistRoleCommand,
  blacklistRoleCommand,
];

const commandMap = new Map(allCommands.map((c) => [c.data.name, c]));

export async function startBot(): Promise<void> {
  validateConfig();
  loadProducts();
  loadServerConfig();

  const client = new Client({
    intents: [
      GatewayIntentBits.Guilds,
      GatewayIntentBits.GuildMessages,
      GatewayIntentBits.MessageContent, // Required for ?prefix commands
    ],
  });

  const rest = new REST({ version: "10" }).setToken(config.discordToken);

  client.once(Events.ClientReady, async (readyClient) => {
    const appId = readyClient.user.id;
    const inviteUrl =
      `https://discord.com/api/oauth2/authorize?client_id=${appId}` +
      `&permissions=1099781947392&scope=bot%20applications.commands`;

    logger.info({ tag: readyClient.user.tag }, "Discord bot is ready");
    logger.info(`>>> INVITE URL: ${inviteUrl}`);

    const commandPayload = allCommands.map((c) => c.data.toJSON());

    try {
      if (config.guildId) {
        await rest.put(Routes.applicationGuildCommands(appId, config.guildId), { body: commandPayload });
        logger.info({ guildId: config.guildId, count: commandPayload.length }, "Slash commands registered to guild (instant)");
      } else {
        await rest.put(Routes.applicationCommands(appId), { body: commandPayload });
        logger.info({ count: commandPayload.length }, "Slash commands registered globally");
      }
    } catch (err) {
      logger.error({ err }, "Failed to register slash commands");
    }
  });

  // Handle slash commands
  client.on(Events.InteractionCreate, async (interaction) => {
    if (interaction.isChatInputCommand()) {
      const command = commandMap.get(interaction.commandName);
      if (command) {
        try {
          await command.execute(interaction as ChatInputCommandInteraction);
        } catch (err) {
          logger.error({ err, command: interaction.commandName }, "Slash command threw an unhandled error");
          try {
            const payload = { content: "❌ An unexpected error occurred. Please try again.", ephemeral: true };
            if (interaction.deferred || interaction.replied) {
              await interaction.editReply(payload);
            } else {
              await interaction.reply(payload);
            }
          } catch {
            // interaction already expired or reply failed
          }
        }
        return;
      }
    }
    await handleInteraction(interaction);
  });

  // Handle ?prefix commands
  client.on(Events.MessageCreate, async (message) => {
    await handlePrefixCommand(message);
  });

  client.on(Events.Error, (err) => {
    logger.error({ err }, "Discord client error");
  });

  await client.login(config.discordToken);
}
