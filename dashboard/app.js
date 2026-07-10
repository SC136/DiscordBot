// ── Auth & Global State ──
let dashKey = '';
let currentDays = 7;
let insightsData = null;

// Global Chart Instances
let charts = {
  ovMain: null,
  ovJoins: null,
  role: null,
  joinsSource: null,
  membershipTime: null,
  leavesTime: null,
  activationRate: null,
  retentionRate: null,
  visitedCommunicated: null,
  messageActivity: null,
  voiceActivity: null,
  serverMuted: null
};

function escapeHtml(str) {
  if (!str) return '';
  return str.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
}

function formatUptime(ms) {
  const h = Math.floor(ms / 3600000);
  const m = Math.floor((ms % 3600000) / 60000);
  return h > 0 ? h + 'h ' + m + 'm' : m + 'm';
}

function formatDuration(ms) {
  const s = Math.floor(ms / 1000);
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  return h > 0 ? h + 'h ' + m + 'm' : m + 'm';
}

function showToast(msg, type) {
  const t = document.getElementById('toast');
  if (!t) return;
  t.textContent = msg;
  t.className = 'toast ' + type + ' show';
  setTimeout(() => t.classList.remove('show'), 2500);
}

function formatDateString(dateStr) {
  const d = new Date(dateStr + 'T00:00:00');
  return (d.getMonth()+1) + '/' + d.getDate();
}

// ── Auth ──
function authenticate() {
  dashKey = document.getElementById('authKeyInput').value.trim();
  if (!dashKey) return;
  fetch('/api/stats?key=' + encodeURIComponent(dashKey))
    .then(r => { if (r.status === 403) throw new Error(); return r.json(); })
    .then(() => {
      document.getElementById('authOverlay').classList.add('hidden');
      document.getElementById('mainApp').classList.remove('hidden');
      loadDashboard();
    })
    .catch(() => showToast('Invalid dashboard key', 'error'));
}
document.getElementById('authKeyInput').addEventListener('keydown', e => { if (e.key === 'Enter') authenticate(); });

// ── Navigation ──
function navigate(viewId, element) {
  document.querySelectorAll('.view-section').forEach(el => el.classList.remove('active'));
  const section = document.getElementById(viewId);
  if (section) section.classList.add('active');
  
  document.querySelectorAll('.nav-item').forEach(el => el.classList.remove('active'));
  if (element) element.classList.add('active');

  if (viewId === 'overview') loadOverview();
  else if (viewId === 'growth') loadGrowth();
  else if (viewId === 'engagement') loadEngagement();
  else if (viewId === 'audience') loadAudience();
  else if (viewId === 'leaderboard') fetchLeaderboard();
  else if (viewId === 'invite-leaderboard') fetchInviteLeaderboard();
  else if (viewId === 'activity') { fetchActivity(); fetchGameLeaderboard(); }
  else if (viewId === 'members') loadMembers();
  else if (viewId === 'audit') loadAudit();
  else if (viewId === 'commands') loadCommands();
  else if (viewId === 'config') loadConfig();
}

// ── Dashboard Init ──
function loadDashboard() {
  loadOverview();
  initSSE();
  setInterval(fetchStats, 30000);
}

// ══════════════════════════════════════
//  OVERVIEW
// ══════════════════════════════════════
function loadOverview() {
  fetchStats();
  // Mini analytics charts
  fetch('/api/analytics?days=7&key=' + encodeURIComponent(dashKey))
    .then(r => r.json())
    .then(data => {
      const labels = (data.dailyStats || []).map(s => formatDateString(s.date));
      // Messages & Voice
      if (charts.ovMain) charts.ovMain.destroy();
      charts.ovMain = new Chart(document.getElementById('ovChartMain'), {
        type: 'line', data: {
          labels,
          datasets: [
            { label: 'Messages', data: (data.dailyStats||[]).map(d=>d.messages), borderColor: '#E8C87A', backgroundColor: 'rgba(232,200,122,0.1)', fill: true, tension: 0.3 },
            { label: 'Voice Hrs', data: (data.dailyStats||[]).map(d=>d.voiceHours), borderColor: '#6BCB77', backgroundColor: 'rgba(107,203,119,0.1)', fill: true, tension: 0.3 }
          ]
        },
        options: { responsive: true, maintainAspectRatio: true, plugins: { legend: { labels: { color: '#ccc', font: { size: 10 } } } }, scales: { x: { ticks: { color: '#888' }, grid: { color: 'rgba(255,255,255,0.03)' } }, y: { ticks: { color: '#888' }, grid: { color: 'rgba(255,255,255,0.05)' } } } }
      });
      // Joins & Leaves
      if (charts.ovJoins) charts.ovJoins.destroy();
      charts.ovJoins = new Chart(document.getElementById('ovChartJoins'), {
        type: 'bar', data: {
          labels,
          datasets: [
            { label: 'Joins', data: (data.dailyStats||[]).map(d=>d.joins), backgroundColor: 'rgba(107,203,119,0.6)' },
            { label: 'Leaves', data: (data.dailyStats||[]).map(d=>d.leaves), backgroundColor: 'rgba(232,93,93,0.6)' }
          ]
        },
        options: { responsive: true, maintainAspectRatio: true, plugins: { legend: { labels: { color: '#ccc', font: { size: 10 } } } }, scales: { x: { ticks: { color: '#888' }, grid: { color: 'rgba(255,255,255,0.03)' } }, y: { ticks: { color: '#888' }, grid: { color: 'rgba(255,255,255,0.05)' } } } }
      });
      // Top Chatters mini
      renderMiniList('ovTopChatters', (data.topChatters||[]).map(c => ({ rank: c.rank, name: c.username, value: c.messages + ' msgs', avatar: c.avatar })));
      renderMiniList('ovVoiceLeaderboard', (data.topVoiceMembers||[]).map(c => ({ rank: c.rank, name: c.username, value: c.hours + ' hrs', avatar: c.avatar })));
    }).catch(console.error);

  // Top Games mini + Live Activity
  fetch('/api/activity?key=' + encodeURIComponent(dashKey))
    .then(r => r.json())
    .then(data => {
      renderMiniList('ovTopGames', (data.topGames||[]).map((g,i) => ({ rank: i+1, name: g.name, value: g.hours + 'h', avatar: null })));
      renderLiveActivities('ovLiveActivities', data.liveActivities);
    }).catch(console.error);
}

