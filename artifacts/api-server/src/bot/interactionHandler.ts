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
  type GuildMember,
  PermissionFlagsBits,
  type CacheType,
  EmbedBuilder,
} from "discord.js";
import { getRobloxUserByUsername, getGamePassInfo } from "./roblox.js";
import {
  buildAvatarConfirmEmbed,
  buildPurchaseInstructionsEmbed,
  buildUserNotFoundEmbed,
  buildErrorEmbed,
  buildWhitelistApprovedDmEmbed,
  buildWhitelistDeniedDmEmbed,
} from "./embeds.js";
import { startVerificationPolling } from "./ticketTracker.js";
import { getProductById } from "./productStore.js";
import { setSession, updateSession, getSession, clearSession } from "./userSessions.js";
import { hasActiveTicket, registerTicket, generateOrderId } from "./activeTickets.js";
import { pendingWhitelists } from "./whitelistTracker.js";
import { getGuildConfig } from "./serverConfig.js";
import { isUniversalUser } from "./universalUsers.js";
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
  const modal = new ModalBuilder().setCustomId("roblox_username_modal").setTitle("Enter Your Roblox Username");
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

function isStaff(member: GuildMember | null, userId: string, guildId: string): boolean {
  if (isUniversalUser(userId)) return true;
  if (!member) return false;
  if (member.permissions.has(PermissionFlagsBits.ManageGuild)) return true;
  const { staffRoleId } = getGuildConfig(guildId);
  return staffRoleId ? member.roles.cache.has(staffRoleId) : false;
}

// ── Select menu ───────────────────────────────────────────────────────────────

async function handleSelectMenu(interaction: StringSelectMenuInteraction<CacheType>): Promise<void> {
  if (interaction.customId !== "product_select") return;

  const productId = interaction.values[0];
  if (!productId) return;

  const product = getProductById(productId);
  if (!product) {
    await interaction.reply({ embeds: [buildErrorEmbed("Unknown product selected.")], ephemeral: true });
    return;
  }

  // Check blacklist
  if (interaction.guild && interaction.member) {
    const { blacklistRoleId } = getGuildConfig(interaction.guild.id);
    if (blacklistRoleId) {
      const member = interaction.guild.members.cache.get(interaction.user.id);
      if (member?.roles.cache.has(blacklistRoleId)) {
        await interaction.reply({
          embeds: [buildErrorEmbed("You are not permitted to make purchases.")],
          ephemeral: true,
        });
        return;
      }
    }
  }

  setSession(interaction.user.id, { productId });
  await interaction.showModal(buildUsernameModal());
}

// ── Buttons ───────────────────────────────────────────────────────────────────

