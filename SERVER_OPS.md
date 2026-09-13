# Server Operations & Hosting Cheat Sheet

This document outlines the architecture, deployment workflow, and daily operations commands for the production bot hosted on the Android (Termux) server.

---

## 📱 Infrastructure Overview

| Component | Details |
| :--- | :--- |
| **Production Server** | Android Phone (Always-on 24/7 home server via Termux) |
| **SSH Endpoint** | `ssh -p 8022 user@192.168.1.197` |
| **Server Repo Directory** | `~/DiscordBot` |
| **Process Manager** | `pm2` (process name: `bot`) |
| **Auto-Deploy Mechanism**| `~/scripts/watch.sh` (polls GitHub `origin/main` every 30s) |
| **Development Machine** | Local Windows PC (`c:\code\bots\JumpyPrettyApplicationprogrammer`) |

> [!NOTE]
> **Dual-Instance Awareness:**
> During development, a local instance of the bot may be running on the PC (`node .`) for testing while the production instance is running 24/7 on the Android server.
> Commits pushed to GitHub's `main` branch automatically trigger `watch.sh` on the phone to deploy to production.

---

## 🛠️ Essential Command Reference

### 1. Bot Process (`pm2`)
```bash
pm2 list                          # Quick status: online/stopped, uptime, restarts, memory
pm2 show bot                      # Detailed info: uptime, restart count, log paths, CPU/mem
pm2 restart bot                   # Restart after a manual fix or if it's stuck
pm2 stop bot                      # Stop the bot process
pm2 start bot                     # Start it again (if stopped)
pm2 flush bot                     # Clear accumulated log files
```

### 2. Bot Logs
```bash
pm2 logs bot --lines 50 --nostream       # Last 50 lines without hanging the terminal
pm2 logs bot                             # Live tail (Ctrl + C to exit; doesn't stop the bot)
pm2 logs bot --err --lines 50 --nostream # View error logs only
grep -i "error" ~/.pm2/logs/bot-error.log # Search historical error logs directly
```

### 3. Auto-Deploy (`watch.sh`)
```bash
tail -f ~/scripts/watch.log                        # Live view of the deployment polling loop
grep "New commit detected" ~/scripts/watch.log      # Filter for actual deploy events
pgrep -f watch.sh                                   # Confirm the watcher daemon is running
> ~/scripts/watch.log                               # Truncate/clear the log file
```

### 4. Git / Manual Deployment (Skip the 30s poll)
```bash
cd ~/DiscordBot
git log -1 --oneline                                # Current commit running on the phone
git fetch origin && git log origin/main -1 --oneline # Check latest commit available on GitHub
git pull origin main                                # Force pull immediately
npm install --ignore-scripts                        # Reinstall dependencies (after package.json updates)
npx patch-package                                   # Reapply the discord-xp patch (required after npm install)
pm2 restart bot                                     # Restart the bot process with new code
```

### 5. System Health (Android / Termux)
```bash
free -h                           # RAM usage (check before/after adding features/bots)
df -h                             # Internal storage disk space
termux-wake-lock                  # Re-apply wake lock to prevent Android sleep/throttling
```

### 6. SSH & Connectivity
```bash
pgrep sshd                        # Confirm SSH daemon is active
```

---

## 🚨 "Something's Wrong, Start Here" Troubleshooting Flow

When the bot is behaving unexpectedly or offline, follow these steps in order:

1. **Check process status:**
   ```bash
   pm2 list
   ```
   *Is the `bot` process listed as `online`? Check restart counts.*

2. **Inspect recent logs:**
   ```bash
   pm2 logs bot --lines 50 --nostream
   ```
   *Look for uncaught exceptions, MongoDB connection drops, or Discord API rate limits.*

3. **Check deployment watcher:**
   ```bash
   tail -f ~/scripts/watch.log
   ```
   *Did an automatic pull fail (e.g. merge conflict, package installation error)?*

4. **Check system memory:**
   ```bash
   free -h
   ```
   *Verify the Android device is not running out of RAM.*

5. **Quick restart:**
   ```bash
   pm2 restart bot
   ```
   *Often resolves transient network drops or socket hangs.*

6. **Re-patch dependencies (if package updates occurred):**
   ```bash
   cd ~/DiscordBot && npx patch-package && pm2 restart bot
   ```
