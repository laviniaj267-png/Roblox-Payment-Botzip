import {
  type Interaction,
  type ButtonInteraction,
  type ModalSubmitInteraction,
  type StringSelectMenuInteraction,
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
import { getProductById } from "./products.js";
import { setSession, updateSession, getSession, clearSession } from "./userSessions.js";
import { config } from "./config.js";
import { logger } from "../lib/logger.js";

export async function handleInteraction(interaction: Interaction): Promise<void> {
  try {
    if (interaction.isStringSelectMenu()) await handleSelectMenu(interaction);
    else if (interaction.isButton()) await handleButton(interaction);
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

// ── Select menu ──────────────────────────────────────────────────────────────

async function handleSelectMenu(interaction: StringSelectMenuInteraction<CacheType>): Promise<void> {
  if (interaction.customId !== "product_select") return;

  const productId = interaction.values[0];
  if (!productId) return;

  const product = getProductById(productId);
  if (!product) {
    await interaction.reply({ embeds: [buildErrorEmbed("Unknown product selected.")], ephemeral: true });
    return;
  }

  if (!product.gamePassId) {
    await interaction.reply({
      embeds: [buildErrorEmbed(`The **${product.name}** game pass is not configured yet. Please contact an admin.`)],
      ephemeral: true,
    });
    return;
  }

  // Save product choice to session, then open username modal
  setSession(interaction.user.id, { productId });
  await interaction.showModal(buildUsernameModal());
}

// ── Buttons ───────────────────────────────────────────────────────────────────

async function handleButton(interaction: ButtonInteraction<CacheType>): Promise<void> {
  const { customId } = interaction;

  // Retry username (after not-found)
  if (customId === "retry_username" || customId === "cancel_user") {
    // Keep existing session (product already saved)
    await interaction.showModal(buildUsernameModal());
    return;
  }

  // Confirm Roblox account → create ticket channel
  if (customId === "confirm_user") {
    await interaction.deferReply({ ephemeral: true });

    const session = getSession(interaction.user.id);
    if (!session?.productId || !session.robloxUser) {
      await interaction.editReply({
        embeds: [buildErrorEmbed("Session expired. Please start again by selecting a product.")],
      });
      return;
    }

    const product = getProductById(session.productId);
    if (!product) {
      await interaction.editReply({ embeds: [buildErrorEmbed("Product not found. Please start again.")] });
      return;
    }

    const guild = interaction.guild;
    if (!guild) {
      await interaction.editReply({ embeds: [buildErrorEmbed("This can only be used inside a server.")] });
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
        embeds: [buildErrorEmbed("Failed to create ticket channel. Check the bot has **Manage Channels** permission.")],
      });
      return;
    }

    await interaction.editReply({ content: `✅ Your ticket has been created: <#${ticketChannel.id}>` });

    const gpInfo = await getGamePassInfo(product.gamePassId);
    const gpName = gpInfo?.name ?? product.name;
    const gpPrice = gpInfo?.price ?? 0;

    const { robloxUser } = session;

    await ticketChannel.send({
      content: `<@${interaction.user.id}>`,
      embeds: [buildPurchaseInstructionsEmbed(interaction.user.id, robloxUser, product, gpName, gpPrice)],
    });

    startVerificationPolling(
      interaction.client,
      ticketChannel,
      robloxUser,
      interaction.user.id,
      product,
      gpName
    );

    clearSession(interaction.user.id);

    logger.info(
      {
        discordUser: interaction.user.tag,
        robloxUser: robloxUser.name,
        product: product.id,
        channelId: ticketChannel.id,
      },
      "Ticket created, verification polling started"
    );
  }
}

// ── Modal ─────────────────────────────────────────────────────────────────────

async function handleModal(interaction: ModalSubmitInteraction<CacheType>): Promise<void> {
  if (interaction.customId !== "roblox_username_modal") return;

  await interaction.deferReply({ ephemeral: true });

  const session = getSession(interaction.user.id);
  if (!session?.productId) {
    await interaction.editReply({
      embeds: [buildErrorEmbed("Session expired. Please start again by selecting a product.")],
    });
    return;
  }

  const product = getProductById(session.productId);
  if (!product) {
    await interaction.editReply({ embeds: [buildErrorEmbed("Product not found. Please start again.")] });
    return;
  }

  const username = interaction.fields.getTextInputValue("roblox_username").trim();
  const robloxUser = await getRobloxUserByUsername(username);

  if (!robloxUser) {
    const { embeds, components } = buildUserNotFoundEmbed();
    await interaction.editReply({ embeds, components });
    return;
  }

  // Save Roblox user to session for the confirm step
  updateSession(interaction.user.id, { robloxUser });

  const { embeds, components } = buildAvatarConfirmEmbed(robloxUser, product.name);
  await interaction.editReply({ embeds, components });
}
