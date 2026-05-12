import {
  type Interaction,
  type ButtonInteraction,
  type ModalSubmitInteraction,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
  ActionRowBuilder,
  ChannelType,
  type TextChannel,
  PermissionFlagsBits,
  type CacheType,
} from "discord.js";
import { getRobloxUserByUsername, getGamePassInfo } from "./roblox.js";
import {
  buildAvatarConfirmEmbed,
  buildPurchaseInstructionsEmbed,
  buildUserNotFoundEmbed,
  buildErrorEmbed,
} from "./embeds.js";
import { startVerificationPolling } from "./ticketTracker.js";
import { getGuildGamePassId } from "./guildConfig.js";
import { config } from "./config.js";
import { logger } from "../lib/logger.js";

export async function handleInteraction(interaction: Interaction): Promise<void> {
  try {
    if (interaction.isButton()) await handleButton(interaction);
    else if (interaction.isModalSubmit()) await handleModal(interaction);
  } catch (err) {
    logger.error({ err }, "Error handling interaction");
  }
}

function buildUsernameModal(): ModalBuilder {
  const modal = new ModalBuilder()
    .setCustomId("roblox_username_modal")
    .setTitle("Enter Your Roblox Username");

  const input = new TextInputBuilder()
    .setCustomId("roblox_username")
    .setLabel("Roblox Username")
    .setStyle(TextInputStyle.Short)
    .setPlaceholder("e.g. Builderman")
    .setRequired(true)
    .setMinLength(3)
    .setMaxLength(20);

  modal.addComponents(new ActionRowBuilder<TextInputBuilder>().addComponents(input));
  return modal;
}

async function handleButton(interaction: ButtonInteraction<CacheType>): Promise<void> {
  const { customId } = interaction;

  // Open username modal
  if (customId === "purchase_start" || customId === "cancel_user") {
    await interaction.showModal(buildUsernameModal());
    return;
  }

  // Confirm Roblox user → create ticket
  if (customId.startsWith("confirm_user_")) {
    await interaction.deferReply({ ephemeral: true });

    const parts = customId.split("_");
    // format: confirm_user_<userId>_<username>
    const robloxUserId = parseInt(parts[2]!, 10);
    const robloxUsername = parts.slice(3).join("_");

    const guild = interaction.guild;
    if (!guild) {
      await interaction.editReply({ embeds: [buildErrorEmbed("This can only be used inside a server.")] });
      return;
    }

    const gamePassId = getGuildGamePassId(guild.id);
    if (!gamePassId) {
      await interaction.editReply({
        embeds: [buildErrorEmbed("No game pass configured. An admin must run `/setup gamepassid:<id>` first.")],
      });
      return;
    }

    const robloxUser = await getRobloxUserByUsername(robloxUsername);
    if (!robloxUser || robloxUser.id !== robloxUserId) {
      await interaction.editReply({
        embeds: [buildErrorEmbed("Could not fetch Roblox user data. Please try again.")],
      });
      return;
    }

    const me = guild.members.me;
    if (!me) {
      await interaction.editReply({ embeds: [buildErrorEmbed("Bot member not found in this server.")] });
      return;
    }

    const channelName = `ticket-${interaction.user.username
      .toLowerCase()
      .replace(/[^a-z0-9]/g, "-")
      .slice(0, 20)}`;

    type CreateOptions = Parameters<typeof guild.channels.create>[0];
    const channelOptions: CreateOptions = {
      name: channelName,
      type: ChannelType.GuildText,
      permissionOverwrites: [
        { id: guild.roles.everyone, deny: [PermissionFlagsBits.ViewChannel] },
        {
          id: interaction.user.id,
          allow: [
            PermissionFlagsBits.ViewChannel,
            PermissionFlagsBits.SendMessages,
            PermissionFlagsBits.ReadMessageHistory,
          ],
        },
        {
          id: me.id,
          allow: [
            PermissionFlagsBits.ViewChannel,
            PermissionFlagsBits.SendMessages,
            PermissionFlagsBits.ManageChannels,
            PermissionFlagsBits.ReadMessageHistory,
          ],
        },
      ],
    };

    if (config.ticketCategoryId) {
      (channelOptions as unknown as Record<string, unknown>)["parent"] = config.ticketCategoryId;
    }

    let ticketChannel: TextChannel;
    try {
      ticketChannel = (await guild.channels.create(channelOptions)) as TextChannel;
    } catch (err) {
      logger.error({ err }, "Failed to create ticket channel");
      await interaction.editReply({
        embeds: [buildErrorEmbed("Failed to create ticket channel. Check that the bot has Manage Channels permission.")],
      });
      return;
    }

    await interaction.editReply({ content: `✅ Your ticket has been created: <#${ticketChannel.id}>` });

    const gpInfo = await getGamePassInfo(gamePassId);
    const gpName = gpInfo?.name ?? "Game Pass";
    const gpPrice = gpInfo?.price ?? 0;

    await ticketChannel.send({
      content: `<@${interaction.user.id}>`,
      embeds: [buildPurchaseInstructionsEmbed(interaction.user.id, robloxUser, gpName, gpPrice, gamePassId)],
    });

    startVerificationPolling(
      interaction.client,
      ticketChannel,
      robloxUser,
      interaction.user.id,
      gamePassId,
      gpName
    );

    logger.info(
      { discordUser: interaction.user.tag, robloxUser: robloxUser.name, channelId: ticketChannel.id, gamePassId },
      "Ticket created and verification polling started"
    );
  }
}

async function handleModal(interaction: ModalSubmitInteraction<CacheType>): Promise<void> {
  if (interaction.customId !== "roblox_username_modal") return;

  await interaction.deferReply({ ephemeral: true });

  const username = interaction.fields.getTextInputValue("roblox_username").trim();
  const robloxUser = await getRobloxUserByUsername(username);

  if (!robloxUser) {
    const { embeds, components } = buildUserNotFoundEmbed();
    await interaction.editReply({ embeds, components });
    return;
  }

  const { embeds, components } = buildAvatarConfirmEmbed(robloxUser);
  await interaction.editReply({ embeds, components });
}
