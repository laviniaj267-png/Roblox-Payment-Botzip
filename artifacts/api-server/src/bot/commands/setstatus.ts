import {
  type ChatInputCommandInteraction,
  SlashCommandBuilder,
  PermissionFlagsBits,
  ActivityType,
} from "discord.js";

export const setStatusCommand = {
  data: new SlashCommandBuilder()
    .setName("setstatus")
    .setDescription("Set the bot's custom activity status")
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
    .addStringOption((opt) =>
      opt
        .setName("type")
        .setDescription("Activity type")
        .setRequired(true)
        .addChoices(
          { name: "Playing", value: "playing" },
          { name: "Watching", value: "watching" },
          { name: "Listening to", value: "listening" },
          { name: "Competing in", value: "competing" },
          { name: "Clear status", value: "clear" },
        )
    )
    .addStringOption((opt) =>
      opt
        .setName("text")
        .setDescription("The status text (not needed when clearing)")
        .setRequired(false)
        .setMaxLength(128)
    ),

  async execute(interaction: ChatInputCommandInteraction): Promise<void> {
    await interaction.deferReply({ ephemeral: true });

    const type = interaction.options.getString("type", true);
    const text = interaction.options.getString("text") ?? "";

    if (type !== "clear" && !text) {
      await interaction.editReply({ content: "❌ You must provide a **text** value unless you are clearing the status." });
      return;
    }

    const client = interaction.client;

    if (type === "clear") {
      client.user?.setPresence({ activities: [], status: "online" });
      await interaction.editReply({ content: "✅ Bot status cleared." });
      return;
    }

    const typeMap: Record<string, ActivityType> = {
      playing: ActivityType.Playing,
      watching: ActivityType.Watching,
      listening: ActivityType.Listening,
      competing: ActivityType.Competing,
    };

    client.user?.setPresence({
      activities: [{ name: text, type: typeMap[type]! }],
      status: "online",
    });

    const label = type.charAt(0).toUpperCase() + type.slice(1);
    await interaction.editReply({ content: `✅ Status set to **${label}** ${text}` });
  },
};
