import {
  type Interaction,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
  ActionRowBuilder,
  ChannelType,
  type TextChannel,
  PermissionFlagsBits,
} from "discord.js";
import { getRobloxUserByUsername } from "./roblox.js";
import {
  buildAvatarConfirmEmbed,
  buildPurchaseInstructionsEmbed,
  buildUserNotFoundEmbed,
  buildErrorEmbed,
} from "./embeds.js";
import { startVerificationPolling } from "./ticketTracker.js";
import { config } from "./config.js";
import { logger } from "../lib/logger.js";

export async function handleInteraction(interaction: Interaction): Promise<void> {
  try {
    if (interaction.isButton()) {
      await handleButton(interaction);
    } else if (interaction.isModalSubmit()) {
      await handleModal(interaction);
    }
  } catch (err) {
    logger.error({ err }, "Error handling interaction");
  }
}

async function handleButton(interaction: Extract<Interaction, { isButton(): true }>): Promise<void> {
  const { customId } = interaction;

  // Purchase start — show modal
  if (customId === "purchase_start") {
    const modal = new ModalBuilder()
      .setCustomId("roblox_username_modal")
      .setTitle("Enter Your Roblox Username");

    const usernameInput = new TextInputBuilder()
      .setCustomId("roblox_username")
      .setLabel("Roblox Username")
      .setStyle(TextInputStyle.Short)
      .setPlaceholder("e.g. Builderman")
      .setRequired(true)
      .setMinLength(3)
      .setMaxLength(20);

    modal.addComponents(new ActionRowBuilder<TextInputBuilder>().addComponents(usernameInput));
    await interaction.showModal(modal);
    return;
  }

  // Confirm user — create ticket channel
  if (customId.startsWith("confirm_user_")) {
    await interaction.deferReply({ ephemeral: true });
    const parts = customId.split("_");
    const robloxUserId = parseInt(parts[2]!, 10);
    const robloxUsername = parts.slice(3).join("_");

    const guild = interaction.guild;
    if (!guild) {
      await interaction.editReply({ embeds: [buildErrorEmbed("This command can only be used in a server.")] });
      return;
    }

    // Fetch full Roblox user data
    const robloxUser = await getRobloxUserByUsername(robloxUsername);
    if (!robloxUser) {
      await interaction.editReply({ embeds: [buildErrorEmbed("Failed to fetch Roblox user data. Please try again.")] });
      return;
    }

    // Create ticket channel
    const channelName = `ticket-${interaction.user.username.toLowerCase().replace(/[^a-z0-9]/g, "-")}`;

    const channelOptions: Parameters<typeof guild.channels.create>[0] = {
      name: channelName,
      type: ChannelType.GuildText,
      permissionOverwrites: [
        {
          id: guild.roles.everyone,
          deny: [PermissionFlagsBits.ViewChannel],
        },
        {
          id: interaction.user.id,
          allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ReadMessageHistory],
        },
        {
          id: guild.members.me!.id,
          allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ManageChannels, PermissionFlagsBits.ReadMessageHistory],
        },
      ],
    };

    if (config.ticketCategoryId) {
      (channelOptions as Record<string, unknown>)["parent"] = config.ticketCategoryId;
    }

    let ticketChannel: TextChannel;
    try {
      ticketChannel = (await guild.channels.create(channelOptions)) as TextChannel;
    } catch (err) {
      logger.error({ err }, "Failed to create ticket channel");
      await interaction.editReply({ embeds: [buildErrorEmbed("Failed to create ticket channel. Please check bot permissions.")] });
      return;
    }

    await interaction.editReply({ content: `✅ Your ticket has been created: <#${ticketChannel.id}>` });

    // Fetch game pass info for the embed
    const { getGamePassInfo } = await import("./roblox.js");
    const gpInfo = await getGamePassInfo(config.robloxGamePassId);
    const gpName = gpInfo?.name ?? "Game Pass";
    const gpPrice = gpInfo?.price ?? 0;

    // Send instructions in the ticket channel
    const instructionsEmbed = buildPurchaseInstructionsEmbed(
      robloxUser,
      gpName,
      gpPrice,
      config.robloxGameId,
      config.robloxGamePassId
    );

    await ticketChannel.send({
      content: `<@${interaction.user.id}>`,
      embeds: [instructionsEmbed],
    });

    // Start polling for game pass ownership
    startVerificationPolling(
      interaction.client,
      ticketChannel,
      robloxUser,
      interaction.user.id
    );

    logger.info(
      { discordUser: interaction.user.tag, robloxUser: robloxUser.name, channelId: ticketChannel.id },
      "Ticket created and polling started"
    );
    return;
  }

  // Cancel — let user try again
  if (customId === "cancel_user") {
    const modal = new ModalBuilder()
      .setCustomId("roblox_username_modal")
      .setTitle("Enter Your Roblox Username");

    const usernameInput = new TextInputBuilder()
      .setCustomId("roblox_username")
      .setLabel("Roblox Username")
      .setStyle(TextInputStyle.Short)
      .setPlaceholder("e.g. Builderman")
      .setRequired(true)
      .setMinLength(3)
      .setMaxLength(20);

    modal.addComponents(new ActionRowBuilder<TextInputBuilder>().addComponents(usernameInput));
    await interaction.showModal(modal);
    return;
  }
}

async function handleModal(interaction: Extract<Interaction, { isModalSubmit(): true }>): Promise<void> {
  if (interaction.customId === "roblox_username_modal") {
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
}
