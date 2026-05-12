import {
  type ChatInputCommandInteraction,
  SlashCommandBuilder,
  PermissionFlagsBits,
  ActionRowBuilder,
  ChannelSelectMenuBuilder,
  StringSelectMenuBuilder,
  StringSelectMenuOptionBuilder,
  ButtonBuilder,
  ButtonStyle,
  ChannelType,
  EmbedBuilder,
} from "discord.js";
import { getProducts } from "../productStore.js";
import { initSetupSession } from "../setupSession.js";

export const setupCommand = {
  data: new SlashCommandBuilder()
    .setName("setup")
    .setDescription("Post the purchase panel in a channel of your choice")
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
    .addStringOption((opt) =>
      opt
        .setName("message")
        .setDescription("Custom message shown inside the purchase panel embed")
        .setRequired(true)
        .setMaxLength(1000)
    ),

  async execute(interaction: ChatInputCommandInteraction): Promise<void> {
    await interaction.deferReply({ flags: 64 });

    const customMessage = interaction.options.getString("message", true);
    const products = getProducts();

    if (products.length === 0) {
      await interaction.editReply({
        embeds: [
          new EmbedBuilder()
            .setTitle("❌ No Products")
            .setDescription("No products configured yet.\n\nUse `/add name:<name> gamepassid:<id>` to add a product first.")
            .setColor(0xed4245),
        ],
      });
      return;
    }

    initSetupSession(interaction.user.id, customMessage);

    const channelRow = new ActionRowBuilder<ChannelSelectMenuBuilder>().addComponents(
      new ChannelSelectMenuBuilder()
        .setCustomId("setup_channel_select")
        .setPlaceholder("1️⃣  Pick the channel to post in...")
        .addChannelTypes(ChannelType.GuildText)
    );

    const productRow = new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(
      new StringSelectMenuBuilder()
        .setCustomId("setup_products_select")
        .setPlaceholder("2️⃣  Choose which products to show (all by default)...")
        .setMinValues(1)
        .setMaxValues(products.length)
        .addOptions(
          products.map((p) => {
            const opt = new StringSelectMenuOptionBuilder()
              .setLabel(p.name)
              .setValue(p.id)
              .setEmoji("🎮")
              .setDefault(true);
            if (p.description) opt.setDescription(p.description.slice(0, 100));
            return opt;
          })
        )
    );

    const buttonRow = new ActionRowBuilder<ButtonBuilder>().addComponents(
      new ButtonBuilder()
        .setCustomId("setup_send_panel")
        .setLabel("Send Panel")
        .setStyle(ButtonStyle.Success)
        .setEmoji("🚀")
    );

    await interaction.editReply({
      embeds: [
        new EmbedBuilder()
          .setTitle("🛠️ Panel Builder")
          .setDescription(
            "Choose where to post the purchase panel and which products to include, then hit **Send Panel**."
          )
          .addFields({ name: "Message preview", value: `> ${customMessage.slice(0, 200)}` })
          .setColor(0x5865f2),
      ],
      components: [channelRow, productRow, buttonRow],
    });
  },
};