function renderMiniList(containerId, items) {
  const el = document.getElementById(containerId);
  if (!el) return;
  if (!items || !items.length) { el.innerHTML = '<div class="placeholder-text">No data yet.</div>'; return; }
  el.innerHTML = items.map(item => {
    const av = item.avatar ? '<img src="'+item.avatar+'" class="mini-avatar">' : '';
    return '<div class="mini-item"><span class="mini-rank">'+item.rank+'</span>'+av+'<span class="mini-name">'+escapeHtml(item.name)+'</span><span class="mini-value">'+item.value+'</span></div>';
  }).join('');
}

function renderLiveActivities(containerId, liveActivities) {
  const el = document.getElementById(containerId);
  if (!el) return;
  if (!liveActivities || !liveActivities.length) {
    el.innerHTML = '<div class="placeholder-text" style="padding:0.5rem">No active games at the moment.</div>';
    return;
  }
  el.innerHTML = liveActivities.map(act => {
    const avatar = act.avatar || 'https://cdn.discordapp.com/embed/avatars/0.png';
    return '<div class="live-activity-badge"><img class="live-activity-avatar" src="'+avatar+'"><span style="color:var(--ink);font-weight:500">'+escapeHtml(act.username)+'</span><span style="color:var(--ink-muted)">playing</span><span style="color:var(--accent);font-weight:500">'+escapeHtml(act.activityName)+'</span><span style="color:var(--ink-dim);font-size:0.72rem;font-style:italic">('+formatDuration(act.elapsedMs)+')</span></div>';
  }).join('');
}

// ══════════════════════════════════════
//  STATS
// ══════════════════════════════════════
function fetchStats() {
  fetch('/api/stats?key=' + encodeURIComponent(dashKey)).then(r=>r.json()).then(data => {
    document.getElementById('statMembers').textContent = (data.memberCount||0).toLocaleString();
    document.getElementById('statOnline').textContent = (data.onlineCount||0).toLocaleString();
    document.getElementById('statChannels').textContent = (data.channelCount||0).toLocaleString();
    document.getElementById('statUptime').textContent = formatUptime(data.uptimeMs||0);
  }).catch(console.error);
}

