const { EmbedBuilder, SlashCommandBuilder } = require('discord.js');
const mongoose = require('mongoose');
const e = require('../../utils/emojis');
const { sendError } = require('../../utils/errorEmbed');

// Helper to format milliseconds into readable "Xd Xh Xm"
function formatDuration(ms) {
  if (!ms || ms <= 0) return '0m';
  const totalSeconds = Math.floor(ms / 1000);
  const days = Math.floor(totalSeconds / 86400);
  const hours = Math.floor((totalSeconds % 86400) / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);

  const parts = [];
  if (days > 0) parts.push(`${days}d`);
  if (hours > 0) parts.push(`${hours}h`);
  if (minutes > 0 || parts.length === 0) parts.push(`${minutes}m`);
  return parts.join(' ');
}

// Helper to generate a text-based progress bar
function makeProgressBar(current, max, length = 10) {
  if (!max || max <= 0) return '░'.repeat(length) + ' 0%';
  const ratio = Math.min(Math.max(current / max, 0), 1);
  const filled = Math.round(length * ratio);
  const empty = Math.max(0, length - filled);
  const pct = Math.round(ratio * 100);
  return '█'.repeat(filled) + '░'.repeat(empty) + ` ${pct}%`;
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName('userstats')
    .setDescription('View comprehensive activity, messages, commands, and stats for a member.')
    .addUserOption(opt =>
      opt.setName('user')
        .setDescription('The member to view stats for (leave empty for yourself)')
        .setRequired(false)
    ),
  name: 'userstats',
  aliases: ['ustats', 'mystats', 'memberstats', 'uactivity', 'userstat'],
  description: 'View comprehensive activity, messages, commands, voice, and server statistics for a member.',
  usage: '[@user/ID]',
  run: async (client, message, args) => {
    try {
      const guild = message.guild;
      if (!guild) return message.channel.send('❌ This command can only be used in a server.');

      // ── 1. Target Member Resolution ──
      let targetMember = null;
      if (message.mentions?.members?.first()) {
        targetMember = message.mentions.members.first();
      } else if (args && args[0]) {
        const cleanId = args[0].replace(/[<@!>]/g, '').trim();
        targetMember = guild.members.cache.get(cleanId) || await guild.members.fetch(cleanId).catch(() => null);
      }

      if (!targetMember) {
        targetMember = message.member || await guild.members.fetch(message.author.id).catch(() => null);
      }

      const targetUser = targetMember ? targetMember.user : message.author;
      const hasDb = Boolean(process.env.MONGO_URI);

      // ── 2. Message Statistics ──
      let totalMessages = 0;
      let weeklyMessages = 0;
      let favoriteChannelText = 'None tracked';

      if (hasDb) {
        try {
          const MemberMessageStats = mongoose.models.MemberMessageStats || mongoose.model('MemberMessageStats');

          const sevenDaysAgo = new Date();
          sevenDaysAgo.setUTCDate(sevenDaysAgo.getUTCDate() - 7);
          sevenDaysAgo.setUTCHours(0, 0, 0, 0);

          // All-time & 7-day messages in parallel
          const [totalMsgAgg, weeklyMsgAgg, topChAgg] = await Promise.all([
            MemberMessageStats.aggregate([
              { $match: { guildId: guild.id, userId: targetUser.id } },
              { $group: { _id: null, total: { $sum: '$messageCount' } } }
            ]),
            MemberMessageStats.aggregate([
              { $match: { guildId: guild.id, userId: targetUser.id, date: { $gte: sevenDaysAgo } } },
              { $group: { _id: null, total: { $sum: '$messageCount' } } }
            ]),
            MemberMessageStats.aggregate([
              { $match: { guildId: guild.id, userId: targetUser.id } },
              { $group: { _id: '$channelId', total: { $sum: '$messageCount' } } },
              { $sort: { total: -1 } },
              { $limit: 1 }
            ])
          ]);

          if (totalMsgAgg.length > 0 && totalMsgAgg[0].total) {
            totalMessages = totalMsgAgg[0].total;
          }
          if (weeklyMsgAgg.length > 0 && weeklyMsgAgg[0].total) {
            weeklyMessages = weeklyMsgAgg[0].total;
          }
          if (topChAgg.length > 0 && topChAgg[0].total) {
            const topCh = topChAgg[0];
            const pct = totalMessages > 0 ? Math.round((topCh.total / totalMessages) * 100) : 0;
            favoriteChannelText = `<#${topCh._id}> (${topCh.total.toLocaleString()} • ${pct}%)`;
          }
        } catch (dbErr) {
          console.error('[UserStats] Message stats error:', dbErr.message);
        }
      }

      // ── 3. Bot Command Usage Statistics ──
      let totalCommands = 0;
      let favoriteCmd = 'None';
      let lastCmdText = 'None';

      if (hasDb) {
        try {
          const UserCommandStats = mongoose.models.UserCommandStats || mongoose.model('UserCommandStats');
          const cmdRecord = await UserCommandStats.findOne({ guildId: guild.id, userId: targetUser.id });

          if (cmdRecord) {
            totalCommands = cmdRecord.commandCount || 0;
            if (cmdRecord.lastUsedCommand) {
              lastCmdText = `\`${cmdRecord.lastUsedCommand}\``;
            }

            if (cmdRecord.commands) {
              let entries = [];
              if (cmdRecord.commands instanceof Map) {
                entries = Array.from(cmdRecord.commands.entries());
              } else if (typeof cmdRecord.commands === 'object') {
                entries = Object.entries(cmdRecord.commands);
              }
              if (entries.length > 0) {
                entries.sort((a, b) => b[1] - a[1]);
                const top = entries[0];
                favoriteCmd = `\`${top[0]}\` (${top[1]}x)`;
              }
            }
          }
        } catch (dbErr) {
          console.error('[UserStats] Command stats error:', dbErr.message);
        }
      }

      // ── 4. Voice Statistics ──
      let totalVoiceMs = 0;
      let weeklyVoiceMs = 0;
      let voiceStatusText = '⚪ Not in voice';

      if (hasDb) {
        try {
          const MemberVoiceStats = mongoose.models.MemberVoiceStats || mongoose.model('MemberVoiceStats');

          const sevenDaysAgo = new Date();
          sevenDaysAgo.setUTCDate(sevenDaysAgo.getUTCDate() - 7);
          sevenDaysAgo.setUTCHours(0, 0, 0, 0);

          const [totalVoiceAgg, weeklyVoiceAgg] = await Promise.all([
            MemberVoiceStats.aggregate([
              { $match: { guildId: guild.id, userId: targetUser.id } },
              { $group: { _id: null, totalMs: { $sum: '$voiceDurationMs' } } }
            ]),
            MemberVoiceStats.aggregate([
              { $match: { guildId: guild.id, userId: targetUser.id, date: { $gte: sevenDaysAgo } } },
              { $group: { _id: null, totalMs: { $sum: '$voiceDurationMs' } } }
            ])
          ]);

          if (totalVoiceAgg.length > 0 && totalVoiceAgg[0].totalMs) {
            totalVoiceMs = totalVoiceAgg[0].totalMs;
          }
          if (weeklyVoiceAgg.length > 0 && weeklyVoiceAgg[0].totalMs) {
            weeklyVoiceMs = weeklyVoiceAgg[0].totalMs;
          }
        } catch (dbErr) {
          console.error('[UserStats] Voice stats error:', dbErr.message);
        }
      }

      // Live voice session addition
      const liveSession = client.voiceSessions ? client.voiceSessions.get(targetUser.id) : null;
      if (liveSession && liveSession.joinTime) {
        const liveElapsed = Date.now() - liveSession.joinTime;
        totalVoiceMs += liveElapsed;
        weeklyVoiceMs += liveElapsed;
        voiceStatusText = `🟢 Active in <#${liveSession.channelId}> (${formatDuration(liveElapsed)})`;
      } else if (targetMember?.voice?.channelId) {
        voiceStatusText = `🟢 Connected to <#${targetMember.voice.channelId}>`;
      }

      // ── 5. Activity & Gaming Statistics ──
      let topActivityText = 'None tracked';
      if (hasDb) {
        try {
          const ActivityStats = mongoose.models.ActivityStats || mongoose.model('ActivityStats');
          const topAct = await ActivityStats.findOne({ guildId: guild.id, userId: targetUser.id })
            .sort({ totalDurationMs: -1 });

          if (topAct && topAct.totalDurationMs > 0) {
            topActivityText = `**${topAct.activityName}** (${formatDuration(topAct.totalDurationMs)})`;
          }
        } catch (dbErr) {
          console.error('[UserStats] Activity stats error:', dbErr.message);
        }
      }

      // ── 6. Leveling & XP ──
      let levelText = 'Unranked';
      let xpText = '0 XP';
      let rankText = 'N/A';
      let xpProgressBar = '';

      if (hasDb) {
        try {
          const Levels = require('discord-xp');
          const xpUser = await Levels.fetch(targetUser.id, guild.id);
          if (xpUser) {
            const neededXp = Levels.xpFor(parseInt(xpUser.level) + 1);
            levelText = `Level ${xpUser.level}`;
            xpText = `${xpUser.xp.toLocaleString()} / ${neededXp.toLocaleString()} XP`;
            rankText = `#${xpUser.position || 'N/A'}`;
            xpProgressBar = `\`[${makeProgressBar(xpUser.xp, neededXp, 10)}]\``;
          }
        } catch (xpErr) {
          // Levels may not have been initialised or user has no xp
        }
      }

      // ── 7. Invites Tracked ──
      let inviteCount = 0;
      if (hasDb) {
        try {
          const InviteMap = mongoose.models.InviteMap || mongoose.model('InviteMap');
          inviteCount = await InviteMap.countDocuments({ guildId: guild.id, inviterId: targetUser.id }).catch(() => 0);
        } catch (invErr) {
          console.error('[UserStats] Invite stats error:', invErr.message);
        }
      }

      // ── 8. Join Order & Server Position ──
      let joinPosition = 'N/A';
      if (targetMember?.joinedTimestamp) {
        try {
          const sortedMembers = guild.members.cache
            .filter(m => m.joinedTimestamp)
            .sort((a, b) => a.joinedTimestamp - b.joinedTimestamp);

          const idx = Array.from(sortedMembers.keys()).indexOf(targetUser.id);
          if (idx !== -1) {
            joinPosition = `#${idx + 1} of ${guild.memberCount}`;
          }
        } catch (e) {}
      }

      // ── 9. Construct Embed ──
      const color = targetMember?.displayHexColor && targetMember.displayHexColor !== '#000000'
        ? targetMember.displayHexColor
        : '#0059ff';

      const embed = new EmbedBuilder()
        .setAuthor({
          name: `${targetMember?.displayName || targetUser.username} — Member Statistics`,
          iconURL: targetUser.displayAvatarURL({ forceStatic: false, size: 128 })
        })
        .setThumbnail(targetUser.displayAvatarURL({ forceStatic: false, size: 256 }))
        .setColor(color)
        .setDescription(`> Comprehensive server activity & lifetime analytics for <@${targetUser.id}>`)
        .addFields([
          {
            name: `💬 Chat & Messages`,
            value: [
              `**Total Sent:** ${totalMessages.toLocaleString()} msgs`,
              `**Past 7 Days:** ${weeklyMessages.toLocaleString()} msgs`,
              `**Favorite Channel:** ${favoriteChannelText}`
            ].join('\n'),
            inline: true
          },
          {
            name: `🎙️ Voice Activity`,
            value: [
              `**Total Voice:** ${formatDuration(totalVoiceMs)}`,
              `**Past 7 Days:** ${formatDuration(weeklyVoiceMs)}`,
              `**Status:** ${voiceStatusText}`
            ].join('\n'),
            inline: true
          },
          {
            name: `🤖 Bot Interactions`,
            value: [
              `**Commands Used:** ${totalCommands.toLocaleString()}`,
              `**Favorite:** ${favoriteCmd}`,
              `**Last Used:** ${lastCmdText}`
            ].join('\n'),
            inline: true
          },
          {
            name: `🏆 Level & Rank`,
            value: [
              `**Rank:** ${rankText}`,
              `**Level:** ${levelText}`,
              `**XP:** ${xpText}`,
              xpProgressBar ? `${xpProgressBar}` : ''
            ].filter(Boolean).join('\n'),
            inline: true
          },
          {
            name: `🤝 Server & Social`,
            value: [
              `**Members Invited:** ${inviteCount} user${inviteCount === 1 ? '' : 's'}`,
              `**Top Game:** ${topActivityText}`,
              `**Join Order:** ${joinPosition}`
            ].join('\n'),
            inline: true
          },
          {
            name: `📅 Server Milestones`,
            value: [
              `**Joined Server:** ${targetMember?.joinedTimestamp ? `<t:${Math.floor(targetMember.joinedTimestamp / 1000)}:R>` : 'Unknown'}`,
              `**Account Created:** <t:${Math.floor(targetUser.createdTimestamp / 1000)}:R>`,
              `**Roles:** ${targetMember ? targetMember.roles.cache.filter(r => r.id !== guild.id).size : 0} roles`
            ].join('\n'),
            inline: true
          }
        ])
        .setFooter({
          text: `Requested by ${message.author?.username || 'User'} • SC SmartTech Stats`,
          iconURL: message.author?.displayAvatarURL ? message.author.displayAvatarURL({ forceStatic: false }) : undefined
        })
        .setTimestamp();

      return message.channel.send({ embeds: [embed] });
    } catch (err) {
      return sendError(message, {
        title: 'Failed to retrieve user statistics',
        description: 'An unexpected error occurred while compiling member statistics. Please try again later.',
        command: 'userstats',
        error: err
      });
    }
  }
};
