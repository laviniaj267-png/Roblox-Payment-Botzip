import {
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  StringSelectMenuBuilder,
  StringSelectMenuOptionBuilder,
  type ColorResolvable,
} from "discord.js";
import type { RobloxUser } from "./roblox.js";
import type { Product } from "./productStore.js";

const BRAND_COLOR: ColorResolvable = 0x5865f2;
const SUCCESS_COLOR: ColorResolvable = 0x57f287;
const WARNING_COLOR: ColorResolvable = 0xfee75c;
const ERROR_COLOR: ColorResolvable = 0xed4245;

// ── Purchase panel ────────────────────────────────────────────────────────────

export function buildPurchasePanel(
  customMessage: string,
  products: Product[]
): { embeds: EmbedBuilder[]; components: ActionRowBuilder<StringSelectMenuBuilder>[] } {
  const embed = new EmbedBuilder()
    .setTitle("🛒 Purchase a Product")
    .setDescription(`${customMessage}\n\nSelect a product from the dropdown below to begin.`)
    .setColor(BRAND_COLOR)
    .setFooter({ text: "Automated Roblox Purchase Verification" })
    .setTimestamp();

  const select = new StringSelectMenuBuilder()
    .setCustomId("product_select")
    .setPlaceholder("Choose a product...")
    .addOptions(
      products.map((p) => {
        const opt = new StringSelectMenuOptionBuilder()
          .setLabel(p.name)
          .setValue(p.id)
          .setEmoji("🎮");
        if (p.description) opt.setDescription(p.description.slice(0, 100));
        return opt;
      })
    );

  return { embeds: [embed], components: [new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(select)] };
}

// ── Avatar confirmation ───────────────────────────────────────────────────────

export function buildAvatarConfirmEmbed(user: RobloxUser, productName: string): {
  embeds: EmbedBuilder[];
  components: ActionRowBuilder<ButtonBuilder>[];
} {
  const embed = new EmbedBuilder()
    .setTitle("Confirm Your Roblox Account")
    .setDescription(
      `Is this your Roblox account?\n\n` +
        `**Username:** ${user.name}\n` +
        `**Display Name:** ${user.displayName}\n` +
        `**User ID:** ${user.id}\n\n` +
        `**Product:** ${productName}`
    )
    .setThumbnail(user.avatarUrl)
    .setColor(WARNING_COLOR)
    .setFooter({ text: "Please confirm to continue" });

  const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder().setCustomId("confirm_user").setLabel("Yes, that's me").setStyle(ButtonStyle.Success).setEmoji("✅"),
    new ButtonBuilder().setCustomId("cancel_user").setLabel("No, try again").setStyle(ButtonStyle.Danger).setEmoji("❌")
  );

  return { embeds: [embed], components: [row] };
}

// ── Ticket instructions (with big Buy button) ─────────────────────────────────

export function buildPurchaseInstructionsEmbed(
  discordUserId: string,
  robloxUser: RobloxUser,
  product: Product,
  gamePassName: string,
  gamePassPrice: number,
  orderId: string
): { embeds: EmbedBuilder[]; components: ActionRowBuilder<ButtonBuilder>[] } {
  const gamePassUrl = `https://www.roblox.com/game-pass/${product.gamePassId}`;

  const embed = new EmbedBuilder()
    .setTitle("📋 Purchase Instructions")
    .setDescription(
      `Hey <@${discordUserId}>, follow these steps to complete your purchase!\n\n` +
        `**Step 1:** Click the **Buy Game Pass** button below and purchase it with Robux\n` +
        `**Step 2:** Return here — the bot will automatically detect your purchase\n` +
        `**Step 3:** You'll receive a confirmation DM with your order details\n\n` +
        `> **Product:** ${product.name}\n` +
        `> **Game Pass:** [${gamePassName}](${gamePassUrl})\n` +
        `> **Price:** ${gamePassPrice} Robux\n` +
        `> **Roblox Account:** ${robloxUser.name}\n` +
        `> **Order ID:** \`${orderId}\`\n\n` +
        `⏳ Watching for your purchase — may take up to 2 minutes after buying.`
    )
    .setColor(BRAND_COLOR)
    .setThumbnail(robloxUser.avatarUrl)
    .setFooter({ text: `Verifying: ${robloxUser.name} • ${orderId}` })
    .setTimestamp();

  const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder().setLabel("🛒  Buy Game Pass").setStyle(ButtonStyle.Link).setURL(gamePassUrl)
  );

  return { embeds: [embed], components: [row] };
}

// ── In-channel verification success ──────────────────────────────────────────