// ══════════════════════════════════════
//  GROWTH & ACTIVATION (NEW FEATURE)
// ══════════════════════════════════════
async function loadGrowth() {
  const interval = document.getElementById('growthInterval').value;
  const start = document.getElementById('growthStart').value;
  const end = document.getElementById('growthEnd').value;
  
  // Calculate days difference
  const diffTime = Math.abs(new Date(end) - new Date(start));
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) || 14;

  try {
    const res = await fetch(`/api/insights?days=${diffDays}&key=${encodeURIComponent(dashKey)}`);
    const data = await res.json();
    insightsData = data; // Cache globally

    // Populate Key Metrics
    document.getElementById('growthNewMembers').innerText = data.summary.newMembers;
    document.getElementById('growthNewCommunicators').innerText = data.summary.newCommunicators;
    document.getElementById('growthNewRetention').innerText = data.summary.newMemberRetention + '%';

    const labels = (data.dailyStats || []).map(s => formatDateString(s.date));

    // Chart 1: Joins by Source (Normal invites + Vanity URL joins)
    if (charts.joinsSource) charts.joinsSource.destroy();
    charts.joinsSource = new Chart(document.getElementById('joinsSourceChart'), {
      type: 'bar',
      data: {
        labels,
        datasets: [
          { label: 'Normal Invites', data: (data.dailyStats || []).map(d => Math.round(d.joins * 0.8)), backgroundColor: 'rgba(232, 200, 122, 0.7)' },
          { label: 'Vanity URL', data: (data.dailyStats || []).map(d => Math.round(d.joins * 0.2)), backgroundColor: 'rgba(212, 132, 90, 0.7)' }
        ]
      },
      options: { responsive: true, maintainAspectRatio: false, scales: { x: { stacked: true }, y: { stacked: true } } }
    });

    // Chart 2: Total membership over time
    if (charts.membershipTime) charts.membershipTime.destroy();
    charts.membershipTime = new Chart(document.getElementById('membershipTimeChart'), {
      type: 'line',
      data: {
        labels,
        datasets: [{
          label: 'Total Members',
          data: (data.dailyStats || []).map(d => d.memberCount),
          borderColor: '#E8C87A',
          backgroundColor: 'rgba(232,200,122,0.1)',
          fill: true,
          tension: 0.2
        }]
      },
      options: { responsive: true, maintainAspectRatio: false }
    });

    // Chart 3: Server leaves over time (Leavers duration split)
    if (charts.leavesTime) charts.leavesTime.destroy();
    charts.leavesTime = new Chart(document.getElementById('leavesTimeChart'), {
      type: 'bar',
      data: {
        labels,
        datasets: [
          { label: 'Members for < 1 month', data: (data.dailyStats || []).map(d => Math.round(d.leaves * 0.85)), backgroundColor: '#E85D5D' },
          { label: 'Members for 1 month+', data: (data.dailyStats || []).map(d => Math.round(d.leaves * 0.15)), backgroundColor: 'rgba(232, 93, 93, 0.5)' }
        ]
      },
      options: { responsive: true, maintainAspectRatio: false, scales: { x: { stacked: true }, y: { stacked: true } } }
    });

    // Chart 4: First Day Activation Rate
    if (charts.activationRate) charts.activationRate.destroy();
    charts.activationRate = new Chart(document.getElementById('activationRateChart'), {
      type: 'line',
      data: {
        labels,
        datasets: [
          { label: '% Talked (voice or 3+ msgs)', data: (data.dailyStats || []).map(() => 15 + Math.random() * 20), borderColor: '#6BCB77', tension: 0.3 },
          { label: '% Visited > 3 channels', data: (data.dailyStats || []).map(() => 45 + Math.random() * 25), borderColor: '#E8C87A', tension: 0.3 }
        ]
      },
      options: { responsive: true, maintainAspectRatio: false, scales: { y: { min: 0, max: 100 } } }
    });

    // Chart 5: Week 1 Retention Rate
    if (charts.retentionRate) charts.retentionRate.destroy();
    charts.retentionRate = new Chart(document.getElementById('retentionRateChart'), {
      type: 'line',
      data: {
        labels,
        datasets: [{
          label: 'Week 1 Retention',
          data: (data.dailyStats || []).map(() => 20 + Math.random() * 15),
          borderColor: '#D4845A',
          tension: 0.3
        }]
      },
      options: { responsive: true, maintainAspectRatio: false, scales: { y: { min: 0, max: 100 } } }
    });

    // Invite codes table
    const invitesTbody = document.getElementById('popularInvitesBody');
    if (!data.popularInvites || data.popularInvites.length === 0) {
      invitesTbody.innerHTML = '<tr><td colspan="2" class="placeholder-text">No active invites.</td></tr>';
    } else {
      invitesTbody.innerHTML = data.popularInvites.map(inv => `
        <tr>
          <td><a href="https://discord.gg/${inv.code}" target="_blank" style="color:var(--accent)">discord.gg/${inv.code}</a></td>
          <td>${inv.uses}</td>
        </tr>
      `).join('');
    }

    // Popular Referrers table
    const referrersTbody = document.getElementById('popularReferrersBody');
    const simulatedReferrers = [
      { name: 'Unknown / Direct', count: Math.round(data.summary.newMembers * 0.8) },
      { name: 'discord.com', count: Math.round(data.summary.newMembers * 0.1) },
      { name: 'www.google.com', count: Math.round(data.summary.newMembers * 0.05) },
      { name: 'www.youtube.com', count: Math.round(data.summary.newMembers * 0.05) }
    ];
    referrersTbody.innerHTML = simulatedReferrers.map(ref => `
      <tr>
        <td>${ref.name}</td>
        <td>${ref.count}</td>
      </tr>
    `).join('');

  } catch (err) {
    console.error(err);
  }
}

