const { EmbedBuilder, ActivityType , SlashCommandBuilder } = require('discord.js');
const mongoose = require("mongoose");
const { sendError } = require('../../utils/errorEmbed');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('activity')
    .setDescription('View server activity data, including top games, top active players, and live status.'),
  name: 'activity',
  aliases: ['act', 'activities'],
  description: 'View server activity data, including top games, top active players, and live status.',
  run: async (client, message, args) => {
    if (!process.env.MONGO_URI) {
      return message.channel.send("❌ *MongoDB is not configured in the environment variables. Activity tracking is disabled.*");
    }

    try {
      const ActivityStats = mongoose.models.ActivityStats || mongoose.model('ActivityStats');
      const guild = message.guild;

      // 1. Self-healing check for live activities:
      // Find all docs in DB marked as currently active
      const activeDocs = await ActivityStats.find({ currentSessionStart: { $ne: null }, guildId: guild.id });
      for (const doc of activeDocs) {
        const member = guild.members.cache.get(doc.userId);
        const isStillPlaying = member && member.presence && member.presence.activities.some(
          act => act.name === doc.activityName && act.type !== ActivityType.Custom
        );
        if (!isStillPlaying) {
          // Close dangling session
          const duration = Date.now() - doc.currentSessionStart.getTime();
          await ActivityStats.updateOne(
            { _id: doc._id },
            {
              $set: { currentSessionStart: null, lastActive: new Date() },
              $inc: { totalDurationMs: duration }
            }
          );
        }
      }

      // 2. Fetch all stats for the current guild
      const allStats = await ActivityStats.find({ guildId: guild.id });
      const gamesMap = {};
      const playersMap = {};
      const liveActivities = [];

      for (const doc of allStats) {
        let duration = doc.totalDurationMs;
        let isLive = false;
        let liveDurationMs = 0;

        if (doc.currentSessionStart) {
          const elapsed = Date.now() - doc.currentSessionStart.getTime();
          duration += elapsed;
          isLive = true;
          liveDurationMs = elapsed;
        }

        if (duration > 0) {
          // Games mapping
          if (!gamesMap[doc.activityName]) {
            gamesMap[doc.activityName] = { name: doc.activityName, type: doc.activityType, durationMs: 0, activeCount: 0 };
          }
          gamesMap[doc.activityName].durationMs += duration;
          if (isLive) {
            gamesMap[doc.activityName].activeCount += 1;
          }

          // Players mapping
          if (!playersMap[doc.userId]) {
            playersMap[doc.userId] = { userId: doc.userId, durationMs: 0 };
          }
          playersMap[doc.userId].durationMs += duration;
        }

        if (isLive) {
          const member = guild.members.cache.get(doc.userId);
          const username = member ? member.user.tag : `User ${doc.userId}`;
          liveActivities.push({
            userId: doc.userId,
            username,
            activityName: doc.activityName,
            elapsedMs: liveDurationMs
          });
        }
      }

      const topGames = Object.values(gamesMap)
        .sort((a, b) => b.durationMs - a.durationMs)
        .slice(0, 5);

      const topPlayers = Object.values(playersMap)
        .sort((a, b) => b.durationMs - a.durationMs)
        .slice(0, 5);

      // Helper function to format duration
      const formatDuration = (ms) => {
        const totalMinutes = Math.floor(ms / 60000);
        const hours = Math.floor(totalMinutes / 60);
        const minutes = totalMinutes % 60;
        if (hours > 0) {
          return `${hours}h ${minutes}m`;
        }
        return `${minutes}m`;
      };

      const embed = new EmbedBuilder()
        .setTitle(`🎮 Server Activity Analytics — ${guild.name}`)
        .setColor('#5865F2') // Blurple theme
        .setThumbnail(guild.iconURL({ forceStatic: false, size: 256 }))
        .setTimestamp()
        .setFooter({ text: "Activity Data | SC SmartTech" });

      // Build Top Games Field
      if (topGames.length > 0) {
        const gamesList = topGames.map((g, i) => {
          const activeStr = g.activeCount > 0 ? ` (🔥 ${g.activeCount} live)` : '';
          return `\`${i + 1}.\` **${g.name}** — \`${formatDuration(g.durationMs)}\` total playtime${activeStr}`;
        }).join('\n');
        embed.addFields({ name: '🏆 Top 5 Games/Activities', value: gamesList });
      } else {
        embed.addFields({ name: '🏆 Top 5 Games/Activities', value: '*No activity data recorded yet.*' });
      }

      // Build Top Players Field
      if (topPlayers.length > 0) {
        const playersList = topPlayers.map((p, i) => {
          const member = guild.members.cache.get(p.userId);
          const mention = member ? `<@${p.userId}>` : `\`User ${p.userId}\``;
          return `\`${i + 1}.\` ${mention} — \`${formatDuration(p.durationMs)}\` active`;
        }).join('\n');
        embed.addFields({ name: '👤 Top 5 Most Active Members', value: playersList });
      } else {
        embed.addFields({ name: '👤 Top 5 Most Active Members', value: '*No active player data recorded yet.*' });
      }

      // Build Live Activities Field
      if (liveActivities.length > 0) {
        const liveList = liveActivities.map((act) => {
          return `• <@${act.userId}> is playing **${act.activityName}** (for \`${formatDuration(act.elapsedMs)}\`)`;
        }).join('\n');
        embed.addFields({ name: '🟢 Live Status Activities', value: liveList });
      } else {
        embed.addFields({ name: '🟢 Live Status Activities', value: '*No members are currently in active game sessions.*' });
      }

      return message.channel.send({ embeds: [embed] });
    } catch (err) {
      return sendError(message, {
        title: 'Failed to load activity stats',
        description: 'An error occurred while retrieving activity data. Please try again later.',
        command: 'activity',
        error: err
      });
    }
  }
};