async function handleButton(interaction: ButtonInteraction<CacheType>): Promise<void> {
  const { customId } = interaction;

  if (customId === "retry_username" || customId === "cancel_user") {
    await interaction.showModal(buildUsernameModal());
    return;
  }

  // ── Purchase confirm ───────────────────────────────────────────────────────
  if (customId === "confirm_user") {
    await interaction.deferUpdate();

    const session = getSession(interaction.user.id);
    if (!session?.productId || !session.robloxUser) {
      await interaction.editReply({ content: "❌ Session expired. Please start again by selecting a product.", embeds: [], components: [] });
      return;
    }

    const product = getProductById(session.productId);
    if (!product) {
      await interaction.editReply({ content: "❌ Product not found. Please start again.", embeds: [], components: [] });
      return;
    }

    const { robloxUser } = session;

    const existingChannelId = hasActiveTicket(robloxUser.id);
    if (existingChannelId) {
      await interaction.editReply({
        content: `❌ Roblox account **${robloxUser.name}** already has an active ticket (<#${existingChannelId}>). Please wait for it to close first.`,
        embeds: [],
        components: [],
      });
      return;
    }

    const guild = interaction.guild;
    if (!guild) {
      await interaction.editReply({ content: "❌ Must be used inside a server.", embeds: [], components: [] });
      return;
    }

    const me = guild.members.me;
    if (!me) {
      await interaction.editReply({ content: "❌ Bot member not found.", embeds: [], components: [] });
      return;
    }

    const channelName = `ticket-${interaction.user.username.toLowerCase().replace(/[^a-z0-9]/g, "-").slice(0, 20)}`;

    type CreateOptions = Parameters<typeof guild.channels.create>[0];
    const channelOptions: CreateOptions = {
      name: channelName,
      type: ChannelType.GuildText,
      permissionOverwrites: [
        { id: guild.roles.everyone, deny: [PermissionFlagsBits.ViewChannel] },
        { id: interaction.user.id, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ReadMessageHistory] },
        { id: me.id, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ManageChannels, PermissionFlagsBits.ReadMessageHistory] },
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
      await interaction.editReply({ content: "❌ Failed to create ticket channel. Check bot has **Manage Channels** permission.", embeds: [], components: [] });
      return;
    }

    const orderId = generateOrderId();
    registerTicket(robloxUser.id, ticketChannel.id);

    await interaction.editReply({ content: `✅ Your ticket has been created: <#${ticketChannel.id}>`, embeds: [], components: [] });

    const gpInfo = await getGamePassInfo(product.gamePassId);
    const gpName = gpInfo?.name ?? product.name;
    const gpPrice = gpInfo?.price ?? 0;

    const { embeds, components } = buildPurchaseInstructionsEmbed(interaction.user.id, robloxUser, product, gpName, gpPrice, orderId);
    await ticketChannel.send({ content: `<@${interaction.user.id}>`, embeds, components });

    startVerificationPolling(interaction.client, ticketChannel, guild, robloxUser, interaction.user.id, product, gpName, gpPrice, orderId);
    clearSession(interaction.user.id);

    logger.info({ discordUser: interaction.user.tag, robloxUser: robloxUser.name, product: product.id, channelId: ticketChannel.id, orderId }, "Ticket created");
    return;
  }

  // ── Whitelist approve ──────────────────────────────────────────────────────
  if (customId.startsWith("wl_approve_") || customId.startsWith("wl_deny_")) {
    const channelId = interaction.channelId;
    const entry = pendingWhitelists.get(channelId);

    if (!entry) {
      await interaction.reply({ content: "❌ This whitelist request is no longer active.", ephemeral: true });
      return;
    }

    if (!isStaff(interaction.member as GuildMember | null, interaction.user.id, interaction.guildId ?? "")) {
      await interaction.reply({ embeds: [buildErrorEmbed("Only staff members can approve or deny whitelist requests.")], ephemeral: true });
      return;
    }

    await interaction.deferUpdate();

    const guild = interaction.guild!;
    const { discordUserId, robloxUser, product, orderId } = entry;
    const isApprove = customId.startsWith("wl_approve_");

    pendingWhitelists.delete(channelId);

    if (isApprove) {
      // Assign WSA User role
      const { wsaUserRoleId } = getGuildConfig(guild.id);
      if (wsaUserRoleId) {
        try {
          const member = await guild.members.fetch(discordUserId);
          await member.roles.add(wsaUserRoleId, `Whitelisted by ${interaction.user.tag} — ${orderId}`);
        } catch (err) {
          logger.warn({ err }, "Could not assign WSA User role");
        }
      }

      // DM user — approved
      try {
        const discordUser = await interaction.client.users.fetch(discordUserId);
        await discordUser.send({ embeds: [buildWhitelistApprovedDmEmbed(robloxUser, product, orderId)] });
      } catch {
        logger.warn({ discordUserId }, "Could not DM whitelist approval (DMs disabled)");
      }

      await interaction.editReply({
        embeds: [
          new EmbedBuilder()
            .setTitle("✅ Whitelisted")
            .setDescription(`**${robloxUser.name}** (<@${discordUserId}>) has been whitelisted by <@${interaction.user.id}>.\nOrder ID: \`${orderId}\``)
            .setColor(0x57f287)
            .setTimestamp(),
        ],
        components: [],
      });
    } else {
      // DM user — denied
      try {
        const discordUser = await interaction.client.users.fetch(discordUserId);
        await discordUser.send({ embeds: [buildWhitelistDeniedDmEmbed(robloxUser, product, orderId)] });
      } catch {
        logger.warn({ discordUserId }, "Could not DM whitelist denial (DMs disabled)");
      }

      await interaction.editReply({
        embeds: [
          new EmbedBuilder()
            .setTitle("❌ Not Whitelisted")
            .setDescription(`**${robloxUser.name}** (<@${discordUserId}>) was denied by <@${interaction.user.id}>.\nOrder ID: \`${orderId}\``)
            .setColor(0xed4245)
            .setTimestamp(),
        ],
        components: [],
      });
    }

    // Close whitelist channel after 10s
    setTimeout(async () => {
      try {
        const ch = await guild.channels.fetch(channelId);
        if (ch) await (ch as TextChannel).delete(`Whitelist ${isApprove ? "approved" : "denied"} — auto-closing`);
      } catch {
        // already deleted
      }
    }, 10_000);
  }
}

// ── Modal ─────────────────────────────────────────────────────────────────────

async function handleModal(interaction: ModalSubmitInteraction<CacheType>): Promise<void> {
  if (interaction.customId !== "roblox_username_modal") return;

  await interaction.deferReply({ ephemeral: true });

  const session = getSession(interaction.user.id);
  if (!session?.productId) {
    await interaction.editReply({ embeds: [buildErrorEmbed("Session expired. Please start again by selecting a product.")] });
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

  updateSession(interaction.user.id, { robloxUser });
  const { embeds, components } = buildAvatarConfirmEmbed(robloxUser, product.name);
  await interaction.editReply({ embeds, components });
}