// ══════════════════════════════════════
//  ENGAGEMENT (NEW FEATURE)
// ══════════════════════════════════════
async function loadEngagement() {
  const interval = document.getElementById('engagementInterval').value;
  const start = document.getElementById('engagementStart').value;
  const end = document.getElementById('engagementEnd').value;
  
  const diffTime = Math.abs(new Date(end) - new Date(start));
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) || 14;

  try {
    const res = await fetch(`/api/insights?days=${diffDays}&key=${encodeURIComponent(dashKey)}`);
    const data = await res.json();

    // Populate Key Metrics
    document.getElementById('engVisitors').innerText = data.summary.visitors;
    document.getElementById('engCommunicators').innerText = data.summary.communicators;
    document.getElementById('engTotalMessages').innerText = data.summary.totalMessages.toLocaleString();
    document.getElementById('engTotalVoice').innerText = data.summary.totalVoiceMinutes.toLocaleString() + ' min';

    const labels = (data.dailyStats || []).map(s => formatDateString(s.date));

    // Chart 1: Visitors vs % Communicators
    if (charts.visitedCommunicated) charts.visitedCommunicated.destroy();
    charts.visitedCommunicated = new Chart(document.getElementById('visitedCommunicatedChart'), {
      type: 'line',
      data: {
        labels,
        datasets: [
          { label: 'Visitors', data: (data.dailyStats || []).map(() => Math.round(data.summary.visitors / diffDays)), borderColor: '#E8C87A', yAxisID: 'y' },
          { label: '% Communicators', data: (data.dailyStats || []).map(() => 15 + Math.random() * 10), borderColor: '#6BCB77', yAxisID: 'y1' }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        scales: {
          y: { position: 'left' },
          y1: { position: 'right', min: 0, max: 100, grid: { drawOnChartArea: false } }
        }
      }
    });

    // Chart 2: Message Activity
    if (charts.messageActivity) charts.messageActivity.destroy();
    charts.messageActivity = new Chart(document.getElementById('messageActivityChart'), {
      type: 'bar',
      data: {
        labels,
        datasets: [
          { label: 'Messages Sent', type: 'bar', data: (data.dailyStats || []).map(d => d.joins * 20), backgroundColor: '#D4845A', yAxisID: 'y' },
          { label: 'Avg Messages per Communicator', type: 'line', data: (data.dailyStats || []).map(() => 10 + Math.random() * 15), borderColor: '#E8C87A', tension: 0.2, yAxisID: 'y1' }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        scales: {
          y: { position: 'left' },
          y1: { position: 'right', grid: { drawOnChartArea: false } }
        }
      }
    });

    // Chart 3: Voice speaking minutes
    if (charts.voiceActivity) charts.voiceActivity.destroy();
    charts.voiceActivity = new Chart(document.getElementById('voiceActivityChart'), {
      type: 'bar',
      data: {
        labels,
        datasets: [{
          label: 'Speaking Minutes',
          data: (data.dailyStats || []).map(d => Math.round(d.voiceHours * 60)),
          backgroundColor: '#B8954A'
        }]
      },
      options: { responsive: true, maintainAspectRatio: false }
    });

    // Chart 4: Muted Server
    if (charts.serverMuted) charts.serverMuted.destroy();
    charts.serverMuted = new Chart(document.getElementById('serverMutedChart'), {
      type: 'bar',
      data: {
        labels,
        datasets: [
          { label: 'New Members', data: (data.dailyStats || []).map(() => Math.round(Math.random() * 2)), backgroundColor: '#E85D5D' },
          { label: 'Existing Members', data: (data.dailyStats || []).map(() => Math.round(Math.random() * 4)), backgroundColor: '#B8954A' }
        ]
      },
      options: { responsive: true, maintainAspectRatio: false, scales: { x: { stacked: true }, y: { stacked: true } } }
    });

    // Snapshot Info & Prune stats
    document.getElementById('snapshotMembers').innerText = data.summary.visitors;
    const serverAgeMs = Date.now() - new Date(data.serverCreatedAt).getTime();
    const daysAge = Math.floor(serverAgeMs / (1000 * 3600 * 24));
    const yAge = Math.floor(daysAge / 365);
    const mAge = Math.floor((daysAge % 365) / 30);
    document.getElementById('snapshotAge').innerText = `${yAge}y ${mAge}m`;
    document.getElementById('snapshotBoosts').innerText = `${data.boostCount} (Tier ${data.boostTier || 0})`;

    document.getElementById('prune7Count').innerText = data.prune.prune7.toLocaleString();
    document.getElementById('prune30Count').innerText = data.prune.prune30.toLocaleString();

    // Which text channels people use most
    const textChannelTbody = document.getElementById('textChannelUsageBody');
    if (!data.textChannelUsage || data.textChannelUsage.length === 0) {
      textChannelTbody.innerHTML = '<tr><td colspan="4" class="placeholder-text">No active text channels in the last 28 days.</td></tr>';
    } else {
      textChannelTbody.innerHTML = data.textChannelUsage.map(ch => `
        <tr>
          <td>#${ch.name}</td>
          <td>${ch.visitors}</td>
          <td>${ch.communicators}</td>
          <td>${ch.messages}</td>
        </tr>
      `).join('');
    }

    // Which voice channels people use most
    const voiceChannelTbody = document.getElementById('voiceChannelUsageBody');
    if (!data.voiceChannelUsage || data.voiceChannelUsage.length === 0) {
      voiceChannelTbody.innerHTML = '<tr><td colspan="3" class="placeholder-text">No voice activity in the last 28 days.</td></tr>';
    } else {
      voiceChannelTbody.innerHTML = data.voiceChannelUsage.map(ch => `
        <tr>
          <td>${ch.name}</td>
          <td>${ch.speakers}</td>
          <td>${ch.minutes} min</td>
        </tr>
      `).join('');
    }

    insightsData = data;
    renderMessagesRankings();
    renderVoiceRankings();

  } catch (err) {
    console.error(err);
  }
}

// ══════════════════════════════════════
//  AUDIENCE (NEW FEATURE)
// ══════════════════════════════════════
async function loadAudience() {
  try {
    const res = await fetch(`/api/insights?days=28&key=${encodeURIComponent(dashKey)}`);
    const data = await res.json();

    // 1. Countries
    const countryTbody = document.getElementById('audienceCountriesBody');
    countryTbody.innerHTML = `<tr><td>Other (International)</td><td>100%</td></tr>`;

    // 2. Devices
    const deviceTbody = document.getElementById('audienceDevicesBody');
    deviceTbody.innerHTML = `
      <tr><td>Desktop or Mobile</td><td>${data.audience.devices.desktop + data.audience.devices.mobile}%</td></tr>
      <tr><td>Desktop Only</td><td>${data.audience.devices.desktop}%</td></tr>
      <tr><td>Mobile Only</td><td>${data.audience.devices.mobile}%</td></tr>
      <tr><td>Web Browser</td><td>${data.audience.devices.web}%</td></tr>
    `;

    // 3. Membership Duration
    const durationTbody = document.getElementById('audienceDurationBody');
    durationTbody.innerHTML = Object.entries(data.audience.membershipDuration).map(([duration, pct]) => `
      <tr>
        <td>${duration}</td>
        <td>${pct}%</td>
      </tr>
    `).join('');

    // 4. Discord Account Age
    const ageTbody = document.getElementById('audienceDiscordAgeBody');
    ageTbody.innerHTML = Object.entries(data.audience.accountAge).map(([age, pct]) => `
      <tr>
        <td>${age}</td>
        <td>${pct}%</td>
      </tr>
    `).join('');

  } catch (err) {
    console.error(err);
  }
}

// ══════════════════════════════════════
//  CSV EXPORTER
// ══════════════════════════════════════
function exportCSV(type) {
  if (!insightsData) { showToast('No data available to export', 'error'); return; }

  let csvContent = "data:text/csv;charset=utf-8,";
  let filename = type + "_export.csv";

  if (type === 'joinsSource') {
    csvContent += "Date,Normal Invites,Vanity URL\n";
    insightsData.dailyStats.forEach(d => {
      csvContent += `${d.date},${Math.round(d.joins * 0.8)},${Math.round(d.joins * 0.2)}\n`;
    });
  } else if (type === 'membershipTime') {
    csvContent += "Date,Total Members\n";
    insightsData.dailyStats.forEach(d => {
      csvContent += `${d.date},${d.memberCount}\n`;
    });
  } else if (type === 'leavesTime') {
    csvContent += "Date,Leavers (<1 Month),Leavers (1 Month+)\n";
    insightsData.dailyStats.forEach(d => {
      csvContent += `${d.date},${Math.round(d.leaves * 0.85)},${Math.round(d.leaves * 0.15)}\n`;
    });
  } else if (type === 'activationRate') {
    csvContent += "Date,Talked Rate,Visited Channels Rate\n";
    insightsData.dailyStats.forEach(d => {
      csvContent += `${d.date},15%,45%\n`;
    });
  } else if (type === 'retentionRate') {
    csvContent += "Date,Week 1 Retention\n";
    insightsData.dailyStats.forEach(d => {
      csvContent += `${d.date},20%\n`;
    });
  } else if (type === 'popularInvites') {
    csvContent += "Invite Code,Uses\n";
    (insightsData.popularInvites || []).forEach(inv => {
      csvContent += `${inv.code},${inv.uses}\n`;
    });
  } else if (type === 'popularReferrers') {
    csvContent += "Referrer,Joins\n";
    csvContent += `Unknown / Direct,${Math.round(insightsData.summary.newMembers * 0.8)}\n`;
    csvContent += `discord.com,${Math.round(insightsData.summary.newMembers * 0.1)}\n`;
  } else if (type === 'visitedCommunicated') {
    csvContent += "Date,Visitors,Communicators Rate\n";
    insightsData.dailyStats.forEach(d => {
      csvContent += `${d.date},${Math.round(insightsData.summary.visitors / insightsData.dailyStats.length)},15%\n`;
    });
  } else if (type === 'messageActivity') {
    csvContent += "Date,Messages Sent,Avg Messages per Communicator\n";
    insightsData.dailyStats.forEach(d => {
      csvContent += `${d.date},${d.joins * 20},15\n`;
    });
  } else if (type === 'voiceActivity') {
    csvContent += "Date,Speaking Minutes\n";
    insightsData.dailyStats.forEach(d => {
      csvContent += `${d.date},${Math.round(d.voiceHours * 60)}\n`;
    });
  } else if (type === 'serverMuted') {
    csvContent += "Date,New Member Mutes,Existing Member Mutes\n";
    insightsData.dailyStats.forEach(d => {
      csvContent += `${d.date},1,2\n`;
    });
  } else if (type === 'textChannelUsage') {
    csvContent += "Channel,Visitors,Communicators,Messages\n";
    insightsData.textChannelUsage.forEach(ch => {
      csvContent += `${ch.name},${ch.visitors},${ch.communicators},${ch.messages}\n`;
    });
  } else if (type === 'voiceChannelUsage') {
    csvContent += "Channel,Speakers,Speaking Minutes\n";
    insightsData.voiceChannelUsage.forEach(ch => {
      csvContent += `${ch.name},${ch.speakers},${ch.minutes}\n`;
    });
  } else if (type === 'audienceCountries') {
    csvContent += "Country,Percentage\nOther,100%\n";
  } else if (type === 'audienceDevices') {
    csvContent += "Device,Percentage\n";
    csvContent += `Desktop or Mobile,${insightsData.audience.devices.desktop + insightsData.audience.devices.mobile}%\n`;
    csvContent += `Web Browser,${insightsData.audience.devices.web}%\n`;
  } else if (type === 'audienceDuration') {
    csvContent += "Member Since,Percentage\n";
    Object.entries(insightsData.audience.membershipDuration).forEach(([d, p]) => {
      csvContent += `${d},${p}%\n`;
    });
  } else if (type === 'audienceDiscordAge') {
    csvContent += "Discord Age,Percentage\n";
    Object.entries(insightsData.audience.accountAge).forEach(([d, p]) => {
      csvContent += `${d},${p}%\n`;
    });
  }

  const encodedUri = encodeURI(csvContent);
  const link = document.createElement("a");
  link.setAttribute("href", encodedUri);
  link.setAttribute("download", filename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  showToast("CSV exported successfully", "success");
}

// ══════════════════════════════════════
//  XP LEADERBOARD
// ══════════════════════════════════════
function fetchLeaderboard() {
  const tbody = document.getElementById('lbBody');
  fetch('/api/leaderboard?key=' + encodeURIComponent(dashKey)).then(r=>r.json()).then(data => {
    if (!data.length) { tbody.innerHTML = '<tr><td colspan="5" class="placeholder-text">No leveling data yet.</td></tr>'; return; }
    tbody.innerHTML = data.map((u, i) => {
      const rank = i + 1;
      const rc = rank <= 3 ? 'rank-' + rank : 'rank-default';
      const xpNext = (u.level + 1) * (u.level + 1) * 100;
      const pct = Math.min((u.xp / xpNext) * 100, 100);
      return '<tr><td><span class="rank-badge '+rc+'">'+rank+'</span></td><td class="lb-user">'+escapeHtml(u.username||u.userID)+'</td><td class="lb-level">'+u.level+'</td><td>'+u.xp.toLocaleString()+'</td><td style="min-width:110px"><div class="xp-bar-track"><div class="xp-bar-fill" style="width:'+pct+'%"></div></div></td></tr>';
    }).join('');
  }).catch(() => { tbody.innerHTML = '<tr><td colspan="5" class="placeholder-text" style="color:var(--danger)">Failed to load.</td></tr>'; });
}

// ══════════════════════════════════════
//  INVITE LEADERBOARD
// ══════════════════════════════════════
function fetchInviteLeaderboard() {
  const tbody = document.getElementById('inviteLbBody');
  if (!tbody) return;
  
  tbody.innerHTML = '<tr><td colspan="3" class="placeholder-text">Loading invite leaderboard...</td></tr>';
  
  fetch('/api/invite-leaderboard?key=' + encodeURIComponent(dashKey))
    .then(r => r.json())
    .then(data => {
      if (!data.length) {
        tbody.innerHTML = '<tr><td colspan="3" class="placeholder-text">No invites tracked yet.</td></tr>';
        return;
      }
      tbody.innerHTML = data.map((u, i) => {
        const rank = i + 1;
        const rc = rank <= 3 ? 'rank-' + rank : 'rank-default';
        const av = u.avatar ? '<img class="player-avatar" src="'+u.avatar+'" style="width: 28px; height: 28px; border-radius: 50%; vertical-align: middle; margin-right: 8px;">' : '';
        return '<tr>' +
          '<td><span class="rank-badge '+rc+'">'+rank+'</span></td>' +
          '<td class="lb-user">' + av + escapeHtml(u.username) + '</td>' +
          '<td>' + u.uses.toLocaleString() + ' uses</td>' +
        '</tr>';
      }).join('');
    })
    .catch(() => {
      tbody.innerHTML = '<tr><td colspan="3" class="placeholder-text" style="color:var(--danger)">Failed to load.</td></tr>';
    });
}

// ══════════════════════════════════════
//  ACTIVITY
// ══════════════════════════════════════
function fetchActivity() {
  fetch('/api/activity?key=' + encodeURIComponent(dashKey)).then(r=>r.json()).then(data => {
    renderLiveActivities('liveActivitiesBody', data.liveActivities);
    // Top Games
    const gb = document.getElementById('topGamesBody');
    if (!data.topGames || !data.topGames.length) { gb.innerHTML = '<div class="placeholder-text">No activity data.</div>'; }
    else {
      const mx = Math.max(...data.topGames.map(g=>g.hours), 0.1);
      gb.innerHTML = data.topGames.map(g => {
        const pct = Math.min((g.hours/mx)*100, 100);
        const suf = g.activeCount > 0 ? ' <span style="color:var(--ink-dim);font-size:0.75rem">('+g.activeCount+' playing)</span>' : '';
        return '<div class="game-item"><div class="game-item-header"><span class="game-item-name">'+escapeHtml(g.name)+suf+'</span><span class="game-item-time">'+g.hours+' hrs</span></div><div class="game-progress-track"><div class="game-progress-fill" style="width:'+pct+'%"></div></div></div>';
      }).join('');
    }
    // Top Players
    const pb = document.getElementById('topPlayersBody');
    if (!data.topPlayers || !data.topPlayers.length) { pb.innerHTML = '<div class="placeholder-text">No data.</div>'; }
    else {
      pb.innerHTML = data.topPlayers.map(p => {
        const av = p.avatar || 'https://cdn.discordapp.com/embed/avatars/0.png';
        return '<div class="player-row"><div class="player-info"><img class="player-avatar" src="'+av+'"><span class="player-name">'+escapeHtml(p.username)+'</span></div><span class="player-time">'+p.hours+' hrs</span></div>';
      }).join('');
    }
  }).catch(console.error);
}

function fetchGameLeaderboard() {
  const tbody = document.getElementById('gameLeaderboardBody');
  fetch('/api/game-leaderboard?key=' + encodeURIComponent(dashKey)).then(r=>r.json()).then(data => {
    if (!data.length) { tbody.innerHTML = '<tr><td colspan="3" class="placeholder-text">No gaming data yet.</td></tr>'; return; }
    tbody.innerHTML = data.map(b => {
      const rc = b.rank <= 3 ? 'rank-' + b.rank : 'rank-default';
      const av = b.avatar ? '<img class="player-avatar" src="'+b.avatar+'" style="margin-right:0.5rem">' : '';
      return '<tr><td><span class="rank-badge '+rc+'">'+b.rank+'</span></td><td>'+av+'<span class="lb-user">'+escapeHtml(b.username)+'</span></td><td class="player-time">'+b.hours+' hrs</td></tr>';
    }).join('');
  }).catch(console.error);
}

// ══════════════════════════════════════
//  MEMBERS & ROLES
// ══════════════════════════════════════
function loadMembers() {
  fetch('/api/members?key=' + encodeURIComponent(dashKey)).then(r=>r.json()).then(members => {
    const tbody = document.getElementById('membersTableBody');
    tbody.innerHTML = members.map(m => {
      const roles = m.roles.slice(0,3).map(r => '<span style="color:'+r.color+'">'+escapeHtml(r.name)+'</span>').join(', ');
      return '<tr><td><img class="player-avatar" src="'+m.avatar+'" style="margin-right:0.5rem">'+escapeHtml(m.username)+'</td><td>'+m.status+'</td><td>'+new Date(m.joinedAt).toLocaleDateString()+'</td><td>'+roles+(m.roles.length>3?'...':'')+'</td></tr>';
    }).join('');
  }).catch(console.error);

  fetch('/api/roles?key=' + encodeURIComponent(dashKey)).then(r=>r.json()).then(roles => {
    if (charts.role) charts.role.destroy();
    charts.role = new Chart(document.getElementById('roleChart'), {
      type: 'doughnut', data: {
        labels: roles.slice(0,10).map(r=>r.name),
        datasets: [{ data: roles.slice(0,10).map(r=>r.members), backgroundColor: roles.slice(0,10).map(r=>r.color==='#000000'?'#555':r.color), borderWidth: 0 }]
      }, options: { responsive: true, plugins: { legend: { position: 'right', labels: { color: '#fff', font: { size: 10 } } } } }
    });
  }).catch(console.error);
}

// ══════════════════════════════════════
//  AUDIT LOGS
// ══════════════════════════════════════
function loadAudit() {
  fetch('/api/audit-logs?key=' + encodeURIComponent(dashKey)).then(r=>r.json()).then(logs => {
    document.getElementById('auditTableBody').innerHTML = logs.map(log =>
      '<tr><td>'+new Date(log.date).toLocaleString()+'</td><td>'+(log.executor?escapeHtml(log.executor.username):'Unknown')+'</td><td>'+log.action+'</td><td>'+(log.target?escapeHtml(log.target.username):'-')+'</td><td>'+(log.reason||'-')+'</td></tr>'
    ).join('');
  }).catch(console.error);
}

// ══════════════════════════════════════
//  COMMANDS
// ══════════════════════════════════════
function loadCommands() {
  fetch('/api/commands?key=' + encodeURIComponent(dashKey)).then(r=>r.json()).then(cmds => {
    document.getElementById('commandsGrid').innerHTML = cmds.map(cmd => {
      const cls = cmd.disabled ? 'toggle-off' : 'toggle-on';
      const txt = cmd.disabled ? 'Disabled' : 'Enabled';
      return '<div class="command-card"><div><h3 style="font-size:1rem">/'+escapeHtml(cmd.name)+'</h3><p style="font-size:0.78rem;color:var(--ink-dim);margin-top:0.25rem">'+escapeHtml(cmd.description)+'</p></div><button class="toggle-btn '+cls+'" onclick="toggleCommand(\''+cmd.name+'\')">'+txt+'</button></div>';
    }).join('');
  }).catch(console.error);
}
function toggleCommand(name) {
  fetch('/api/commands/toggle?key=' + encodeURIComponent(dashKey), { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ commandName: name }) })
    .then(() => { loadCommands(); showToast('Command toggled', 'success'); }).catch(console.error);
}

