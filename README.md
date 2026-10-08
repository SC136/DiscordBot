# DiscordBot

A multi-purpose Discord bot built with discord.js v14.

## Features
Slash commands grouped by category in `commands/`: Admin, Fun, Games, General, Leveling (XP), Profiles and Welcome. A small web dashboard lives in `dashboard/`.

## Stack
Node.js, discord.js, MongoDB (mongoose), canvacord and @napi-rs/canvas for image cards, express for the dashboard.

## Setup
1. `npm install`
2. Copy your secrets into a `.env` file (bot token, MongoDB URI, client ID). Never commit it.
3. Register slash commands: `npm run deploy-commands`
4. Start the bot: `node .`

## Production
Runs 24/7 on an Android phone under Termux with `pm2`. Pushing to `main` auto-deploys via a watcher script. Commands and details are in [SERVER_OPS.md](SERVER_OPS.md).
