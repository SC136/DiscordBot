//SC SmartTech
require('dotenv').config();

// Global error handlers to prevent crashes from unhandled rejections or uncaught exceptions
process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
});

process.on('uncaughtException', (err, origin) => {
  console.error(`Uncaught Exception: ${err.message}\nOrigin: ${origin}\nStack: ${err.stack}`);
});

const {
  Collection,
  Client,
  MessageEmbed,
  Application,
  WebhookClient
} = require('discord.js');
const fs = require('fs');
const client = new Client({
  disableMentions: `all`,
  partials: ["MESSAGE", "CHANNEL", "REACTION"]
});
// Discord.Constants.DefaultOptions.ws.properties.$browser = "Discord Android";
const config = require('./config.json');
const prefix = config.prefix;
const token = process.env.TOKEN;
const { promisify } = require('util');
const wait = promisify(setTimeout);
const ytdl = require('ytdl-core');
const fetch = require("node-fetch");
const Levels = require('discord-xp');
const mongoose = require('mongoose');

if (process.env.MONGO_URI) {
  Levels.setURL(process.env.MONGO_URI);
  console.log("Connected to MongoDB for Levels (discord-xp) ✅");

  mongoose.connect(process.env.MONGO_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
    useFindAndModify: false,
    useCreateIndex: true
  }).then(() => console.log("Connected to MongoDB for Activity Tracking ✅"))
    .catch(err => console.error("Failed to connect to MongoDB for Activity Tracking:", err));
} else {
  console.warn("WARNING: MONGO_URI is not defined in .env. Levels (discord-xp) commands will be disabled.");
}

// Activity Stats Schema
const activityStatsSchema = new mongoose.Schema({
  userId: { type: String, required: true },
  guildId: { type: String, required: true },
  activityName: { type: String, required: true },
  activityType: { type: String, required: true },
  totalDurationMs: { type: Number, default: 0 },
  currentSessionStart: { type: Date, default: null },
  lastActive: { type: Date, default: Date.now }
});

activityStatsSchema.index({ userId: 1, guildId: 1, activityName: 1 }, { unique: true });
const ActivityStats = mongoose.model('ActivityStats', activityStatsSchema);

// Daily Guild Stats Schema (joins, leaves, members)
const dailyGuildStatsSchema = new mongoose.Schema({
  date: { type: Date, required: true },
  guildId: { type: String, required: true },
  memberCount: { type: Number, default: 0 },
  joins: { type: Number, default: 0 },
  leaves: { type: Number, default: 0 }
});
dailyGuildStatsSchema.index({ date: 1, guildId: 1 }, { unique: true });
const DailyGuildStats = mongoose.model('DailyGuildStats', dailyGuildStatsSchema);

// Member Message Stats Schema
const memberMessageStatsSchema = new mongoose.Schema({
  date: { type: Date, required: true },
  guildId: { type: String, required: true },
  userId: { type: String, required: true },
  channelId: { type: String, required: true },
  messageCount: { type: Number, default: 0 }
});
memberMessageStatsSchema.index({ date: 1, guildId: 1, userId: 1, channelId: 1 }, { unique: true });
const MemberMessageStats = mongoose.model('MemberMessageStats', memberMessageStatsSchema);

// Member Voice Stats Schema
const memberVoiceStatsSchema = new mongoose.Schema({
  date: { type: Date, required: true },
  guildId: { type: String, required: true },
  userId: { type: String, required: true },
  channelId: { type: String, required: true },
  voiceDurationMs: { type: Number, default: 0 }
});
memberVoiceStatsSchema.index({ date: 1, guildId: 1, userId: 1, channelId: 1 }, { unique: true });
const MemberVoiceStats = mongoose.model('MemberVoiceStats', memberVoiceStatsSchema);

// Transient in-memory map to track voice call sessions
client.voiceSessions = new Map();

////////////////////////////////////////
// ── Web Dashboard & API ──
const express = require("express");
const path = require("path");
const app = express();
const port = 3333;

app.use(express.json());
app.use(express.static(path.join(__dirname, 'dashboard')));

// Auth middleware — checks DASHBOARD_KEY from query param or header
function dashAuth(req, res, next) {
  const key = req.query.key || req.headers['x-dashboard-key'];
  if (!process.env.DASHBOARD_KEY || key !== process.env.DASHBOARD_KEY) {
    return res.status(403).json({ error: 'Unauthorized' });
  }
  next();
}