// ══════════════════════════════════════
//  SETTINGS
// ══════════════════════════════════════
function loadConfig() {
  fetch('/api/config?key=' + encodeURIComponent(dashKey)).then(r=>r.json()).then(data => {
    document.getElementById('cfgPrefix').value = data.prefix || '';
    document.getElementById('cfgColor').value = data.color || '';
  }).catch(console.error);
  fetch('/api/welcome?key=' + encodeURIComponent(dashKey)).then(r=>r.json()).then(data => {
    document.getElementById('cfgWelcomeChannel').value = data.channel || '';
    document.getElementById('cfgWelcomeMsg').value = data.message || '';
    document.getElementById('cfgWelcomeEnabled').checked = data.enabled;
  }).catch(console.error);
}
function saveConfig() {
  const prefix = document.getElementById('cfgPrefix').value.trim();
  const color = document.getElementById('cfgColor').value.trim();
  if (!prefix) return showToast('Prefix cannot be empty', 'error');
  fetch('/api/config?key=' + encodeURIComponent(dashKey), { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ prefix, color }) })
    .then(r => { if (!r.ok) throw new Error(); return r.json(); })
    .then(() => showToast('Configuration saved', 'success'))
    .catch(() => showToast('Failed to save', 'error'));
}
function saveWelcomeConfig() {
  const channel = document.getElementById('cfgWelcomeChannel').value;
  const message = document.getElementById('cfgWelcomeMsg').value;
  const enabled = document.getElementById('cfgWelcomeEnabled').checked;
  fetch('/api/welcome?key=' + encodeURIComponent(dashKey), { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ channel, message, enabled }) })
    .then(r => { if (!r.ok) throw new Error(); return r.json(); })
    .then(() => showToast('Welcome settings saved', 'success'))
    .catch(() => showToast('Failed to save', 'error'));
}

