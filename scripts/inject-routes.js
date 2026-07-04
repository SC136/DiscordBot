const fs = require('fs');
const path = require('path');

const indexFile = path.join(__dirname, '..', 'index.js');
let content = fs.readFileSync(indexFile, 'utf8');

const newRoutes = `
// ── DASHBOARD EXPANSION ROUTES ──
const EventEmitter = require('events');
const dashEvents = new EventEmitter();
client.dashEvents = dashEvents; // Make accessible globally if needed

// SSE Endpoint
app.get('/api/events', dashAuth, (req, res) => {
  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    'Connection': 'keep-alive'
  });
  
  const onEvent = (data) => {
    res.write(\`data: \${JSON.stringify(data)}\\n\\n\`);
  };
  
  dashEvents.on('dashboard_event', onEvent);
  req.on('close', () => {
    dashEvents.removeListener('dashboard_event', onEvent);
  });
});

app.get('/api/members', dashAuth, (req, res) => {
  const guild = client.guilds.cache.get(config.guild);
  if (!guild) return res.json([]);
  
  const query = (req.query.q || '').toLowerCase();
  
  let members = guild.members.cache.map(m => ({
    id: m.id,
    username: m.user.username,
    discriminator: m.user.discriminator,
    avatar: m.user.displayAvatarURL({ dynamic: true, size: 64 }),
    joinedAt: m.joinedAt,
    status: m.presence ? m.presence.status : 'offline',
    roles: m.roles.cache.filter(r => r.name !== '@everyone').map(r => ({ id: r.id, name: r.name, color: r.hexColor }))
  }));
  
  if (query) {
    members = members.filter(m => m.username.toLowerCase().includes(query) || (m.discriminator && m.discriminator.includes(query)));
  }
  
  res.json(members.slice(0, 100)); // Limit to 100 for Termux memory
});

app.get('/api/roles', dashAuth, (req, res) => {
  const guild = client.guilds.cache.get(config.guild);
  if (!guild) return res.json([]);
  
  const roles = guild.roles.cache.filter(r => r.name !== '@everyone').map(r => ({
    id: r.id,
    name: r.name,
    color: r.hexColor,
    members: r.members.size
  })).sort((a, b) => b.members - a.members);
  
  res.json(roles);
});

app.get('/api/audit-logs', dashAuth, async (req, res) => {
  try {
    const guild = client.guilds.cache.get(config.guild);
    if (!guild) return res.json([]);
    
    // Fetch recent 50 logs
    const logs = await guild.fetchAuditLogs({ limit: 50 });
    const formatted = logs.entries.map(e => ({
      id: e.id,
      action: e.action,
      actionType: e.actionType,
      executor: e.executor ? { username: e.executor.username, avatar: e.executor.displayAvatarURL({size:32}) } : null,
      target: e.target ? { id: e.target.id, username: e.target.username } : null,
      reason: e.reason,
      date: e.createdAt
    }));
    res.json(formatted);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch logs' });
  }
});

app.get('/api/game-leaderboard', dashAuth, async (req, res) => {
  try {
    const guild = client.guilds.cache.get(config.guild);
    const stats = await ActivityStats.aggregate([
      { $match: { activityType: { $ne: 'CUSTOM_STATUS' } } },
      { $group: { _id: "$userId", totalDurationMs: { $sum: "$totalDurationMs" } } },
      { $sort: { totalDurationMs: -1 } },
      { $limit: 20 }
    ]);
    
    const leaderboard = stats.map((s, i) => {
      const member = guild ? guild.members.cache.get(s._id) : null;
      return {
        rank: i + 1,
        userId: s._id,
        username: member ? member.user.username : \`User \${s._id}\`,
        avatar: member ? member.user.displayAvatarURL({size:64}) : null,
        hours: parseFloat((s.totalDurationMs / 3600000).toFixed(2))
      };
    });
    res.json(leaderboard);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/commands', dashAuth, (req, res) => {
  const fresh = JSON.parse(fs.readFileSync('./config.json', 'utf8'));
  const disabled = fresh.disabledCommands || [];
  
  const cmds = client.slashCommands.map(cmd => ({
    name: cmd.name,
    description: cmd.description || 'No description',
    disabled: disabled.includes(cmd.name)
  }));
  res.json(cmds);
});

app.post('/api/commands/toggle', dashAuth, (req, res) => {
  const { commandName } = req.body;
  const cfg = JSON.parse(fs.readFileSync('./config.json', 'utf8'));
  if (!cfg.disabledCommands) cfg.disabledCommands = [];
  
  if (cfg.disabledCommands.includes(commandName)) {
    cfg.disabledCommands = cfg.disabledCommands.filter(c => c !== commandName);
  } else {
    cfg.disabledCommands.push(commandName);
  }
  
  fs.writeFileSync('./config.json', JSON.stringify(cfg, null, 2));
  config.disabledCommands = cfg.disabledCommands; // update in-memory
  res.json({ success: true, disabledCommands: cfg.disabledCommands });
});

app.get('/api/welcome', dashAuth, (req, res) => {
  const fresh = JSON.parse(fs.readFileSync('./config.json', 'utf8'));
  res.json(fresh.welcome || {});
});

app.post('/api/welcome', dashAuth, (req, res) => {
  const cfg = JSON.parse(fs.readFileSync('./config.json', 'utf8'));
  cfg.welcome = { ...cfg.welcome, ...req.body };
  fs.writeFileSync('./config.json', JSON.stringify(cfg, null, 2));
  config.welcome = cfg.welcome;
  res.json({ success: true, welcome: cfg.welcome });
});
`;

if (!content.includes('// ── DASHBOARD EXPANSION ROUTES ──')) {
    content = content.replace('app.listen(port, () => {', newRoutes + '\napp.listen(port, () => {');
    fs.writeFileSync(indexFile, content, 'utf8');
    console.log('Routes injected successfully.');
} else {
    console.log('Routes already injected.');
}
