import {
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  type ColorResolvable,
} from "discord.js";
import type { RobloxUser } from "./roblox.js";

const BRAND_COLOR: ColorResolvable = 0x5865f2;
const SUCCESS_COLOR: ColorResolvable = 0x57f287;
const WARNING_COLOR: ColorResolvable = 0xfee75c;
const ERROR_COLOR: ColorResolvable = 0xed4245;

export function buildPurchasePanel(
  gamePassName: string,
  gamePassPrice: number,
  gamePassId: string
): { embeds: EmbedBuilder[]; components: ActionRowBuilder<ButtonBuilder>[] } {
  const gamePassUrl = `https://www.roblox.com/game-pass/${gamePassId}`;

  const embed = new EmbedBuilder()
    .setTitle("🎮 Game Pass Purchase")
    .setDescription(
      `Purchase the game pass below and our bot will automatically verify your purchase.\n\n` +
        `**Game Pass:** [${gamePassName}](${gamePassUrl})\n` +
        `**Price:** ${gamePassPrice} Robux\n\n` +
        `Click **Purchase** to begin the verification process.`
    )
    .setColor(BRAND_COLOR)
    .setFooter({ text: "Automated Roblox Purchase Verification" })
    .setTimestamp();

  const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder()
      .setCustomId("purchase_start")
      .setLabel("Purchase")
      .setStyle(ButtonStyle.Primary)
      .setEmoji("🛒")
  );

  return { embeds: [embed], components: [row] };
}

export function buildAvatarConfirmEmbed(user: RobloxUser): {
  embeds: EmbedBuilder[];
  components: ActionRowBuilder<ButtonBuilder>[];
} {
  const embed = new EmbedBuilder()
    .setTitle("Confirm Your Roblox Account")
    .setDescription(
      `Is this your Roblox account?\n\n` +
        `**Username:** ${user.name}\n` +
        `**Display Name:** ${user.displayName}\n` +
        `**User ID:** ${user.id}`
    )
    .setThumbnail(user.avatarUrl)
    .setColor(WARNING_COLOR)
    .setFooter({ text: "Please confirm to continue" });

  const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder()
      .setCustomId(`confirm_user_${user.id}_${user.name}`)
      .setLabel("Yes, that's me")
      .setStyle(ButtonStyle.Success)
      .setEmoji("✅"),
    new ButtonBuilder()
      .setCustomId("cancel_user")
      .setLabel("No, try again")
      .setStyle(ButtonStyle.Danger)
      .setEmoji("❌")
  );

  return { embeds: [embed], components: [row] };
}

export function buildPurchaseInstructionsEmbed(
  discordUserId: string,
  robloxUser: RobloxUser,
  gamePassName: string,
  gamePassPrice: number,
  gamePassId: string
): EmbedBuilder {
  const gamePassUrl = `https://www.roblox.com/game-pass/${gamePassId}`;

  return new EmbedBuilder()
    .setTitle("📋 Purchase Instructions")
    .setDescription(
      `Hey <@${discordUserId}>, follow these steps to complete your purchase!\n\n` +
        `**Step 1:** Click the link below and buy the game pass with Robux\n` +
        `**Step 2:** Once purchased, this bot will automatically detect it\n` +
        `**Step 3:** You'll receive a confirmation message here\n\n` +
        `> **Game Pass:** [${gamePassName}](${gamePassUrl})\n` +
        `> **Price:** ${gamePassPrice} Robux\n` +
        `> **Roblox Account:** ${robloxUser.name}\n\n` +
        `⏳ I'm watching for your purchase. This may take up to 2 minutes after buying.`
    )
    .setColor(BRAND_COLOR)
    .setThumbnail(robloxUser.avatarUrl)
    .setFooter({ text: `Verifying: ${robloxUser.name} • Game Pass ID: ${gamePassId}` })
    .setTimestamp();
}

export function buildVerificationSuccessEmbed(
  discordUserId: string,
  robloxUser: RobloxUser,
  gamePassName: string
): EmbedBuilder {
  return new EmbedBuilder()
    .setTitle("✅ Purchase Verified!")
    .setDescription(
      `Congratulations <@${discordUserId}>! Your purchase has been verified.\n\n` +
        `**Game Pass:** ${gamePassName}\n` +
        `**Roblox Account:** ${robloxUser.name}\n\n` +
        `You now have access. Enjoy! 🎮`
    )
    .setColor(SUCCESS_COLOR)
    .setThumbnail(robloxUser.avatarUrl)
    .setTimestamp();
}

export function buildErrorEmbed(message: string): EmbedBuilder {
  return new EmbedBuilder()
    .setTitle("❌ Error")
    .setDescription(message)
    .setColor(ERROR_COLOR)
    .setTimestamp();
}

export function buildUserNotFoundEmbed(): {
  embeds: EmbedBuilder[];
  components: ActionRowBuilder<ButtonBuilder>[];
} {
  const embed = new EmbedBuilder()
    .setTitle("❌ User Not Found")
    .setDescription(
      "We couldn't find a Roblox account with that username.\n\nPlease check the spelling and try again."
    )
    .setColor(ERROR_COLOR)
    .setTimestamp();

  const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder()
      .setCustomId("purchase_start")
      .setLabel("Try Again")
      .setStyle(ButtonStyle.Primary)
      .setEmoji("🔄")
  );

  return { embeds: [embed], components: [row] };
}