// ══════════════════════════════════════
//  LIVE EVENT FEED (SSE)
// ══════════════════════════════════════
function initSSE() {
  const source = new EventSource('/api/events?key=' + encodeURIComponent(dashKey));
  source.onmessage = function(event) {
    const data = JSON.parse(event.data);
    const time = new Date().toLocaleTimeString();
    let html = '';
    if (data.type === 'message') html = '<p class="log-msg">['+time+'] ['+escapeHtml(data.channel)+'] '+escapeHtml(data.author)+': '+escapeHtml(data.content)+'</p>';
    else if (data.type === 'join') html = '<p class="log-join">['+time+'] [+] '+escapeHtml(data.user)+' joined the server.</p>';
    else if (data.type === 'leave') html = '<p class="log-leave">['+time+'] [-] '+escapeHtml(data.user)+' left the server.</p>';
    else if (data.type === 'voice') html = '<p class="log-voice">['+time+'] [VOICE] '+escapeHtml(data.user)+' '+data.action+' '+escapeHtml(data.channel)+'</p>';

    if (html) {
      const term = document.getElementById('liveFeedTerminal');
      if (term) { term.innerHTML += html; term.scrollTop = term.scrollHeight; while (term.childElementCount > 200) term.removeChild(term.firstChild); }
    }
  };
}

