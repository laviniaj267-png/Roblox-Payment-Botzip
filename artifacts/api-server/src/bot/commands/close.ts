import {
  type ChatInputCommandInteraction,
  SlashCommandBuilder,
  EmbedBuilder,
  PermissionFlagsBits,
} from "discord.js";

export const closeCommand = {
  data: new SlashCommandBuilder()
    .setName("close")
    .setDescription("Close this ticket channel")
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageChannels),

  async execute(interaction: ChatInputCommandInteraction): Promise<void> {
    const channel = interaction.channel;

    if (!channel || !channel.isTextBased() || !("name" in channel)) {
      await interaction.reply({ content: "❌ This command must be used inside a text channel.", ephemeral: true });
      return;
    }

    const channelName = (channel as { name: string }).name;
    if (!channelName.startsWith("ticket-")) {
      await interaction.reply({
        embeds: [
          new EmbedBuilder()
            .setTitle("❌ Not a Ticket Channel")
            .setDescription("This command can only be used inside a `ticket-` channel.")
            .setColor(0xed4245),
        ],
        ephemeral: true,
      });
      return;
    }

    await interaction.reply({
      embeds: [
        new EmbedBuilder()
          .setTitle("🔒 Closing Ticket")
          .setDescription(`This ticket is being closed by <@${interaction.user.id}>.\nChannel will be deleted in 5 seconds.`)
          .setColor(0xfee75c)
          .setTimestamp(),
      ],
    });

    setTimeout(async () => {
      try {
        await (channel as unknown as { delete: (reason: string) => Promise<unknown> }).delete(
          `Ticket closed by ${interaction.user.tag}`
        );
      } catch {
        // Channel may already be deleted
      }
    }, 5_000);
  },
};
