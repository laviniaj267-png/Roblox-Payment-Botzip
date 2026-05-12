# WSA HUB — Discord Roblox Purchase Bot

A Discord bot that automates Roblox game pass purchase verification through ticket channels.

## Run & Operate

- `pnpm --filter @workspace/api-server run dev` — run the API server + Discord bot (port 5000)
- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages

## Required Secrets

- `DISCORD_TOKEN` — Discord bot token (set in Replit Secrets)

## Optional Environment Variables

- `DISCORD_GUILD_ID` — Guild ID for instant slash command registration (else global, ~1h delay)
- `DISCORD_TICKET_CATEGORY_ID` — Category ID to place ticket channels under

## Stack

- pnpm workspaces, Node.js 24, TypeScript 5.9
- API: Express 5
- Discord: discord.js v14
- Build: esbuild (ESM bundle)

## Where things live

- `artifacts/api-server/src/bot/` — all Discord bot logic
  - `index.ts` — bot client init & event routing
  - `commands/setup.ts` — `/setup` slash command
  - `interactionHandler.ts` — button & modal handlers
  - `embeds.ts` — all embed builders
  - `roblox.ts` — Roblox API calls
  - `ticketTracker.ts` — game pass ownership polling
  - `guildConfig.ts` — per-guild game pass ID store

## Bot Flow

1. Admin runs `/setup gamepassid:<id>` → posts purchase panel embed
2. User clicks **Purchase** → modal asks for Roblox username
3. Bot fetches avatar → shows confirm embed with Yes/No buttons
4. User confirms → bot creates `ticket-<username>` channel (private, user + bot only)
5. Bot posts instructions with game pass link in the ticket channel
6. Bot polls Roblox API every 30s (up to 20 min) to verify ownership
7. On verified → success embed sent, ticket auto-closes after 60s

## Discord Bot Setup

1. Go to [Discord Developer Portal](https://discord.com/developers/applications)
2. Add bot to your server with scopes: `bot`, `applications.commands`
3. Bot permissions needed: `Manage Channels`, `Send Messages`, `Read Message History`, `View Channels`
4. Run `/setup gamepassid:<your_pass_id>` in the channel where you want the purchase panel

## Gotchas

- Game pass ID is stored in memory per guild — if the server restarts, run `/setup` again to restore it
- Slash commands registered globally take up to 1 hour to appear; set `DISCORD_GUILD_ID` for instant registration
- The Roblox inventory API is public — no Roblox cookie needed for ownership checks

## User preferences

_Populate as you build — explicit user instructions worth remembering across sessions._