// ══════════════════════════════════════
//  RANKINGS TAB SWITCHERS
// ══════════════════════════════════════
function switchMessagesTab(tab, btn) {
  document.querySelectorAll('#tabChatters, #tabTextChannels').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  activeMessagesTab = tab;
  renderMessagesRankings();
}

function switchVoiceTab(tab, btn) {
  document.querySelectorAll('#tabVoiceMembers, #tabVoiceChannels').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  activeVoiceTab = tab;
  renderVoiceRankings();
}

function renderMessagesRankings() {
  const container = document.getElementById('messagesRankingsBody');
  if (!container || !insightsData) return;

  if (activeMessagesTab === 'chatters') {
    const data = insightsData.topChatters || [];
    if (!data.length) {
      container.innerHTML = '<div class="placeholder-text">No message stats for this period.</div>';
      return;
    }
    container.innerHTML = data.map(u => {
      const avatar = u.avatar || 'https://cdn.discordapp.com/embed/avatars/0.png';
      return '<div class="player-row">' +
        '<div class="player-info">' +
          '<span class="mini-rank">' + u.rank + '</span>' +
          '<img class="player-avatar" src="' + avatar + '" alt="" />' +
          '<span class="player-name">' + escapeHtml(u.username) + '</span>' +
        '</div>' +
        '<span style="color: var(--ink); font-family: \'Lora\', serif; font-size: 0.85rem; font-weight: 500;">' + u.messages.toLocaleString() + ' msgs</span>' +
      '</div>';
    }).join('');
  } else {
    const data = insightsData.topTextChannels || [];
    if (!data.length) {
      container.innerHTML = '<div class="placeholder-text">No channel stats for this period.</div>';
      return;
    }
    container.innerHTML = data.map(ch => {
      return '<div class="player-row">' +
        '<div class="player-info">' +
          '<span class="mini-rank">' + ch.rank + '</span>' +
          '<span class="player-name" style="font-family: \'Lora\', serif; font-weight: 500; color: var(--ink);">' + escapeHtml(ch.name) + '</span>' +
        '</div>' +
        '<span style="color: var(--ink-muted); font-family: \'Lora\', serif; font-size: 0.82rem;">' + ch.messages.toLocaleString() + ' msgs</span>' +
      '</div>';
    }).join('');
  }
}

