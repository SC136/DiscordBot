const Discord = require("discord.js");
const mongoose = require("mongoose");

module.exports = {
  name: 'analytics',
  aliases: ['serverstats', 'svan', 'anal', 'stats'],
  description: 'View server statistics and analytics trend over the last few days.',
  run: async (client, message, args) => {
    if (!process.env.MONGO_URI) {
      return message.channel.send("❌ *MongoDB is not configured in the environment variables. Analytics tracking is disabled.*");
    }

    try {
      const DailyGuildStats = mongoose.models.DailyGuildStats || mongoose.model('DailyGuildStats');
      const MemberMessageStats = mongoose.models.MemberMessageStats || mongoose.model('MemberMessageStats');
      const MemberVoiceStats = mongoose.models.MemberVoiceStats || mongoose.model('MemberVoiceStats');
      
      const guild = message.guild;

      // Parse and validate days (default 7, min 1, max 30)
      const daysParam = parseInt(args[0]) || 7;
      const days = Math.min(Math.max(daysParam, 1), 30);

      const today = new Date();
      today.setUTCHours(0, 0, 0, 0);

      const startDate = new Date(today);
      startDate.setUTCDate(today.getUTCDate() - (days - 1));

      // 1. Calculate transient active voice session runtimes to include them live
      const liveVoiceMap = {};
      client.voiceSessions.forEach((session, userId) => {
        const member = guild.members.cache.get(userId);
        if (member) {
          const elapsed = Date.now() - session.joinTime;
          if (!liveVoiceMap[userId]) {
            liveVoiceMap[userId] = { channelId: session.channelId, elapsedMs: 0 };
          }
          liveVoiceMap[userId].elapsedMs += elapsed;
        }
      });

      // 2. Fetch Daily Guild Stats (joins, leaves, members)
      const rawGuildStats = await DailyGuildStats.find({
        guildId: guild.id,
        date: { $gte: startDate, $lte: today }
      }).sort({ date: 1 });

      const dailyStatsMap = {};
      rawGuildStats.forEach(s => {
        const dateStr = new Date(s.date).toISOString().split('T')[0];
        dailyStatsMap[dateStr] = s;
      });

      const dailyStats = [];
      let runningMemberCount = guild.memberCount;

      for (let i = days - 1; i >= 0; i--) {
        const d = new Date(today);
        d.setUTCDate(today.getUTCDate() - i);
        const dateStr = d.toISOString().split('T')[0];

        if (dailyStatsMap[dateStr]) {
          runningMemberCount = dailyStatsMap[dateStr].memberCount || runningMemberCount;
          dailyStats.push({
            date: dateStr,
            joins: dailyStatsMap[dateStr].joins || 0,
            leaves: dailyStatsMap[dateStr].leaves || 0,
            memberCount: runningMemberCount,
            messages: 0,
            voiceHours: 0
          });
        } else {
          dailyStats.push({
            date: dateStr,
            joins: 0,
            leaves: 0,
            memberCount: runningMemberCount,
            messages: 0,
            voiceHours: 0
          });
        }
      }

      // 3. Fetch daily message volume
      const messageDaily = await MemberMessageStats.aggregate([
        { $match: { guildId: guild.id, date: { $gte: startDate, $lte: today } } },
        { $group: { _id: "$date", count: { $sum: "$messageCount" } } }
      ]);

      const messageDailyMap = {};
      messageDaily.forEach(s => {
        const dateStr = new Date(s._id).toISOString().split('T')[0];
        messageDailyMap[dateStr] = s.count;
      });

      // 4. Fetch daily voice hours
      const voiceDaily = await MemberVoiceStats.aggregate([
        { $match: { guildId: guild.id, date: { $gte: startDate, $lte: today } } },
        { $group: { _id: "$date", duration: { $sum: "$voiceDurationMs" } } }
      ]);

      const voiceDailyMap = {};
      voiceDaily.forEach(s => {
        const dateStr = new Date(s._id).toISOString().split('T')[0];
        voiceDailyMap[dateStr] = s.duration;
      });

      // Merge messages and voice stats
      dailyStats.forEach(stat => {
        const dateStr = stat.date;
        stat.messages = messageDailyMap[dateStr] || 0;
        
        let voiceMs = voiceDailyMap[dateStr] || 0;
        if (dateStr === today.toISOString().split('T')[0]) {
          Object.values(liveVoiceMap).forEach(session => {
            voiceMs += session.elapsedMs;
          });
        }
        stat.voiceHours = parseFloat((voiceMs / 3600000).toFixed(2));
      });

      // 5. Top Chatters
      const rawTopChatters = await MemberMessageStats.aggregate([
        { $match: { guildId: guild.id, date: { $gte: startDate, $lte: today } } },
        { $group: { _id: "$userId", count: { $sum: "$messageCount" } } },
        { $sort: { count: -1 } },
        { $limit: 5 }
      ]);

      const topChatters = rawTopChatters.map((c, i) => {
        const member = guild.members.cache.get(c._id);
        const mention = member ? `<@${c._id}>` : `\`User ${c._id}\``;
        return `\`${i + 1}.\` ${mention} — **${c.count.toLocaleString()}** msgs`;
      });

      // 6. Top Text Channels
      const rawTopTextChannels = await MemberMessageStats.aggregate([
        { $match: { guildId: guild.id, date: { $gte: startDate, $lte: today } } },
        { $group: { _id: "$channelId", count: { $sum: "$messageCount" } } },
        { $sort: { count: -1 } },
        { $limit: 5 }
      ]);

      const topTextChannels = rawTopTextChannels.map((ch, i) => {
        const channel = guild.channels.cache.get(ch._id);
        const mention = channel ? `<#${ch._id}>` : `\`#deleted-channel\``;
        return `\`${i + 1}.\` ${mention} — **${ch.count.toLocaleString()}** msgs`;
      });

      // 7. Top Voice Members (including current live session)
      const rawTopVoice = await MemberVoiceStats.aggregate([
        { $match: { guildId: guild.id, date: { $gte: startDate, $lte: today } } },
        { $group: { _id: "$userId", duration: { $sum: "$voiceDurationMs" } } }
      ]);

      const voiceDurationMap = {};
      rawTopVoice.forEach(p => {
        voiceDurationMap[p._id] = p.duration;
      });

      Object.keys(liveVoiceMap).forEach(userId => {
        if (!voiceDurationMap[userId]) voiceDurationMap[userId] = 0;
        voiceDurationMap[userId] += liveVoiceMap[userId].elapsedMs;
      });

      const topVoiceMembers = Object.entries(voiceDurationMap)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5)
        .map(([userId, durationMs], i) => {
          const member = guild.members.cache.get(userId);
          const mention = member ? `<@${userId}>` : `\`User ${userId}\``;
          const hours = (durationMs / 3600000).toFixed(1);
          return `\`${i + 1}.\` ${mention} — **${hours}** hours`;
        });

      // 8. Top Voice Channels (including current live session)
      const rawTopVoiceChannels = await MemberVoiceStats.aggregate([
        { $match: { guildId: guild.id, date: { $gte: startDate, $lte: today } } },
        { $group: { _id: "$channelId", duration: { $sum: "$voiceDurationMs" } } }
      ]);

      const voiceChannelDurationMap = {};
      rawTopVoiceChannels.forEach(ch => {
        voiceChannelDurationMap[ch._id] = ch.duration;
      });

      Object.values(liveVoiceMap).forEach(session => {
        if (!voiceChannelDurationMap[session.channelId]) voiceChannelDurationMap[session.channelId] = 0;
        voiceChannelDurationMap[session.channelId] += session.elapsedMs;
      });

      const topVoiceChannels = Object.entries(voiceChannelDurationMap)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5)
        .map(([channelId, durationMs], i) => {
          const hours = (durationMs / 3600000).toFixed(1);
          return `\`${i + 1}.\` <#${channelId}> — **${hours}** hours`;
        });

      // Helper format functions for daily table
      const formatDate = (dateStr) => {
        const parts = dateStr.split('-');
        return `${parts[1]}-${parts[2]}`;
      };

      const formatCount = (count) => {
        if (count >= 1000) {
          return `${(count / 1000).toFixed(1)}k`;
        }
        return count.toString();
      };

      // Build daily trend ASCII table
      let tableText = "Date   | Msg  | Voice | Joins/Leaves\n";
      tableText +=    "───────┼──────┼───────┼─────────────\n";
      dailyStats.forEach(stat => {
        const dt = formatDate(stat.date).padEnd(6);
        const msg = formatCount(stat.messages).padEnd(4);
        const voice = `${stat.voiceHours.toFixed(1)}h`.padEnd(5);
        const jl = `+${stat.joins}/-${stat.leaves}`;
        tableText += `${dt} | ${msg} | ${voice} | ${jl}\n`;
      });

      const embed = new Discord.MessageEmbed()
        .setTitle(`📊 Server Analytics Trend — Past ${days} Days`)
        .setColor('#0059FF')
        .setDescription(`\`\`\`\n${tableText}\`\`\``)
        .setThumbnail(guild.iconURL({ dynamic: true, size: 256 }))
        .setTimestamp()
        .setFooter(`Stats for ${guild.name} | SC SmartTech`);

      // Add Top Chatters & Text Channels columns
      embed.addField('💬 Top Chatters', topChatters.length > 0 ? topChatters.join('\n') : '*No text messages recorded*', true);
      embed.addField('📁 Top Text Channels', topTextChannels.length > 0 ? topTextChannels.join('\n') : '*No channel data*', true);
      
      // Blank line break if needed, then Voice Stats
      embed.addField('\u200B', '\u200B', false);
      embed.addField('🔊 Top Voice Members', topVoiceMembers.length > 0 ? topVoiceMembers.join('\n') : '*No voice activity*', true);
      embed.addField('🎙️ Top Voice Channels', topVoiceChannels.length > 0 ? topVoiceChannels.join('\n') : '*No channel data*', true);

      return message.channel.send(embed);
    } catch (err) {
      console.error("Error in analytics command:", err);
      return message.channel.send(`❌ *An error occurred while retrieving server analytics: ${err.message}*`);
    }
  }
};