// GET /api/stats — Server statistics
app.get('/api/stats', dashAuth, (req, res) => {
  try {
    const guild = client.guilds.cache.get(config.guild);
    if (!guild) return res.json({ error: 'Guild not found', memberCount: 0, onlineCount: 0, channelCount: 0, uptimeMs: client.uptime || 0 });

    const onlineCount = guild.members.cache.filter(m => m.presence && m.presence.status !== 'offline').size;
    res.json({
      serverName: guild.name,
      serverIcon: guild.iconURL({ dynamic: true, size: 128 }),
      memberCount: guild.memberCount,
      onlineCount: onlineCount,
      channelCount: guild.channels.cache.size,
      roleCount: guild.roles.cache.size,
      uptimeMs: client.uptime || 0
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/leaderboard — Top 10 XP leaderboard from MongoDB
app.get('/api/leaderboard', dashAuth, async (req, res) => {
  try {
    if (!process.env.MONGO_URI) return res.json([]);
    const rawLb = await Levels.fetchLeaderboard(client, config.guild, 10);
    const lb = rawLb.map((entry, i) => ({
      userID: entry.userID,
      username: entry.username || `User#${entry.discriminator || '0000'}`,
      level: entry.level,
      xp: entry.xp
    }));
    res.json(lb);
  } catch (err) {
    res.json([]);
  }
});

// GET /api/activity — Top games, top active members, and live activity
app.get('/api/activity', dashAuth, async (req, res) => {
  try {
    const guild = client.guilds.cache.get(config.guild);
    if (!guild) return res.json({ topGames: [], topPlayers: [], liveActivities: [] });

    // Self-healing check for live activities:
    // Find all docs in DB marked as currently active
    const activeDocs = await ActivityStats.find({ currentSessionStart: { $ne: null } });
    for (const doc of activeDocs) {
      const member = guild.members.cache.get(doc.userId);
      const isStillPlaying = member && member.presence && member.presence.activities.some(act => act.name === doc.activityName && act.type !== 'CUSTOM' && act.type !== 'CUSTOM_STATUS');
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

    const allStats = await ActivityStats.find({});
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
        if (!gamesMap[doc.activityName]) {
          gamesMap[doc.activityName] = { name: doc.activityName, type: doc.activityType, durationMs: 0, activeCount: 0 };
        }
        gamesMap[doc.activityName].durationMs += duration;
        if (isLive) {
          gamesMap[doc.activityName].activeCount += 1;
        }

        if (!playersMap[doc.userId]) {
          playersMap[doc.userId] = { userId: doc.userId, durationMs: 0 };
        }
        playersMap[doc.userId].durationMs += duration;
      }

      if (isLive) {
        const member = guild.members.cache.get(doc.userId);
        const username = member ? (member.user.username || `User#${member.user.discriminator || '0000'}`) : `User ${doc.userId}`;
        const avatar = member ? member.user.displayAvatarURL({ size: 64 }) : null;
        liveActivities.push({
          userId: doc.userId,
          username,
          avatar,
          activityName: doc.activityName,
          elapsedMs: liveDurationMs
        });
      }
    }

    const topGames = Object.values(gamesMap)
      .sort((a, b) => b.durationMs - a.durationMs)
      .slice(0, 5)
      .map(g => ({
        name: g.name,
        type: g.type,
        hours: parseFloat((g.durationMs / 3600000).toFixed(2)),
        activeCount: g.activeCount
      }));

    const topPlayers = Object.values(playersMap)
      .sort((a, b) => b.durationMs - a.durationMs)
      .slice(0, 5)
      .map(p => {
        const member = guild.members.cache.get(p.userId);
        const username = member ? (member.user.username || `User#${member.user.discriminator || '0000'}`) : `User ${p.userId}`;
        const avatar = member ? member.user.displayAvatarURL({ size: 64 }) : null;
        return {
          userId: p.userId,
          username,
          avatar,
          hours: parseFloat((p.durationMs / 3600000).toFixed(2))
        };
      });

    res.json({ topGames, topPlayers, liveActivities });
  } catch (err) {
    console.error("Error in GET /api/activity:", err);
    res.status(500).json({ error: err.message });
  }
});

// GET /api/analytics — Analytics charts, messages, voice statistics
app.get('/api/analytics', dashAuth, async (req, res) => {
  try {
    const daysParam = parseInt(req.query.days) || 14;
    const days = Math.min(Math.max(daysParam, 1), 30);

    const guild = client.guilds.cache.get(config.guild);
    if (!guild) return res.json({ dailyStats: [], topChatters: [], topTextChannels: [], topVoiceMembers: [], topVoiceChannels: [] });

    const today = new Date();
    today.setUTCHours(0, 0, 0, 0);

    const startDate = new Date(today);
    startDate.setUTCDate(today.getUTCDate() - (days - 1));

    // Calculate transient voice session runtimes to include them in real-time
    const liveVoiceMap = {};
    client.voiceSessions.forEach((session, userId) => {
      const elapsed = Date.now() - session.joinTime;
      if (!liveVoiceMap[userId]) {
        liveVoiceMap[userId] = { channelId: session.channelId, elapsedMs: 0 };
      }
      liveVoiceMap[userId].elapsedMs += elapsed;
    });

    // 1. Fetch Daily Guild Stats (joins, leaves, members)
    const rawGuildStats = await DailyGuildStats.find({
      guildId: config.guild,
      date: { $gte: startDate, $lte: today }
    }).sort({ date: 1 });

    // Fill gaps in daily member stats
    const dailyStatsMap = {};
    rawGuildStats.forEach(s => {
      const dateStr = new Date(s.date).toISOString().split('T')[0];
      dailyStatsMap[dateStr] = s;
    });

    const dailyStats = [];
    let runningMemberCount = guild.memberCount;
    
    // We fetch reverse chronological order from today back to startDate to properly extrapolate member count
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

    // 2. Fetch daily message volume
    const messageDaily = await MemberMessageStats.aggregate([
      { $match: { guildId: config.guild, date: { $gte: startDate, $lte: today } } },
      { $group: { _id: "$date", count: { $sum: "$messageCount" } } }
    ]);

    const messageDailyMap = {};
    messageDaily.forEach(s => {
      const dateStr = new Date(s._id).toISOString().split('T')[0];
      messageDailyMap[dateStr] = s.count;
    });

    // 3. Fetch daily voice hours
    const voiceDaily = await MemberVoiceStats.aggregate([
      { $match: { guildId: config.guild, date: { $gte: startDate, $lte: today } } },
      { $group: { _id: "$date", duration: { $sum: "$voiceDurationMs" } } }
    ]);

    const voiceDailyMap = {};
    voiceDaily.forEach(s => {
      const dateStr = new Date(s._id).toISOString().split('T')[0];
      voiceDailyMap[dateStr] = s.duration;
    });

    // Merge messages and voice stats into dailyStats array, adding live voice call time
    dailyStats.forEach(stat => {
      const dateStr = stat.date;
      stat.messages = messageDailyMap[dateStr] || 0;
      
      let voiceMs = voiceDailyMap[dateStr] || 0;
      // If stat is for today, add current running voice sessions
      if (dateStr === today.toISOString().split('T')[0]) {
        Object.values(liveVoiceMap).forEach(session => {
          voiceMs += session.elapsedMs;
        });
      }
      stat.voiceHours = parseFloat((voiceMs / 3600000).toFixed(2));
    });

    // 4. Top Chatters
    const rawTopChatters = await MemberMessageStats.aggregate([
      { $match: { guildId: config.guild, date: { $gte: startDate, $lte: today } } },
      { $group: { _id: "$userId", count: { $sum: "$messageCount" } } },
      { $sort: { count: -1 } },
      { $limit: 5 }
    ]);

    const topChatters = rawTopChatters.map((c, i) => {
      const member = guild.members.cache.get(c._id);
      const username = member ? (member.user.username || `User#${member.user.discriminator || '0000'}`) : `User ${c._id}`;
      const avatar = member ? member.user.displayAvatarURL({ size: 64 }) : null;
      return {
        rank: i + 1,
        username,
        avatar,
        messages: c.count
      };
    });

    // 5. Top Text Channels
    const rawTopTextChannels = await MemberMessageStats.aggregate([
      { $match: { guildId: config.guild, date: { $gte: startDate, $lte: today } } },
      { $group: { _id: "$channelId", count: { $sum: "$messageCount" } } },
      { $sort: { count: -1 } },
      { $limit: 5 }
    ]);

    const topTextChannels = rawTopTextChannels.map((ch, i) => {
      const channel = guild.channels.cache.get(ch._id);
      const name = channel ? channel.name : `deleted-channel`;
      return {
        rank: i + 1,
        name: `#${name}`,
        messages: ch.count
      };
    });

    // 6. Top Voice Members (including current live session)
    const rawTopVoice = await MemberVoiceStats.aggregate([
      { $match: { guildId: config.guild, date: { $gte: startDate, $lte: today } } },
      { $group: { _id: "$userId", duration: { $sum: "$voiceDurationMs" } } }
    ]);

    const voiceDurationMap = {};
    rawTopVoice.forEach(p => {
      voiceDurationMap[p._id] = p.duration;
    });

    // Mix in active voice sessions
    Object.keys(liveVoiceMap).forEach(userId => {
      if (!voiceDurationMap[userId]) voiceDurationMap[userId] = 0;
      voiceDurationMap[userId] += liveVoiceMap[userId].elapsedMs;
    });

    const topVoiceMembers = Object.entries(voiceDurationMap)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([userId, durationMs], i) => {
        const member = guild.members.cache.get(userId);
        const username = member ? (member.user.username || `User#${member.user.discriminator || '0000'}`) : `User ${userId}`;
        const avatar = member ? member.user.displayAvatarURL({ size: 64 }) : null;
        return {
          rank: i + 1,
          username,
          avatar,
          hours: parseFloat((durationMs / 3600000).toFixed(2))
        };
      });

    // 7. Top Voice Channels (including current live session)
    const rawTopVoiceChannels = await MemberVoiceStats.aggregate([
      { $match: { guildId: config.guild, date: { $gte: startDate, $lte: today } } },
      { $group: { _id: "$channelId", duration: { $sum: "$voiceDurationMs" } } }
    ]);

    const voiceChannelDurationMap = {};
    rawTopVoiceChannels.forEach(ch => {
      voiceChannelDurationMap[ch._id] = ch.duration;
    });

    // Mix in active voice sessions channel locations
    Object.values(liveVoiceMap).forEach(session => {
      if (!voiceChannelDurationMap[session.channelId]) voiceChannelDurationMap[session.channelId] = 0;
      voiceChannelDurationMap[session.channelId] += session.elapsedMs;
    });

    const topVoiceChannels = Object.entries(voiceChannelDurationMap)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([channelId, durationMs], i) => {
        const channel = guild.channels.cache.get(channelId);
        const name = channel ? channel.name : `General`;
        return {
          rank: i + 1,
          name,
          hours: parseFloat((durationMs / 3600000).toFixed(2))
        };
      });

    res.json({
      dailyStats,
      topChatters,
      topTextChannels,
      topVoiceMembers,
      topVoiceChannels
    });
  } catch (err) {
    console.error("Error in GET /api/analytics:", err);
    res.status(500).json({ error: err.message });
  }
});

// GET /api/config — Current bot configuration
app.get('/api/config', dashAuth, (req, res) => {
  const fresh = JSON.parse(fs.readFileSync('./config.json', 'utf8'));
  res.json({ prefix: fresh.prefix, color: fresh.color, owner: fresh.owner, guild: fresh.guild });
});

// POST /api/config — Update prefix and color
app.post('/api/config', dashAuth, (req, res) => {
  try {
    const { prefix: newPrefix, color: newColor } = req.body;
    const cfg = JSON.parse(fs.readFileSync('./config.json', 'utf8'));

    if (newPrefix && typeof newPrefix === 'string') cfg.prefix = newPrefix.trim();
    if (newColor && typeof newColor === 'string' && /^#[0-9A-Fa-f]{3,8}$/.test(newColor.trim())) {
      cfg.color = newColor.trim();
    }

    fs.writeFileSync('./config.json', JSON.stringify(cfg, null, 2));
    // Update live config
    client.color = cfg.color;
    res.json({ success: true, config: cfg });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.listen(port, () => {
  console.log(`Dashboard live at http://localhost:${port}`);
});
////////////////////////////////////////

client.owner = config.owner;
client.color = config.color;
client.guild = config.guild;
client.commands = new Collection();
client.aliases = new Collection();
client.categories = fs.readdirSync('./commands/');
['command'].forEach(handler => {
  require(`./handlers/${handler}`)(client);
});

// Set Activity & Log In Console

client.on('ready', () => {
  client.user.setActivity({
    name: 'SC SmartTech',
    type: 'STREAMING',
    url: "https://www.twitch.tv/sc_136"
  });
  console.log(`${client.user.username} ✅`);
});

// Join VC On Ready

client.on("ready", async () => {
  const channelId = '708701200928997467';
  const joinvc = client.channels.cache.get(channelId);
  if (joinvc) {
    try {
      console.log(`Attempting to join voice channel: ${joinvc.name || channelId}...`);
      const connection = await joinvc.join();
      console.log(`Successfully joined voice channel: ${joinvc.name || channelId}`);
    } catch (err) {
      console.error(`Failed to join voice channel ${channelId}:`, err.message);
    }
  } else {
    console.log(`Voice channel ${channelId} not found in cache.`);
  }
});

// Activity Tracking Startup Initialization
client.on('ready', async () => {
  console.log("Initializing Activity Tracking on ready...");
  const guild = client.guilds.cache.get(config.guild);
  if (guild) {
    try {
      console.log(`Fetching all members for guild ${config.guild} to populate cache...`);
      await guild.members.fetch();
      console.log(`Fetched ${guild.members.cache.size} members ✅`);

      // Clean up dangling sessions (if bot crashed/restarted while tracking)
      const resetResult = await ActivityStats.updateMany(
        { currentSessionStart: { $ne: null } },
        { $set: { currentSessionStart: null } }
      );
      console.log(`Reset dangling activity sessions:`, resetResult);

      // Scan current presences and initialize tracking
      let initCount = 0;
      guild.members.cache.forEach(async (member) => {
        if (member.user.bot) return;
        if (member.presence && member.presence.activities) {
          const trackable = member.presence.activities.filter(act => act && act.type !== 'CUSTOM' && act.type !== 'CUSTOM_STATUS' && act.name);
          for (const act of trackable) {
            try {
              await ActivityStats.findOneAndUpdate(
                { userId: member.user.id, guildId: guild.id, activityName: act.name },
                { 
                  $set: { 
                    currentSessionStart: new Date(),
                    activityType: act.type 
                  } 
                },
                { upsert: true }
              );
              initCount++;
            } catch (err) {
              console.error(`Error initializing startup activity for ${member.user.id}:`, err);
            }
          }
        }
      });
      console.log(`Initialized tracking for ${initCount} active member sessions.`);

      // Scan voice channels on startup to initialize sessions
      let voiceInitCount = 0;
      guild.channels.cache.forEach(channel => {
        if (channel.type === 'voice') {
          channel.members.forEach(member => {
            if (member.user.bot) return;
            client.voiceSessions.set(member.id, {
              channelId: channel.id,
              joinTime: Date.now()
            });
            voiceInitCount++;
          });
        }
      });
      console.log(`Initialized tracking for ${voiceInitCount} active voice channel sessions.`);
    } catch (err) {
      console.error(`Failed to initialize Activity Tracking:`, err);
    }
  } else {
    console.warn(`Guild ${config.guild} not found on ready. Activity tracking might not initialize correctly.`);
  }
});

// Activity Tracking: presenceUpdate Listener
client.on('presenceUpdate', async (oldPresence, newPresence) => {
  try {
    if (!newPresence || !newPresence.guild) return;
    if (newPresence.guild.id !== config.guild) return;

    const userId = newPresence.userID;
    const user = client.users.cache.get(userId);
    if (user && user.bot) return;

    const guildId = newPresence.guild.id;
    const newActivities = newPresence.activities || [];
    const oldActivities = (oldPresence && oldPresence.activities) || [];

    const isTrackable = (act) => act && act.type !== 'CUSTOM' && act.type !== 'CUSTOM_STATUS' && act.name;

    const newTrackable = newActivities.filter(isTrackable);
    const oldTrackable = oldActivities.filter(isTrackable);

    // 1. Started activities
    for (const act of newTrackable) {
      const wasPlaying = oldTrackable.some(oldAct => oldAct.name === act.name);
      if (!wasPlaying) {
        try {
          await ActivityStats.findOneAndUpdate(
            { userId, guildId, activityName: act.name },
            { 
              $set: { 
                currentSessionStart: new Date(),
                activityType: act.type 
              } 
            },
            { upsert: true, new: true }
          );
        } catch (err) {
          console.error(`Error starting activity session for user ${userId}:`, err);
        }
      }
    }

    // 2. Stopped activities
    for (const act of oldTrackable) {
      const isStillPlaying = newTrackable.some(newAct => newAct.name === act.name);
      if (!isStillPlaying) {
        try {
          const doc = await ActivityStats.findOne({ userId, guildId, activityName: act.name });
          if (doc && doc.currentSessionStart) {
            const duration = Date.now() - doc.currentSessionStart.getTime();
            await ActivityStats.updateOne(
              { userId, guildId, activityName: act.name },
              {
                $set: { currentSessionStart: null, lastActive: new Date() },
                $inc: { totalDurationMs: duration }
              }
            );
          }
        } catch (err) {
          console.error(`Error stopping activity session for user ${userId}:`, err);
        }
      }
    }
  } catch (err) {
    console.error('Error in presenceUpdate handler:', err);
  }
});

// Activity Tracking: voiceStateUpdate Listener
client.on('voiceStateUpdate', async (oldState, newState) => {
  try {
    if (newState.member && newState.member.user.bot) return;
    if (newState.guild.id !== config.guild) return;

    const userId = newState.id;
    const guildId = newState.guild.id;
    const oldChannelId = oldState.channelID;
    const newChannelId = newState.channelID;
    const now = Date.now();

    // User left or switched channels -> complete previous session
    if (oldChannelId && oldChannelId !== newChannelId) {
      const session = client.voiceSessions.get(userId);
      if (session && session.channelId === oldChannelId) {
        const duration = now - session.joinTime;
        client.voiceSessions.delete(userId);

        if (duration > 0) {
          const today = new Date();
          today.setUTCHours(0, 0, 0, 0);

          await MemberVoiceStats.updateOne(
            { date: today, guildId, userId, channelId: oldChannelId },
            { $inc: { voiceDurationMs: duration } },
            { upsert: true }
          );
        }
      }
    }

    // User joined or switched channels -> start new session
    if (newChannelId && oldChannelId !== newChannelId) {
      client.voiceSessions.set(userId, {
        channelId: newChannelId,
        joinTime: now
      });
    }
  } catch (err) {
    console.error('Error in voiceStateUpdate handler:', err);
  }
});

//Message

client.on('message', async message => {
  if (message.author.bot) return;
  if (!message.guild || message.guild.id !== config.guild) return;

  // Track message stats
  try {
    const today = new Date();
    today.setUTCHours(0, 0, 0, 0);

    await MemberMessageStats.updateOne(
      { date: today, guildId: message.guild.id, userId: message.author.id, channelId: message.channel.id },
      { $inc: { messageCount: 1 } },
      { upsert: true }
    );
  } catch (err) {
    console.error('Error tracking message stats:', err);
  }

  if (!message.content.startsWith(prefix)) return;
  if (!message.member)
    message.member = await message.guild.fetchMember(message);
  const args = message.content
    .slice(prefix.length)
    .trim()
    .split(/ +/g);
  const cmd = args.shift().toLowerCase();
  if (cmd.length == 0) return;
  let command = client.commands.get(cmd);
  if (!command) command = client.commands.get(client.aliases.get(cmd));
  if (command) command.run(client, message, args);
});

//Welcome Embed

client.on('guildMemberAdd', async member => {
  if (member.user.bot) return;

  // Track daily join stats
  if (member.guild.id === config.guild) {
    try {
      const today = new Date();
      today.setUTCHours(0, 0, 0, 0);

      await DailyGuildStats.updateOne(
        { date: today, guildId: member.guild.id },
        { 
          $inc: { joins: 1 },
          $set: { memberCount: member.guild.memberCount }
        },
        { upsert: true }
      );
    } catch (err) {
      console.error('Error tracking daily joins:', err);
    }
  }

  const role = member.guild.roles.cache.find(role => role.id === "595587230698045442")
  member.roles.add(role)
  const channel = member.guild.channels.cache.find(
    channel => channel.id === '714858330295631965'
  );
  if (!channel) return;
  const membername = member.user.username;
  const embed = new MessageEmbed()
    .setTitle(
      `<:SCSmartTechLogo:793665812493893652> Welcome ${membername}! To SC SmartTech Official Discord Server!!!`
    )
    .setThumbnail(`${member.user.displayAvatarURL()}`)
    .setDescription(
      'Make Sure To Read The Rules From <#708001083729117236> Channel, And Enjoy!!!\nAlso Get Some Roles From <#711594165078851646>!!!'
    )
    .setImage(
      'https://media.discordapp.net/attachments/779005181760765985/795528671888015430/unknown.png?width=1440&height=460'
    )
    .addField(
      `And Now We Have ${member.guild.memberCount} Members!!!`,
      '<@&595587230698045442> Greet Them In <#594513706055106562>!!!'
    )
    .setFooter(`${member.user.tag} Just Joined The Server!!!`)
    .setColor('#7289DA')
    .setTimestamp();
  channel.send(`***Hey! ${member}***`, embed);
});

//Welcome Image

client.on('guildMemberAdd', async member => {
  const channel = member.guild.channels.cache.find(
    channel => channel.id === '714858330295631965'
  );
  if (!channel) return;
  const { createCanvas, loadImage } = require('canvas');
  const canvas = createCanvas(500, 227);
  const ctx = canvas.getContext('2d');
  const target = member.user;

  let avatar;
  try {
    avatar = await loadImage(
      target.displayAvatarURL({ format: 'png', dynamic: false })
    );
  } catch (err) {
    console.error("Failed to load user avatar for welcome card:", err.message);
    try {
      avatar = await loadImage(target.defaultAvatarURL);
    } catch (e) {
      console.error("Failed to load default avatar:", e.message);
    }
  }

  // Create a premium multi-stop gradient background
  const gradient = ctx.createLinearGradient(0, 0, 500, 227);
  gradient.addColorStop(0, '#0f0c1b'); // very dark purple/black
  gradient.addColorStop(0.5, '#201a30');
  gradient.addColorStop(1, '#2c1930');
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, 500, 227);

  // Draw modern abstract ambient highlights
  ctx.fillStyle = 'rgba(114, 137, 218, 0.05)';
  ctx.beginPath();
  ctx.arc(500, 0, 250, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = 'rgba(0, 89, 255, 0.08)';
  ctx.beginPath();
  ctx.arc(0, 227, 180, 0, Math.PI * 2);
  ctx.fill();

  // Clean diagonal background pattern stripes
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.03)';
  ctx.lineWidth = 2;
  for (let i = -100; i < 600; i += 40) {
    ctx.beginPath();
    ctx.moveTo(i, 0);
    ctx.lineTo(i + 150, 227);
    ctx.stroke();
  }

  // Draw elegant Welcome text
  ctx.font = 'bold 36px sans-serif';
  ctx.fillStyle = '#0059FF';
  ctx.fillText('WELCOME', 30, 75);

  ctx.font = 'italic 16px sans-serif';
  ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
  ctx.fillText('to the official server!', 30, 110);

  if (avatar) {
    ctx.beginPath();
    ctx.arc(406, 90, 70, 0, Math.PI * 2);
    ctx.lineWidth = 5;
    ctx.strokeStyle = 'white';
    ctx.stroke();
    ctx.closePath();
    ctx.save();
    ctx.clip();
    ctx.drawImage(avatar, 336, 21, 140, 140);
    ctx.restore();
  }
  ctx.font = 'italic 30px sans-serif';
  ctx.fillStyle = 'white';
  ctx.fillText(`${target.username}`, 280, 204);
  channel.send({
    files: [
      {
        attachment: canvas.toBuffer(),
        name: 'SC-SmartTech-Welcome-Image.png'
      }
    ]
  });
});

// Leave Alert WebHook

client.on('guildMemberRemove', async member => {
  if (member.user.bot) return;

  // Track daily leaves stats
  if (member.guild.id === config.guild) {
    try {
      const today = new Date();
      today.setUTCHours(0, 0, 0, 0);

      await DailyGuildStats.updateOne(
        { date: today, guildId: member.guild.id },
        { 
          $inc: { leaves: 1 },
          $set: { memberCount: member.guild.memberCount }
        },
        { upsert: true }
      );
    } catch (err) {
      console.error('Error tracking daily leaves:', err);
    }
  }

  const channel = member.guild.channels.cache.find(
    channel => channel.id === '693471399540686848'
  );
  if (!channel) return;
  const hook = new WebhookClient(`885466185301368902`, `XmYGYuvITPpIB3xHcfv7iulqDdZa22PbSSR3bMlfKtrMXsEU7FCFrQ5O-pB_B7wi8vHC`)

  const userLink = `[${member.user.username}](<https://discord.com/users/${member.user.id}> "${member.user.tag}")`

  hook.send(`Damn ${userLink} left the server!`)

});

//Bye-Bye Embed

client.on('guildMemberRemove', member => {
  const channel = member.guild.channels.cache.find(
    channel => channel.id === '694120130040561664'
  );
  if (!channel) return;
  const membernamet = member.user.tag;
  const embed = new MessageEmbed()
    .setTitle(
      `<:SCSmartTechLogo:793665812493893652> ${membernamet} Left The Server 🙁`
    )
    .setThumbnail(`${member.user.displayAvatarURL()}`)
    .setDescription(
      `And Now We Have Only ${member.guild.memberCount} Members :(`
    )
    .setColor('#0059FF')
    .setTimestamp();
  channel.send(embed);
});

//Mention Reply

client.on('message', async message => {
  if (message.mentions.users.first()) {
    if (message.mentions.users.first().id === '695352100342857739') {
      message.channel.send(
        `Hello!!! SC SmartTech here!, the guardian , protector of SC SmartTech Discord Server!!! hahahhaa I Rule :-))) <a:Yess:793734238548787230>`
      ).then(msg => msg.delete({ timeout: 10000 }));
    }
  }
});

//Count Channel Config

let countChannel = {
  total: '710416554851958884', //replace this with the channel ids from ur guild according
  members: '710416557582319667',
  bots: '710416560988094505',
  serverID: '594513706055106560'
};

//Count Channel New User Update

client.on('guildMemberAdd', member => {
  if (member.guild.id !== countChannel.serverID) return;
  client.channels.cache
    .get(countChannel.total)
    .setName(`Total Members: ${member.guild.memberCount}`);
  client.channels.cache
    .get(countChannel.members)
    .setName(
      `Members: ${member.guild.members.cache.filter(m => !m.user.bot).size}`
    );
  client.channels.cache
    .get(countChannel.bots)
    .setName(
      `Bots: ${member.guild.members.cache.filter(m => m.user.bot).size}`
    );
});

//Count Channel User Left Update

client.on('guildMemberRemove', member => {
  if (member.guild.id !== countChannel.serverID) return;

  client.channels.cache
    .get(countChannel.total)
    .setName(`Total Members: ${member.guild.memberCount}`);
  client.channels.cache
    .get(countChannel.members)
    .setName(
      `Members: ${member.guild.members.cache.filter(m => !m.user.bot).size}`
    );
  client.channels.cache
    .get(countChannel.bots)
    .setName(
      `Bots: ${member.guild.members.cache.filter(m => m.user.bot).size}`
    );
});

//Invite Tracking System

let invites;

client.on('ready', async () => {
  await wait(2000);

  client.guilds.cache.get(client.guild).fetchInvites().then(inv => {
    invites = inv;
  })
})

client.on('guildMemberAdd', async (member) => {
  if (member.guild.id !== client.guild) return;

  member.guild.fetchInvites().then(gInvites => {
    const invite = gInvites.find((inv) => invites.get(inv.code).uses < inv.uses);

    const channel = member.guild.channels.cache.get('793694044521103370');

    channel.send(
      new MessageEmbed()
        .setDescription(`${member} Joined, Invited By ${invite.inviter} And The Code Was \`${invite.code}\``)
        .setColor(client.color)
    );
  })
})

//Anti AD

const isInvite = async (guild, code) => {
  return await new Promise((resolve) => {
    guild.fetchInvites().then((invites) => {
      for (const invite of invites) {
        if (code === invite[0]) {
          resolve(true)
          return
        }
      }

      resolve(false)
    })
  })
}

client.on('message', async (message) => {
  if (message.author.id === "594504468931018752") return;
  if (message.author.id === "819778342818414632") return;
  if (message.channel.id === "882472307325534248") return;
  const { guild, member, content } = message

  const code = content.split('discord.gg/')[1]

  if (content.includes('discord.gg/')) {
    const isOurInvite = await isInvite(guild, code)
    if (!isOurInvite) {
      message.delete();
      message.channel.send('Bruh!!! Dont Advertise Other Discord Server!<:LittlePog:793737159433125889>!')
      const channel = client.channels.cache.get('711888386532573215');
      channel.send(
        new MessageEmbed()
          .setTitle('LOGS : Invite Deleted!!!')
          .setURL(`https://discord.gg/${code}`)
          .setAuthor(message.author.tag, message.author.avatarURL())
          .setDescription(`\`${message.content}\``)
          .addField('Invite Code :', code)
          .addField('Channel :', `<#${message.channel.id}>`)
          .addField('By :', `<@${message.author.id}>`)
          .setFooter('SC SmartTech', client.user.avatarURL())
          .setColor(client.color)
          .setTimestamp()
      );
    }
  }
})

client.on('message', message => {
  const channel = "861169619033522246";
  if (message.author.bot) return // If Bot Messages Then It Will Stop(Not Work)
  if (message.channel.type === 'dm') return // If Message Is Sent In DMs Then It Will Stop(Not Work)
  if (message.channel.id === channel) {
    if (message.attachments.size > 0) return message.reply('I Cant read Images') // If Images Are Sent
    else {
      fetch(`http://api.brainshop.ai/get?bid=155450&key=SuXtqU9H9S9NyAdR&uid=1&msg=${encodeURIComponent(message)}`).then(res => res.json()) // Get API URL From https://brainshop.ai/ // Dont Show AnyOne API URL, Its Same As Token For BOT
        .then(data => {
          message.channel.send(`> "${message}"\n- ${data.cnt}`)
        })
    }
  } else if (channel === null) return // If No Chat Bot Channel Is Set Then It Will Stop(Not Work)
});

//LOGS

client.on("channelCreate", (channel) => {
  const buff = client.channels.cache.get('711888386532573215');
  buff.send(
    new MessageEmbed()
      .setTitle('LOGS : Channel Created!!!')
      .setURL(`https://discord.com/channels/594513706055106560/${channel.id}`)
      .addField('Channel Name :', `\`${channel.name}\``)
      .addField('Channel Type :', `\`${channel.type}\``)
      .addField('Channel ID :', `\`${channel.id}\``)
      .addField('Channel :', channel)
      .setFooter('SC SmartTech', client.user.avatarURL())
      .setColor(client.color)
      .setTimestamp()
  );
});

client.on("channelDelete", (channel) => {
  const buff = client.channels.cache.get('711888386532573215');
  buff.send(
    new MessageEmbed()
      .setTitle('LOGS : Channel Deleted!!!')
      .addField('Channel Name :', `\`${channel.name}\``)
      .addField('Channel Type :', `\`${channel.type}\``)
      .addField('Channel ID :', `\`${channel.id}\``)
      .addField('Channel :', channel)
      .setFooter('SC SmartTech', client.user.avatarURL())
      .setColor(client.color)
      .setTimestamp()
  );
});

client.on("channelUpdate", (oldChannel, newChannel) => {
  const buff = client.channels.cache.get('711888386532573215');
  buff.send(
    new MessageEmbed()
      .setTitle('LOGS : Channel Updated!!!')
      .setURL(`https://discord.com/channels/594513706055106560/${newChannel.id}`)
      .addField('Channel Name :', `\`${oldChannel.name}\``)
      .addField('Updated Channel Name :', `\`${newChannel.name}\``)
      .addField('Channel Type :', `\`${oldChannel.type}\``)
      .addField('Update Channel Type :', `\`${newChannel.type}\``)
      .addField('Channel ID :', `\`${newChannel.id}\``)
      .addField('Channel Topic :', `\`${oldChannel.topic}\``)
      .addField('Updated Channel Topic :', `\`${newChannel.topic}\``)
      .addField('Updated Channel :', newChannel)
      .setFooter('SC SmartTech', client.user.avatarURL())
      .setColor(client.color)
      .setTimestamp()
  );
});

client.on("messageDelete", (message) => {
  const buff = client.channels.cache.get('711888386532573215');
  buff.send(
    new MessageEmbed()
      .setTitle('LOGS : Message Deleted!!!')
      .setDescription(`\`${message.content}\``)
      .addField('Message Author :', message.author)
      .addField('Message Channel :', message.channel)
      .setFooter('SC SmartTech', client.user.avatarURL())
      .setColor(client.color)
      .setTimestamp()
  );
});

client.on("inviteCreate", (invite) => {
  const buff = client.channels.cache.get('711888386532573215');
  buff.send(
    new MessageEmbed()
      .setTitle('LOGS : Invite Created!!!')
      .setURL(invite.url)
      .addField('Invite Channel :', invite.channel)
      .addField('Invite Code :', `\`${invite.code}\``)
      .addField('Expires At :', `\`${invite.expiresAt}\``)
      .addField('Inviter :', invite.inviter)
      .addField('Invite Max Uses :', `\`${invite.maxUses}\``)
      .addField('Temporary? :', `\`${invite.temporary}\``)
      .setFooter('SC SmartTech', client.user.avatarURL())
      .setColor(client.color)
      .setTimestamp()
  );
});

//Self Roles

client.on('messageReactionAdd', async (reaction, user) => {
  try {
    if (reaction.message.partial) await reaction.message.fetch();
    if (reaction.partial) await reaction.fetch();
  } catch (err) {
    // If the message is deleted or inaccessible, ignore
    return;
  }
  if (user.bot) return;
  if (!reaction.message.guild) return;
  if (reaction.message.id !== '827492861455892500') return;

  const member = reaction.message.guild.members.cache.get(user.id);
  if (!member) return;

  const roleMap = {
    'DiscordAnnouncement': { roleId: '822735885643677696', name: 'AnnounceMent Ping' },
    'YouTubeLogo': { roleId: '822745063712096256', name: 'YouTube Ping' },
    'TwitchGlitchPurple': { roleId: '822745401831587900', name: 'Twitch Ping' },
    '🤝': { roleId: '822745598276009984', name: 'Partner Ping' },
    '🎉': { roleId: '822745763435905054', name: 'GiveAway Ping' },
    'DiscordPing': { roleId: '729288334257553438', name: 'Mentions/Pings Role' },
    '🎞️': { roleId: '822745216397606912', name: 'Upload Ping' },
    '📡': { roleId: '855122389532278794', name: 'Discord Updates' },
    '📊': { roleId: '597305356900761611', name: 'Polls Ping' }
  };

  const emojiName = reaction.emoji.name;
  if (roleMap[emojiName]) {
    const { roleId, name } = roleMap[emojiName];
    try {
      await member.roles.add(roleId);
      user.send(
        new MessageEmbed()
          .setTitle(`You Have Obtained The Role ***${name}***!!!`)
          .setDescription('If You Want To Remove It Then Again React To [This](https://discord.com/channels/594513706055106560/711594165078851646/827492861455892500) Message!!!')
          .setFooter("Note : If You Didn't Get The Role Then DM @SC")
          .setColor('#0059FF')
      ).catch(() => {}); // Ignore DM errors
    } catch (err) {
      console.error(`Failed to add role ${name} to ${user.tag}:`, err.message);
    }
  }
});

client.on('messageReactionRemove', async (reaction, user) => {
  try {
    if (reaction.message.partial) await reaction.message.fetch();
    if (reaction.partial) await reaction.fetch();
  } catch (err) {
    // If the message is deleted or inaccessible, ignore
    return;
  }
  if (user.bot) return;
  if (!reaction.message.guild) return;
  if (reaction.message.id !== '827492861455892500') return;

  const member = reaction.message.guild.members.cache.get(user.id);
  if (!member) return;

  const roleMap = {
    'DiscordAnnouncement': { roleId: '822735885643677696', name: 'AnnounceMent Ping' },
    'YouTubeLogo': { roleId: '822745063712096256', name: 'YouTube Ping' },
    'TwitchGlitchPurple': { roleId: '822745401831587900', name: 'Twitch Ping' },
    '🤝': { roleId: '822745598276009984', name: 'Partner Ping' },
    '🎉': { roleId: '822745763435905054', name: 'GiveAway Ping' },
    'DiscordPing': { roleId: '729288334257553438', name: 'Mentions/Pings Role' },
    '🎞️': { roleId: '822745216397606912', name: 'Upload Ping' },
    '📡': { roleId: '855122389532278794', name: 'Discord Updates' },
    '📊': { roleId: '597305356900761611', name: 'Polls Ping' }
  };

  const emojiName = reaction.emoji.name;
  if (roleMap[emojiName]) {
    const { roleId, name } = roleMap[emojiName];
    try {
      await member.roles.remove(roleId);
      user.send(
        new MessageEmbed()
          .setTitle(`Your Role ***${name}*** Has Been Removed!!!`)
          .setDescription('If You Want To Get It Then Again React To [This](https://discord.com/channels/594513706055106560/711594165078851646/827492861455892500) Message!!!')
          .setFooter("Note : If The Role Was Not Removed Then DM @SC")
          .setColor('#0059FF')
      ).catch(() => {}); // Ignore DM errors
    } catch (err) {
      console.error(`Failed to remove role ${name} from ${user.tag}:`, err.message);
    }
  }
});

//Suggestion System

client.on("message", message => {
  if (message.channel.id !== "873943017327853608") return;
  if (message.author.bot) return;
  if (message.author.id === "594504468931018752") return;
  const embed = new MessageEmbed()
    .setAuthor(message.author.tag, message.author.displayAvatarURL({ format: 'png', size: 4096, dynamic: true }))
    .setTitle("New Suggestion!")
    .setDescription(message.content)
    .setFooter("Just Type Your Suggestions In This Channel!")
    .setColor("#0059ff");
  message.channel.send(embed)
    .then(m => {
      m.react("<:SCThumbsUp:874376116746469406>")
      m.react("<:SCThumbsDown:874376176821469185>")
    });
  message.delete();
});

//Messages 

client.on('message', async msg => {
  if (msg.content === '<:chickencri:793737149161799691>') {
    msg.react('<:Chickenwtf:793737139275300864>');
  }

  if (msg.content === 'SC SmartTech') {
    msg.react('<:SCSmartTechLogo:793665812493893652>');
  }

  if (msg.content === 'broadcast!') {
    const broadcast = client.voice.createBroadcast();
    broadcast.play(ytdl('https://www.youtube.com/watch?v=UoMbwCoJTYM', { filter: 'audioonly' }));
    // Play "music.mp3" in all voice connections that the client is in
    for (const connection of client.voice.connections.values()) {
      connection.play(ytdl('https://www.youtube.com/watch?v=UoMbwCoJTYM', { filter: 'audioonly' }));
    }
  }

  if (msg.content === 'play') {
    if (!msg.guild) return;
    if (msg.member.voice.channel) {
      const connection = await msg.member.voice.channel.join();
      const dispatcher = connection.play(ytdl('https://youtu.be/H3XB4JRzM9U?si=1aSr4v0JJUj4Nz0N', { filter: 'audioonly' }));
      msg.reply('ok')
    } else {
      msg.reply('noob');
    }
  };

  if (msg.content === 'join!') {
    msg.member.voice.channel.join();
  }

  if (msg.content === 'oi join') {
    const connection = await msg.member.voice.channel.join();
    const BroadCast = client.voice.createBroadcast();
    BroadCast.on('subscribe', dispatcher => {
      console.log('New BroadCast Subscriber!!!')
    });
    BroadCast.on('unsubscribe', dispatcher => {
      console.log('Channel Unsubscribed From Broadcast :(')
    });
    const dispatcher = BroadCast.play('./audio.mp3');

    connection.play(BroadCast);
  }

  // if (msg.content === `<@!${client.owner}>`) {
  //   msg.react('🇴');
  //   msg.react('🇼');
  //   msg.react('🇳');
  //   msg.react('🇪');
  //   msg.react('🇷');
  // }

  if (msg.content === `<@!${client.owner}>`) {
    msg.react('<:DiscordPing:822737333639315476>');
  }

  if (msg.content === '<@!780838708664467456>') {
    msg.react('<:SimpleMusicBot:797533617042882612>');
  }

  if (msg.content.includes('levi')) {
    msg.react('<:LeviGiveMe:826395413296185365>');
  }

  if (msg.content.includes('mikasa')) {
    msg.react('<:MikasaSad:826401350329172028>');
  }

  if (msg.content === '<@!807594763720458252>') {
    msg.react('<:Colddd:710424122890649611>');
  }

  if (msg.content === '<@!760788807238549505>') {
    msg.react('🤣');
  }

  if (msg.content === '<a:hoo:867705752893390849>') {
    msg.delete();
    msg.channel.send('***Shut!!!***')
  }
  if (msg.content === 'https://tenor.com/view/cat-wow-surprise-shock-fear-gif-17912457') {
    msg.delete();
    msg.channel.send('***Dont Send That!!!***')
  }
});

//Login

client.login(token);