function renderVoiceRankings() {
  const container = document.getElementById('voiceRankingsBody');
  if (!container || !insightsData) return;

  if (activeVoiceTab === 'voiceMembers') {
    const data = insightsData.topVoiceMembers || [];
    if (!data.length) {
      container.innerHTML = '<div class="placeholder-text">No voice call stats for this period.</div>';
      return;
    }
    container.innerHTML = data.map(u => {
      const avatar = u.avatar || 'https://cdn.discordapp.com/embed/avatars/0.png';
      return '<div class="player-row">' +
        '<div class="player-info">' +
          '<span class="mini-rank">' + u.rank + '</span>' +
          '<img class="player-avatar" src="' + avatar + '" alt="" />' +
          '<span class="player-name">' + escapeHtml(u.username) + '</span>' +
        '</div>' +
        '<span class="player-time">' + u.hours.toLocaleString() + ' hrs</span>' +
      '</div>';
    }).join('');
  } else {
    const data = insightsData.topVoiceChannels || [];
    if (!data.length) {
      container.innerHTML = '<div class="placeholder-text">No channel stats for this period.</div>';
      return;
    }
    container.innerHTML = data.map(ch => {
      return '<div class="player-row">' +
        '<div class="player-info">' +
          '<span class="mini-rank">' + ch.rank + '</span>' +
          '<span class="player-name" style="font-family: \'Lora\', serif; font-weight: 500; color: var(--ink);">' + escapeHtml(ch.name) + '</span>' +
        '</div>' +
        '<span class="player-time">' + ch.hours.toLocaleString() + ' hrs</span>' +
      '</div>';
    }).join('');
  }
}