export function buildVerificationSuccessEmbed(
  discordUserId: string,
  robloxUser: RobloxUser,
  product: Product,
  gamePassName: string,
  orderId: string
): EmbedBuilder {
  return new EmbedBuilder()
    .setTitle("✅ Purchase Verified!")
    .setDescription(
      `<@${discordUserId}> Your purchase has been verified!\n\n` +
        `**Order ID:** \`${orderId}\`\n` +
        `**Product:** ${product.name}\n` +
        `**Game Pass:** ${gamePassName}\n` +
        `**Roblox Account:** ${robloxUser.name}\n\n` +
        `A confirmation DM has been sent. A staff member will whitelist you shortly.`
    )
    .setColor(SUCCESS_COLOR)
    .setThumbnail(robloxUser.avatarUrl)
    .setTimestamp();
}

// ── Order confirmed DM ────────────────────────────────────────────────────────

export function buildOrderConfirmedDmEmbed(
  robloxUser: RobloxUser,
  product: Product,
  gamePassName: string,
  gamePassPrice: number,
  orderId: string
): EmbedBuilder {
  const gamePassUrl = `https://www.roblox.com/game-pass/${product.gamePassId}`;
  return new EmbedBuilder()
    .setTitle("✅ Order Confirmed!")
    .setDescription(
      `Your purchase has been verified. A staff member will whitelist you shortly.\n\n` +
        `**Order ID:** \`${orderId}\`\n\n` +
        `**Product:** ${product.name}\n` +
        `**Game Pass:** [${gamePassName}](${gamePassUrl})\n` +
        `**Price:** ${gamePassPrice} Robux\n` +
        `**Roblox Account:** ${robloxUser.name} *(ID: ${robloxUser.id})*\n\n` +
        `Keep this message for your records. 🎮`
    )
    .setColor(SUCCESS_COLOR)
    .setThumbnail(robloxUser.avatarUrl)
    .setFooter({ text: `WSA HUB • ${orderId}` })
    .setTimestamp();
}

// ── Whitelist approved DM ─────────────────────────────────────────────────────

export function buildWhitelistApprovedDmEmbed(
  robloxUser: RobloxUser,
  product: Product,
  orderId: string
): EmbedBuilder {
  return new EmbedBuilder()
    .setTitle("🎉 You've Been Whitelisted!")
    .setDescription(
      `Congratulations! Your whitelist request has been approved.\n\n` +
        `**Product:** ${product.name}\n` +
        `**Roblox Account:** ${robloxUser.name}\n` +
        `**Order ID:** \`${orderId}\`\n\n` +
        `You now have access. Thank you for your purchase and welcome to WSA! 🚀`
    )
    .setColor(SUCCESS_COLOR)
    .setThumbnail(robloxUser.avatarUrl)
    .setFooter({ text: `WSA HUB • ${orderId}` })
    .setTimestamp();
}

// ── Whitelist denied DM ───────────────────────────────────────────────────────

export function buildWhitelistDeniedDmEmbed(
  robloxUser: RobloxUser,
  product: Product,
  orderId: string
): EmbedBuilder {
  return new EmbedBuilder()
    .setTitle("❌ Whitelist Not Approved")
    .setDescription(
      `We're sorry, but your whitelist request was not approved at this time.\n\n` +
        `**Product:** ${product.name}\n` +
        `**Roblox Account:** ${robloxUser.name}\n` +
        `**Order ID:** \`${orderId}\`\n\n` +
        `If you believe this is a mistake, please contact a staff member with your Order ID.`
    )
    .setColor(ERROR_COLOR)
    .setThumbnail(robloxUser.avatarUrl)
    .setFooter({ text: `WSA HUB • ${orderId}` })
    .setTimestamp();
}

// ── Helpers ───────────────────────────────────────────────────────────────────

export function buildErrorEmbed(message: string): EmbedBuilder {
  return new EmbedBuilder().setTitle("❌ Error").setDescription(message).setColor(ERROR_COLOR).setTimestamp();
}

export function buildUserNotFoundEmbed(): {
  embeds: EmbedBuilder[];
  components: ActionRowBuilder<ButtonBuilder>[];
} {
  const embed = new EmbedBuilder()
    .setTitle("❌ User Not Found")
    .setDescription("We couldn't find a Roblox account with that username.\n\nPlease check the spelling and try again.")
    .setColor(ERROR_COLOR)
    .setTimestamp();

  const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder().setCustomId("retry_username").setLabel("Try Again").setStyle(ButtonStyle.Primary).setEmoji("🔄")
  );

  return { embeds: [embed], components: [row] };
}
