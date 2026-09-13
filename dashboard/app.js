// ── Auth & Global State ──
let dashKey = '';
let currentDays = 7;
let insightsData = null;
let activeMessagesTab = 'chatters';
let activeVoiceTab = 'voiceMembers';

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

// ── Global Chart.js Defaults: Tooltip anywhere in chart column (empty space hover) ──
if (typeof Chart !== 'undefined') {
  Chart.defaults.interaction = {
    mode: 'index',
    intersect: false,
    axis: 'x'
  };
  if (Chart.defaults.plugins && Chart.defaults.plugins.tooltip) {
    Chart.defaults.plugins.tooltip.mode = 'index';
    Chart.defaults.plugins.tooltip.intersect = false;
    Chart.defaults.plugins.tooltip.backgroundColor = 'rgba(15, 17, 23, 0.94)';
    Chart.defaults.plugins.tooltip.titleColor = '#ffffff';
    Chart.defaults.plugins.tooltip.bodyColor = '#e1e7ef';
    Chart.defaults.plugins.tooltip.borderColor = 'rgba(255, 255, 255, 0.12)';
    Chart.defaults.plugins.tooltip.borderWidth = 1;
    Chart.defaults.plugins.tooltip.padding = 10;
    Chart.defaults.plugins.tooltip.boxPadding = 5;
    Chart.defaults.plugins.tooltip.cornerRadius = 8;
    Chart.defaults.plugins.tooltip.usePointStyle = true;
  }
  if (Chart.defaults.font) {
    Chart.defaults.font.family = "'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif";
  }
}

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

// ── Global Progress & Chart Loading Indicators ──
let progressTimer = null;
function startGlobalProgress() {
  const bar = document.getElementById('globalProgressBar');
  if (!bar) return;
  if (progressTimer) clearInterval(progressTimer);
  bar.classList.add('active');
  bar.style.width = '25%';
  
  let currentW = 25;
  progressTimer = setInterval(() => {
    if (currentW < 88) {
      currentW += Math.random() * 10;
      bar.style.width = Math.min(88, currentW) + '%';
    }
  }, 220);
}

function finishGlobalProgress() {
  const bar = document.getElementById('globalProgressBar');
  if (!bar) return;
  if (progressTimer) {
    clearInterval(progressTimer);
    progressTimer = null;
  }
  bar.style.width = '100%';
  setTimeout(() => {
    bar.classList.remove('active');
    setTimeout(() => { bar.style.width = '0%'; }, 350);
  }, 260);
}

function setChartLoading(canvasId, loading = true, text = 'Loading chart data...', subtext = '') {
  const canvas = document.getElementById(canvasId);
  if (!canvas) return;
  const parent = canvas.parentElement;
  if (!parent) return;

  if (window.getComputedStyle(parent).position === 'static') {
    parent.style.position = 'relative';
  }

  let loader = parent.querySelector('.chart-loader-overlay');
  if (loading) {
    if (!loader) {
      loader = document.createElement('div');
      loader.className = 'chart-loader-overlay';
      loader.innerHTML = `
        <div class="tech-spinner-wrap">
          <div class="tech-spinner"></div>
          <div class="tech-spinner-inner"></div>
        </div>
        <div class="chart-loader-text">${escapeHtml(text)}</div>
        ${subtext ? `<div class="chart-loader-sub">${escapeHtml(subtext)}</div>` : ''}
      `;
      parent.appendChild(loader);
    } else {
      loader.classList.remove('fade-out');
      const txt = loader.querySelector('.chart-loader-text');
      if (txt) txt.textContent = text;
      const sub = loader.querySelector('.chart-loader-sub');
      if (sub && subtext) sub.textContent = subtext;
    }
    canvas.style.transition = 'opacity 0.25s ease';
    canvas.style.opacity = '0.08';
  } else {
    if (loader) {
      loader.classList.add('fade-out');
      setTimeout(() => {
        if (loader && loader.parentElement) loader.remove();
      }, 300);
    }
    canvas.style.opacity = '1';
  }
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
      if (window.lucide) lucide.createIcons();
      initMobileNav();
      loadDashboard();
    })
    .catch(() => showToast('Invalid dashboard key', 'error'));
}
document.getElementById('authKeyInput').addEventListener('keydown', e => { if (e.key === 'Enter') authenticate(); });

// ── Error State Helpers (Finding 6 / R-27) ──
function renderTableError(tbodyId, colspan, message, retryFn) {
  const tbody = document.getElementById(tbodyId);
  if (!tbody) return;
  const retryId = 'retry_tbl_' + Math.random().toString(36).substring(2, 9);
  tbody.innerHTML = `
    <tr>
      <td colspan="${colspan}">
        <div class="error-state-card" role="alert">
          <i data-lucide="alert-triangle" class="error-icon"></i>
          <p class="error-state-msg">${escapeHtml(message || 'Failed to load table data.')}</p>
          ${retryFn ? `<button type="button" class="btn-retry" id="${retryId}"><i data-lucide="refresh-cw" class="btn-icon-sm"></i> Retry</button>` : ''}
        </div>
      </td>
    </tr>
  `;
  if (window.lucide) lucide.createIcons();
  if (retryFn) {
    const btn = document.getElementById(retryId);
    if (btn) btn.addEventListener('click', () => retryFn());
  }
}

function renderPanelError(containerId, message, retryFn) {
  const el = document.getElementById(containerId);
  if (!el) return;
  const retryId = 'retry_pnl_' + Math.random().toString(36).substring(2, 9);
  el.innerHTML = `
    <div class="error-state-card" role="alert">
      <i data-lucide="alert-triangle" class="error-icon"></i>
      <p class="error-state-msg">${escapeHtml(message || 'Failed to load data.')}</p>
      ${retryFn ? `<button type="button" class="btn-retry" id="${retryId}"><i data-lucide="refresh-cw" class="btn-icon-sm"></i> Retry</button>` : ''}
    </div>
  `;
  if (window.lucide) lucide.createIcons();
  if (retryFn) {
    const btn = document.getElementById(retryId);
    if (btn) btn.addEventListener('click', () => retryFn());
  }
}

// ── Mobile Navigation Drawer (Finding 2 / R-03) ──
function toggleMobileNav(forceState) {
  const sidebar = document.getElementById('sidebar') || document.getElementById('appSidebar');
  const backdrop = document.getElementById('sidebarBackdrop');
  const menuBtn = document.getElementById('mobileMenuBtn');
  if (!sidebar) return;
  const willOpen = typeof forceState === 'boolean' ? forceState : !sidebar.classList.contains('mobile-open');
  if (willOpen) {
    sidebar.classList.add('mobile-open');
    if (backdrop) backdrop.classList.add('active');
    if (menuBtn) menuBtn.setAttribute('aria-expanded', 'true');
  } else {
    sidebar.classList.remove('mobile-open');
    if (backdrop) backdrop.classList.remove('active');
    if (menuBtn) menuBtn.setAttribute('aria-expanded', 'false');
  }
}
window.toggleMobileNav = toggleMobileNav;

// Initialize Lucide icons & Mobile Nav on DOM ready
function initMobileNav() {
  const menuBtn = document.getElementById('mobileMenuBtn');
  const closeBtn = document.getElementById('sidebarCloseBtn');
  const backdrop = document.getElementById('sidebarBackdrop');
  if (menuBtn) {
    menuBtn.onclick = (e) => {
      e.preventDefault();
      e.stopPropagation();
      toggleMobileNav();
    };
  }
  if (closeBtn) {
    closeBtn.onclick = (e) => {
      e.preventDefault();
      e.stopPropagation();
      toggleMobileNav(false);
    };
  }
  if (backdrop) {
    backdrop.onclick = (e) => {
      e.preventDefault();
      toggleMobileNav(false);
    };
  }
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') toggleMobileNav(false);
  });
}

document.addEventListener('DOMContentLoaded', () => {
  if (window.lucide) lucide.createIcons();
  initMobileNav();
});
if (window.lucide) lucide.createIcons();
initMobileNav();

// ── Navigation ──
function navigate(viewId, element) {
  toggleMobileNav(false);
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
  else if (viewId === 'embed-builder') loadEmbedBuilder();
  else if (viewId === 'custom-commands') loadCustomCommands();
  else if (viewId === 'nickname-lock') loadNicknameLock();
  else if (viewId === 'config') loadConfig();

  setTimeout(() => { if (window.lucide) lucide.createIcons(); }, 100);
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
  setChartLoading('ovChartMain', true, 'Loading message & voice trends...');
  setChartLoading('ovChartJoins', true, 'Loading join & leave activity...');
  startGlobalProgress();

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
    })
    .catch(console.error)
    .finally(() => {
      setChartLoading('ovChartMain', false);
      setChartLoading('ovChartJoins', false);
      finishGlobalProgress();
    });

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
    
    if (data.health) {
      document.getElementById('statMemory').textContent = `${data.health.ramRSS || 0} MB`;
      document.getElementById('statPing').textContent = `${data.health.ping !== undefined ? data.health.ping : 0} ms`;
      document.getElementById('statCpu').textContent = `${data.health.cpuLoad || 0}%`;
    }

    if (data.botAvatar) {
      const sidebarAv = document.getElementById('sidebarBotAvatar');
      if (sidebarAv) sidebarAv.src = data.botAvatar;

      const mobileAv = document.getElementById('mobileBotAvatar');
      if (mobileAv) mobileAv.src = data.botAvatar;

      const heroAv = document.getElementById('heroBotAvatar');
      if (heroAv) heroAv.src = data.botAvatar;

      let favicon = document.querySelector("link[rel~='icon']");
      if (!favicon) {
        favicon = document.createElement('link');
        favicon.rel = 'icon';
        document.head.appendChild(favicon);
      }
      favicon.href = data.botAvatar;
    }

    if (data.botName) {
      const heroName = document.getElementById('heroBotName');
      if (heroName) heroName.textContent = data.botName;
    }

    const heroPing = document.getElementById('heroBotPing');
    if (heroPing && data.health && data.health.ping !== undefined) {
      heroPing.innerHTML = `<i data-lucide="zap" class="mini-icon"></i> ${data.health.ping} ms`;
    }

    const heroUptime = document.getElementById('heroBotUptime');
    if (heroUptime) {
      heroUptime.innerHTML = `<i data-lucide="clock" class="mini-icon"></i> ${formatUptime(data.uptimeMs||0)}`;
    }

    if (window.lucide) lucide.createIcons();
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

  const growthCharts = ['joinsSourceChart', 'membershipTimeChart', 'leavesTimeChart', 'activationRateChart', 'retentionRateChart'];
  setChartLoading('joinsSourceChart', true, 'Loading joins by source...', 'Analyzing server invite tracking');
  setChartLoading('membershipTimeChart', true, 'Loading membership curve...', 'Calculating cumulative member counts');
  setChartLoading('leavesTimeChart', true, 'Loading server departures...', 'Querying member leave events');
  setChartLoading('activationRateChart', true, 'Computing activation rate...', 'Checking first-day member participation');
  setChartLoading('retentionRateChart', true, 'Calculating retention trends...', 'Analyzing week-1 member retention');
  startGlobalProgress();

  const elNewMem = document.getElementById('growthNewMembers');
  const elNewComm = document.getElementById('growthNewCommunicators');
  const elNewRet = document.getElementById('growthNewRetention');
  if (elNewMem) elNewMem.innerHTML = '<span class="is-loading-shimmer"></span>';
  if (elNewComm) elNewComm.innerHTML = '<span class="is-loading-shimmer"></span>';
  if (elNewRet) elNewRet.innerHTML = '<span class="is-loading-shimmer"></span>';

  try {
    const res = await fetch(`/api/insights?days=${diffDays}&key=${encodeURIComponent(dashKey)}`);
    const data = await res.json();
    insightsData = data; // Cache globally

    // Populate Key Metrics
    document.getElementById('growthNewMembers').innerText = data.summary.newMembers;
    document.getElementById('growthNewCommunicators').innerText = data.summary.newCommunicators;
    document.getElementById('growthNewRetention').innerText = data.summary.newMemberRetention + '%';

    const labels = (data.dailyStats || []).map(s => formatDateString(s.date));

    // Chart 1: Joins by Source (Recorded joins)
    if (charts.joinsSource) charts.joinsSource.destroy();
    charts.joinsSource = new Chart(document.getElementById('joinsSourceChart'), {
      type: 'bar',
      data: {
        labels,
        datasets: [
          { label: 'Recorded Joins', data: (data.dailyStats || []).map(d => d.joins), backgroundColor: 'rgba(232, 200, 122, 0.7)' }
        ]
      },
      options: { responsive: true, maintainAspectRatio: false, scales: { x: { stacked: false }, y: { stacked: false } } }
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

    // Chart 3: Server leaves over time (Recorded leaves)
    if (charts.leavesTime) charts.leavesTime.destroy();
    charts.leavesTime = new Chart(document.getElementById('leavesTimeChart'), {
      type: 'bar',
      data: {
        labels,
        datasets: [
          { label: 'Recorded Leaves', data: (data.dailyStats || []).map(d => d.leaves), backgroundColor: '#E85D5D' }
        ]
      },
      options: { responsive: true, maintainAspectRatio: false, scales: { x: { stacked: false }, y: { stacked: false } } }
    });

    // Chart 4: First Day Activation Rate
    if (charts.activationRate) charts.activationRate.destroy();
    charts.activationRate = new Chart(document.getElementById('activationRateChart'), {
      type: 'line',
      data: {
        labels,
        datasets: [
          {
            label: 'Active Communicators (%)',
            data: (data.dailyStats || []).map(d => {
              if (!d.memberCount || d.memberCount === 0) return 0;
              return (d.messages > 0 || d.voiceHours > 0) ? Math.min(100, Math.round(((d.messages + (d.voiceHours * 10)) / d.memberCount) * 100)) : 0;
            }),
            borderColor: '#6BCB77',
            tension: 0.3
          }
        ]
      },
      options: { responsive: true, maintainAspectRatio: false, scales: { y: { min: 0, max: 100 } } }
    });

    // Chart 5: Week 1 Retention / Net Growth Rate
    if (charts.retentionRate) charts.retentionRate.destroy();
    charts.retentionRate = new Chart(document.getElementById('retentionRateChart'), {
      type: 'line',
      data: {
        labels,
        datasets: [{
          label: 'Net Member Growth (%)',
          data: (data.dailyStats || []).map(d => {
            const net = d.joins - d.leaves;
            if (!d.memberCount || d.memberCount === 0) return 0;
            return parseFloat(((net / d.memberCount) * 100).toFixed(1));
          }),
          borderColor: '#D4845A',
          tension: 0.3
        }]
      },
      options: { responsive: true, maintainAspectRatio: false, scales: { y: { min: -10, max: 20 } } }
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

    // Popular Referrers table (Honest note / no simulated math)
    const referrersTbody = document.getElementById('popularReferrersBody');
    if (referrersTbody) {
      referrersTbody.innerHTML = '<tr><td colspan="2" class="placeholder-text">Vanity URL / referral link referrer tracking is not recorded for this server.</td></tr>';
    }

  } catch (err) {
    console.error(err);
    renderPanelError('growth', 'Unable to load growth analytics from server.', () => loadGrowth());
  } finally {
    growthCharts.forEach(id => setChartLoading(id, false));
    finishGlobalProgress();
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

  const engCharts = ['visitedCommunicatedChart', 'messageActivityChart', 'voiceActivityChart', 'serverMutedChart'];
  setChartLoading('visitedCommunicatedChart', true, 'Loading visitor & communicator metrics...', 'Tracking member participation');
  setChartLoading('messageActivityChart', true, 'Loading message activity...', 'Analyzing messages per communicator');
  setChartLoading('voiceActivityChart', true, 'Loading voice minutes...', 'Calculating total VC speaking time');
  setChartLoading('serverMutedChart', true, 'Loading departure metrics...', 'Tracking member exits');
  startGlobalProgress();

  const elVis = document.getElementById('engVisitors');
  const elComm = document.getElementById('engCommunicators');
  const elMsg = document.getElementById('engTotalMessages');
  const elVc = document.getElementById('engTotalVoice');
  if (elVis) elVis.innerHTML = '<span class="is-loading-shimmer"></span>';
  if (elComm) elComm.innerHTML = '<span class="is-loading-shimmer"></span>';
  if (elMsg) elMsg.innerHTML = '<span class="is-loading-shimmer"></span>';
  if (elVc) elVc.innerHTML = '<span class="is-loading-shimmer"></span>';

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
          {
            label: '% Communicators',
            data: (data.dailyStats || []).map(d => (data.summary.visitors > 0 ? Math.min(100, Math.round((data.summary.communicators / data.summary.visitors) * 100)) : 0)),
            borderColor: '#6BCB77',
            yAxisID: 'y1'
          }
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
          { label: 'Messages Sent', type: 'bar', data: (data.dailyStats || []).map(d => d.messages || 0), backgroundColor: '#D4845A', yAxisID: 'y' },
          {
            label: 'Avg Messages per Communicator',
            type: 'line',
            data: (data.dailyStats || []).map(d => (data.summary.communicators > 0 ? parseFloat(((d.messages || 0) / data.summary.communicators).toFixed(1)) : 0)),
            borderColor: '#E8C87A',
            tension: 0.2,
            yAxisID: 'y1'
          }
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

    // Chart 4: Departures / Leaves over Time (Recorded)
    if (charts.serverMuted) charts.serverMuted.destroy();
    charts.serverMuted = new Chart(document.getElementById('serverMutedChart'), {
      type: 'bar',
      data: {
        labels,
        datasets: [
          { label: 'Recorded Leaves', data: (data.dailyStats || []).map(d => d.leaves || 0), backgroundColor: '#E85D5D' }
        ]
      },
      options: { responsive: true, maintainAspectRatio: false, scales: { x: { stacked: false }, y: { stacked: false } } }
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
          <td>${formatDuration(ch.minutes * 60000)}</td>
        </tr>
      `).join('');
    }

    insightsData = data;
    renderMessagesRankings();
    renderVoiceRankings();

  } catch (err) {
    console.error(err);
    renderPanelError('engagement', 'Unable to load engagement analytics from server.', () => loadEngagement());
  } finally {
    engCharts.forEach(id => setChartLoading(id, false));
    finishGlobalProgress();
  }
}

// ══════════════════════════════════════
//  AUDIENCE (NEW FEATURE)
// ══════════════════════════════════════
async function loadAudience() {
  startGlobalProgress();
  ['audiencePeakHoursBody', 'audienceDevicesBody', 'audienceDurationBody', 'audienceDiscordAgeBody'].forEach(tbodyId => {
    const el = document.getElementById(tbodyId);
    if (el) el.innerHTML = '<tr><td colspan="3" class="placeholder-text"><i data-lucide="loader-2" class="mini-icon" style="animation: techSpin 1s linear infinite;"></i> Analyzing server demographics...</td></tr>';
  });
  if (window.lucide) lucide.createIcons();

  try {
    const res = await fetch(`/api/insights?days=28&key=${encodeURIComponent(dashKey)}`);
    const data = await res.json();

    // 1. Peak Activity Hours
    const peakHoursTbody = document.getElementById('audiencePeakHoursBody');
    if (peakHoursTbody && data.audience && data.audience.peakHours) {
      peakHoursTbody.innerHTML = data.audience.peakHours.map(p => {
        let badgeClass = 'badge-normal';
        let badgeIcon = '<i data-lucide="activity" class="inline-icon-xs"></i> ';
        if (p.percentage >= 35 || p.status.includes('Peak')) {
          badgeClass = 'badge-peak';
          badgeIcon = '<i data-lucide="flame" class="inline-icon-xs"></i> ';
        } else if (p.percentage >= 25 || p.status.includes('High')) {
          badgeClass = 'badge-high';
          badgeIcon = '<i data-lucide="trending-up" class="inline-icon-xs"></i> ';
        } else if (p.status.includes('Quiet')) {
          badgeClass = 'badge-low';
          badgeIcon = '<i data-lucide="moon" class="inline-icon-xs"></i> ';
        }
        return `
          <tr>
            <td style="font-weight:600;color:var(--ink)">${escapeHtml(p.window)}</td>
            <td style="font-variant-numeric:tabular-nums;font-weight:700;color:var(--accent)">${p.percentage}%</td>
            <td><span class="activity-level-pill ${badgeClass}">${badgeIcon}${escapeHtml(p.status)}</span></td>
          </tr>
        `;
      }).join('');
      if (window.lucide) lucide.createIcons({ root: peakHoursTbody });
    }

    // 2. Devices
    const deviceTbody = document.getElementById('audienceDevicesBody');
    if (deviceTbody && data.audience && data.audience.devices) {
      deviceTbody.innerHTML = `
        <tr><td>Desktop or Mobile</td><td>${data.audience.devices.desktop + data.audience.devices.mobile}%</td></tr>
        <tr><td>Desktop Only</td><td>${data.audience.devices.desktop}%</td></tr>
        <tr><td>Mobile Only</td><td>${data.audience.devices.mobile}%</td></tr>
        <tr><td>Web Browser</td><td>${data.audience.devices.web}%</td></tr>
      `;
    }

    // 3. Membership Duration
    const durationTbody = document.getElementById('audienceDurationBody');
    if (durationTbody && data.audience && data.audience.membershipDuration) {
      durationTbody.innerHTML = Object.entries(data.audience.membershipDuration).map(([duration, pct]) => `
        <tr>
          <td>${duration}</td>
          <td>${pct}%</td>
        </tr>
      `).join('');
    }

    // 4. Discord Account Age
    const ageTbody = document.getElementById('audienceDiscordAgeBody');
    if (ageTbody && data.audience && data.audience.accountAge) {
      ageTbody.innerHTML = Object.entries(data.audience.accountAge).map(([age, pct]) => `
        <tr>
          <td>${age}</td>
          <td>${pct}%</td>
        </tr>
      `).join('');
    }

  } catch (err) {
    console.error(err);
    renderPanelError('audience', 'Unable to load audience insights from server.', () => loadAudience());
  } finally {
    finishGlobalProgress();
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
    csvContent += "Date,Recorded Joins\n";
    (insightsData.dailyStats || []).forEach(d => {
      csvContent += `${d.date},${d.joins}\n`;
    });
  } else if (type === 'membershipTime') {
    csvContent += "Date,Total Members\n";
    (insightsData.dailyStats || []).forEach(d => {
      csvContent += `${d.date},${d.memberCount}\n`;
    });
  } else if (type === 'leavesTime') {
    csvContent += "Date,Recorded Leaves\n";
    (insightsData.dailyStats || []).forEach(d => {
      csvContent += `${d.date},${d.leaves}\n`;
    });
  } else if (type === 'activationRate') {
    csvContent += "Date,Messages,Voice Hours\n";
    (insightsData.dailyStats || []).forEach(d => {
      csvContent += `${d.date},${d.messages || 0},${d.voiceHours || 0}\n`;
    });
  } else if (type === 'retentionRate') {
    csvContent += "Date,Net Growth\n";
    (insightsData.dailyStats || []).forEach(d => {
      csvContent += `${d.date},${d.joins - d.leaves}\n`;
    });
  } else if (type === 'popularInvites') {
    csvContent += "Invite Code,Uses\n";
    (insightsData.popularInvites || []).forEach(inv => {
      csvContent += `${inv.code},${inv.uses}\n`;
    });
  } else if (type === 'popularReferrers') {
    csvContent += "Referrer,Status\n";
    csvContent += "Referral links,Not tracked\n";
  } else if (type === 'visitedCommunicated') {
    csvContent += "Date,Visitors\n";
    (insightsData.dailyStats || []).forEach(d => {
      csvContent += `${d.date},${Math.round(insightsData.summary.visitors / (insightsData.dailyStats.length || 1))}\n`;
    });
  } else if (type === 'messageActivity') {
    csvContent += "Date,Messages Sent\n";
    (insightsData.dailyStats || []).forEach(d => {
      csvContent += `${d.date},${d.messages || 0}\n`;
    });
  } else if (type === 'voiceActivity') {
    csvContent += "Date,Speaking Minutes\n";
    (insightsData.dailyStats || []).forEach(d => {
      csvContent += `${d.date},${Math.round(d.voiceHours * 60)}\n`;
    });
  } else if (type === 'serverMuted') {
    csvContent += "Date,Departures\n";
    (insightsData.dailyStats || []).forEach(d => {
      csvContent += `${d.date},${d.leaves || 0}\n`;
    });
  } else if (type === 'textChannelUsage') {
    csvContent += "Channel,Visitors,Communicators,Messages\n";
    (insightsData.textChannelUsage || []).forEach(ch => {
      csvContent += `${ch.name},${ch.visitors},${ch.communicators},${ch.messages}\n`;
    });
  } else if (type === 'voiceChannelUsage') {
    csvContent += "Channel,Speakers,Speaking Minutes\n";
    (insightsData.voiceChannelUsage || []).forEach(ch => {
      csvContent += `${ch.name},${ch.speakers},${ch.minutes}\n`;
    });
  } else if (type === 'audiencePeakHours') {
    csvContent += "Time Window,Percentage,Activity Level\n";
    if (insightsData.audience && insightsData.audience.peakHours) {
      insightsData.audience.peakHours.forEach(p => {
        csvContent += `"${p.window}",${p.percentage}%,"${p.status}"\n`;
      });
    }
  } else if (type === 'audienceDevices') {
    csvContent += "Device,Percentage\n";
    if (insightsData.audience && insightsData.audience.devices) {
      csvContent += `Desktop or Mobile,${insightsData.audience.devices.desktop + insightsData.audience.devices.mobile}%\n`;
      csvContent += `Web Browser,${insightsData.audience.devices.web}%\n`;
    }
  } else if (type === 'audienceDuration') {
    csvContent += "Member Since,Percentage\n";
    if (insightsData.audience && insightsData.audience.membershipDuration) {
      Object.entries(insightsData.audience.membershipDuration).forEach(([d, p]) => {
        csvContent += `${d},${p}%\n`;
      });
    }
  } else if (type === 'audienceDiscordAge') {
    csvContent += "Discord Age,Percentage\n";
    if (insightsData.audience && insightsData.audience.accountAge) {
      Object.entries(insightsData.audience.accountAge).forEach(([d, p]) => {
        csvContent += `${d},${p}%\n`;
      });
    }
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
  startGlobalProgress();
  fetch('/api/leaderboard?key=' + encodeURIComponent(dashKey)).then(r=>r.json()).then(data => {
    if (!data.length) { tbody.innerHTML = '<tr><td colspan="5" class="placeholder-text">No leveling data yet.</td></tr>'; return; }
    tbody.innerHTML = data.map((u, i) => {
      const rank = i + 1;
      const rc = rank <= 3 ? 'rank-' + rank : 'rank-default';
      const xpNext = (u.level + 1) * (u.level + 1) * 100;
      const pct = Math.min((u.xp / xpNext) * 100, 100);
      return '<tr><td><span class="rank-badge '+rc+'">'+rank+'</span></td><td class="lb-user">'+escapeHtml(u.username||u.userID)+'</td><td class="lb-level">'+u.level+'</td><td>'+u.xp.toLocaleString()+'</td><td style="min-width:110px"><div class="xp-bar-track"><div class="xp-bar-fill" style="width:'+pct+'%"></div></div></td></tr>';
    }).join('');
  }).catch(() => {
    renderTableError('lbBody', 5, 'Failed to load XP leaderboard from server.', () => fetchLeaderboard());
  }).finally(() => {
    finishGlobalProgress();
  });
}

// ══════════════════════════════════════
//  INVITE LEADERBOARD
// ══════════════════════════════════════
function fetchInviteLeaderboard() {
  const tbody = document.getElementById('inviteLbBody');
  if (!tbody) return;
  
  tbody.innerHTML = '<tr><td colspan="3" class="placeholder-text"><i data-lucide="loader-2" class="mini-icon" style="animation: techSpin 1s linear infinite;"></i> Loading invite leaderboard...</td></tr>';
  if (window.lucide) lucide.createIcons();
  startGlobalProgress();

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
      renderTableError('inviteLbBody', 3, 'Failed to load invite leaderboard from server.', () => fetchInviteLeaderboard());
    })
    .finally(() => {
      finishGlobalProgress();
    });
}

// ══════════════════════════════════════
//  ACTIVITY
// ══════════════════════════════════════
function fetchActivity() {
  startGlobalProgress();
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
  }).catch(() => {
    renderPanelError('liveActivitiesBody', 'Failed to load server activity stream.', () => fetchActivity());
  }).finally(() => {
    finishGlobalProgress();
  });
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
  }).catch(() => {
    renderTableError('gameLeaderboardBody', 3, 'Failed to load game leaderboard from server.', () => fetchGameLeaderboard());
  });
}

// ══════════════════════════════════════
//  MEMBERS & ROLES
// ══════════════════════════════════════
function loadMembers() {
  startGlobalProgress();
  setChartLoading('roleChart', true, 'Loading role distribution...', 'Fetching guild roles');

  const p1 = fetch('/api/members?key=' + encodeURIComponent(dashKey)).then(r=>r.json()).then(members => {
    const tbody = document.getElementById('membersTableBody');
    if (!members || !members.length) {
      tbody.innerHTML = '<tr><td colspan="4" class="placeholder-text">No members found.</td></tr>';
      return;
    }
    tbody.innerHTML = members.map(m => {
      const roles = m.roles.slice(0,3).map(r => '<span style="color:'+r.color+'">'+escapeHtml(r.name)+'</span>').join(', ');
      return '<tr><td><img class="player-avatar" src="'+m.avatar+'" style="margin-right:0.5rem">'+escapeHtml(m.username)+'</td><td>'+m.status+'</td><td>'+new Date(m.joinedAt).toLocaleDateString()+'</td><td>'+roles+(m.roles.length>3?'...':'')+'</td></tr>';
    }).join('');
  }).catch(() => {
    renderTableError('membersTableBody', 4, 'Failed to load member list from bot.', () => loadMembers());
  });

  const p2 = fetch('/api/roles?key=' + encodeURIComponent(dashKey)).then(r=>r.json()).then(roles => {
    if (charts.role) {
      charts.role.destroy();
      charts.role = null;
    }
    const chartCanvas = document.getElementById('roleChart');
    if (!chartCanvas) return;

    const defaultColors = [
      '#5865F2', '#0059FF', '#E8C87A', '#6BCB77', '#E85D5D',
      '#D4845A', '#9B59B6', '#1ABC9C', '#F1C40F', '#E67E22'
    ];

    const activeRoles = (roles || []).filter(r => r.members > 0).slice(0, 10);
    const displayRoles = activeRoles.length ? activeRoles : (roles || []).slice(0, 10);

    if (!displayRoles.length) {
      const parent = chartCanvas.parentElement;
      if (parent) {
        parent.innerHTML = '<div class="placeholder-text" style="padding:2rem;text-align:center">No roles found in this server.</div>';
      }
      return;
    }

    charts.role = new Chart(chartCanvas, {
      type: 'doughnut',
      data: {
        labels: displayRoles.map(r => r.name),
        datasets: [{
          data: displayRoles.map(r => r.members),
          backgroundColor: displayRoles.map((r, i) => (r.color && r.color !== '#000000') ? r.color : defaultColors[i % defaultColors.length]),
          borderColor: 'rgba(18, 24, 34, 0.95)',
          borderWidth: 2,
          hoverOffset: 6
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        cutout: '62%',
        plugins: {
          legend: {
            position: 'bottom',
            labels: {
              color: '#c9d1d9',
              font: { family: "'Plus Jakarta Sans', sans-serif", size: 11 },
              padding: 10,
              usePointStyle: true,
              pointStyle: 'circle'
            }
          },
          tooltip: {
            callbacks: {
              label: function(context) {
                const label = context.label || '';
                const val = context.parsed || 0;
                return ` ${label}: ${val.toLocaleString()} members`;
              }
            }
          }
        }
      }
    });
  }).catch(err => {
    console.error('Error loading roleChart:', err);
    const chartCanvas = document.getElementById('roleChart');
    if (chartCanvas && chartCanvas.parentElement) {
      chartCanvas.parentElement.innerHTML = '<div class="placeholder-text" style="padding:2rem;text-align:center;color:var(--danger)">Failed to load role distribution.</div>';
    }
  });

  Promise.allSettled([p1, p2]).finally(() => {
    setChartLoading('roleChart', false);
    finishGlobalProgress();
  });
}

// ══════════════════════════════════════
//  AUDIT LOGS
// ══════════════════════════════════════
function loadAudit() {
  fetch('/api/audit-logs?key=' + encodeURIComponent(dashKey)).then(r=>r.json()).then(logs => {
    const tbody = document.getElementById('auditTableBody');
    if (!logs || !logs.length) {
      tbody.innerHTML = '<tr><td colspan="5" class="placeholder-text">No audit log entries found.</td></tr>';
      return;
    }
    tbody.innerHTML = logs.map(log =>
      '<tr><td>'+new Date(log.date).toLocaleString()+'</td><td>'+(log.executor?escapeHtml(log.executor.username):'Unknown')+'</td><td>'+log.action+'</td><td>'+(log.target?escapeHtml(log.target.username):'-')+'</td><td>'+(log.reason||'-')+'</td></tr>'
    ).join('');
  }).catch(() => {
    renderTableError('auditTableBody', 5, 'Failed to load audit logs from bot.', () => loadAudit());
  });
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
  }).catch(() => {
    renderPanelError('commandsGrid', 'Failed to retrieve registered commands from bot.', () => loadCommands());
  });
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

// ══════════════════════════════════════
//  CUSTOM COMMANDS
// ══════════════════════════════════════
let ccEditingName = null; // tracks which command we're editing

function loadCustomCommands() {
  fetch('/api/custom-commands?key=' + encodeURIComponent(dashKey))
    .then(r => r.json())
    .then(data => renderCommandList(data.commands || {}))
    .catch(() => {
      renderPanelError('ccList', 'Failed to load custom commands from bot.', () => loadCustomCommands());
      showToast('Failed to load custom commands', 'error');
    });
}

function renderCommandList(commands) {
  const list = document.getElementById('ccList');
  const count = document.getElementById('ccCount');
  const entries = Object.entries(commands);
  count.textContent = '(' + entries.length + ')';

  if (entries.length === 0) {
    list.innerHTML = '<div class="cc-empty">No custom commands yet. Create one to get started!</div>';
    return;
  }

  list.innerHTML = entries.map(([name, cmd]) => {
    const resp = escapeHtml((cmd.response || '').substring(0, 120));
    const desc = cmd.description ? escapeHtml(cmd.description) : '';
    const embedBadge = cmd.embed ? '<span class="cc-badge">EMBED</span>' : '';
    return `
      <div class="cc-card">
        <div class="cc-card-header">
          <span class="cc-card-name">${escapeHtml(name)}</span>
          <div class="cc-card-actions">
            <button class="cc-edit" onclick="editCustomCommand('${escapeHtml(name)}')"><i data-lucide="pencil" class="btn-icon-sm"></i> Edit</button>
            <button class="cc-delete" onclick="deleteCustomCommand('${escapeHtml(name)}')"><i data-lucide="trash-2" class="btn-icon-sm"></i> Delete</button>
          </div>
        </div>
        <div class="cc-card-response">${resp}${cmd.response && cmd.response.length > 120 ? '…' : ''}</div>
        <div class="cc-card-meta">
          ${desc ? '<span>' + desc + '</span>' : ''}
          ${embedBadge}
        </div>
      </div>
    `;
  }).join('');
  if (window.lucide) lucide.createIcons();
}

function saveCustomCommand() {
  const nameInput = document.getElementById('ccName');
  const responseInput = document.getElementById('ccResponse');
  const descInput = document.getElementById('ccDescription');
  const embedInput = document.getElementById('ccEmbed');

  const name = nameInput.value.trim().toLowerCase().replace(/\s+/g, '-');
  const response = responseInput.value.trim();
  const description = descInput.value.trim();
  const embed = embedInput.checked;

  if (!name) return showToast('Command name is required', 'error');
  if (!response) return showToast('Response cannot be empty', 'error');
  if (name.length > 32) return showToast('Name must be 32 chars or less', 'error');

  const body = { name, response, description, embed };
  if (ccEditingName && ccEditingName !== name) body.oldName = ccEditingName;

  fetch('/api/custom-commands?key=' + encodeURIComponent(dashKey), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  })
    .then(r => { if (!r.ok) throw new Error(); return r.json(); })
    .then(data => {
      showToast(ccEditingName ? 'Command updated!' : 'Command created!', 'success');
      cancelEditCommand();
      renderCommandList(data.commands || {});
    })
    .catch(() => showToast('Failed to save command', 'error'));
}

function editCustomCommand(name) {
  fetch('/api/custom-commands?key=' + encodeURIComponent(dashKey))
    .then(r => r.json())
    .then(data => {
      const cmd = (data.commands || {})[name];
      if (!cmd) return showToast('Command not found', 'error');
      ccEditingName = name;
      document.getElementById('ccName').value = name;
      document.getElementById('ccResponse').value = cmd.response || '';
      document.getElementById('ccDescription').value = cmd.description || '';
      document.getElementById('ccEmbed').checked = !!cmd.embed;
      document.getElementById('ccEditorTitle').textContent = 'Editing: ' + name;
      document.getElementById('ccCancelBtn').style.display = '';
      document.getElementById('ccName').focus();
    })
    .catch(() => showToast('Failed to load command', 'error'));
}

function cancelEditCommand() {
  ccEditingName = null;
  document.getElementById('ccName').value = '';
  document.getElementById('ccResponse').value = '';
  document.getElementById('ccDescription').value = '';
  document.getElementById('ccEmbed').checked = false;
  document.getElementById('ccEditorTitle').textContent = 'Create New Command';
  document.getElementById('ccCancelBtn').style.display = 'none';
}

function deleteCustomCommand(name) {
  if (!confirm('Delete command "' + name + '"? This cannot be undone.')) return;
  fetch('/api/custom-commands?key=' + encodeURIComponent(dashKey), {
    method: 'DELETE',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name })
  })
    .then(r => { if (!r.ok) throw new Error(); return r.json(); })
    .then(data => {
      showToast('Command deleted', 'success');
      if (ccEditingName === name) cancelEditCommand();
      renderCommandList(data.commands || {});
    })
    .catch(() => showToast('Failed to delete', 'error'));
}

// ══════════════════════════════════════
//  NICKNAME LOCK
// ══════════════════════════════════════
let nicknameLockEntries = [];
let editingLockUserId = null;

function loadNicknameLock() {
  startGlobalProgress();
  fetch('/api/nickname-lock?key=' + encodeURIComponent(dashKey))
    .then(r => r.json())
    .then(data => {
      nicknameLockEntries = data.entries || [];
      renderNicknameLockList(nicknameLockEntries);
    })
    .catch(() => {
      renderPanelError('nlList', 'Failed to load nickname locks from bot.', () => loadNicknameLock());
      showToast('Failed to load nickname locks', 'error');
    })
    .finally(() => {
      finishGlobalProgress();
    });
}

function renderNicknameLockList(entries) {
  const list = document.getElementById('nlList');
  const count = document.getElementById('nlCount');
  if (count) count.textContent = '(' + entries.length + ')';
  if (!list) return;

  if (entries.length === 0) {
    list.innerHTML = '<div class="cc-empty">No users are nickname-locked yet.</div>';
    return;
  }

  list.innerHTML = entries.map(entry => {
    const isEditing = (editingLockUserId === entry.userId);
    const avatarHtml = entry.avatar
      ? `<img src="${escapeHtml(entry.avatar)}" alt="" class="nl-avatar">`
      : `<div class="nl-avatar-placeholder"><i data-lucide="user" class="avatar-icon-sm"></i></div>`;

    const nickDisplayHtml = isEditing
      ? `
        <div class="nl-edit-wrap">
          <div class="nl-edit-input-group">
            <i data-lucide="lock" class="nl-edit-icon"></i>
            <input type="text" class="nl-edit-input" id="nlInput_${entry.userId}" value="${escapeHtml(entry.lockedNickname)}" placeholder="New nickname..." maxlength="32" onkeydown="handleNicknameEditKey(event, '${entry.userId}')">
          </div>
        </div>
      `
      : `<div class="nl-locked-nick" title="Locked nickname"><i data-lucide="lock" class="inline-icon-xs"></i> ${escapeHtml(entry.lockedNickname)}</div>`;

    const actionsHtml = isEditing
      ? `
        <div class="nl-actions">
          <button class="nl-save-btn" id="nlSaveBtn_${entry.userId}" onclick="saveNicknameEdit('${entry.userId}')" title="Save nickname">
            <i data-lucide="check" class="btn-icon-sm"></i> Save
          </button>
          <button class="nl-cancel-btn" onclick="cancelNicknameEdit('${entry.userId}')" title="Cancel edit">
            <i data-lucide="x" class="btn-icon-sm"></i> Cancel
          </button>
        </div>
      `
      : `
        <div class="nl-actions">
          <button class="nl-edit-btn" onclick="startNicknameEdit('${entry.userId}')" title="Edit locked nickname">
            <i data-lucide="edit-3" class="btn-icon-sm"></i> Edit
          </button>
          <button class="nl-unlock-btn" onclick="removeNicknameLock('${entry.userId}')" title="Unlock nickname">
            <i data-lucide="unlock" class="btn-icon-sm"></i> Unlock
          </button>
        </div>
      `;

    return `
      <div class="nl-card ${isEditing ? 'is-editing' : ''}">
        ${avatarHtml}
        <div class="nl-info">
          <div class="nl-username">${escapeHtml(entry.username)}</div>
          ${nickDisplayHtml}
          <div class="nl-id">${entry.userId}</div>
        </div>
        ${actionsHtml}
      </div>
    `;
  }).join('');

  if (window.lucide) lucide.createIcons();
}

function startNicknameEdit(userId) {
  editingLockUserId = userId;
  renderNicknameLockList(nicknameLockEntries);
  setTimeout(() => {
    const inp = document.getElementById('nlInput_' + userId);
    if (inp) {
      inp.focus();
      inp.select();
    }
  }, 50);
}

function cancelNicknameEdit(userId) {
  if (editingLockUserId === userId) {
    editingLockUserId = null;
    renderNicknameLockList(nicknameLockEntries);
  }
}

function handleNicknameEditKey(event, userId) {
  if (event.key === 'Enter') {
    event.preventDefault();
    saveNicknameEdit(userId);
  } else if (event.key === 'Escape') {
    event.preventDefault();
    cancelNicknameEdit(userId);
  }
}

function saveNicknameEdit(userId) {
  const inp = document.getElementById('nlInput_' + userId);
  if (!inp) return;
  const newNick = inp.value.trim();
  if (!newNick) return showToast('Nickname cannot be empty', 'error');

  const saveBtn = document.getElementById('nlSaveBtn_' + userId);
  if (saveBtn) {
    saveBtn.disabled = true;
    saveBtn.innerHTML = '<i data-lucide="loader-2" class="btn-icon-sm" style="animation: techSpin 1s linear infinite;"></i> Saving...';
    if (window.lucide) lucide.createIcons({ root: saveBtn });
  }

  fetch('/api/nickname-lock?key=' + encodeURIComponent(dashKey), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ userId, nickname: newNick })
  })
    .then(r => {
      if (!r.ok) return r.json().then(d => { throw new Error(d.error); });
      return r.json();
    })
    .then(() => {
      showToast('Nickname updated!', 'success');
      editingLockUserId = null;
      loadNicknameLock();
    })
    .catch(err => {
      showToast(err.message || 'Failed to update nickname', 'error');
      if (saveBtn) {
        saveBtn.disabled = false;
        saveBtn.innerHTML = '<i data-lucide="check" class="btn-icon-sm"></i> Save';
        if (window.lucide) lucide.createIcons({ root: saveBtn });
      }
    });
}

function addNicknameLock() {
  const userId = document.getElementById('nlUserId').value.trim();
  const nickname = document.getElementById('nlNickname').value.trim();

  if (!userId) return showToast('User ID is required', 'error');
  if (!/^\d{17,20}$/.test(userId)) return showToast('Invalid User ID format', 'error');

  const body = { userId };
  if (nickname) body.nickname = nickname;

  fetch('/api/nickname-lock?key=' + encodeURIComponent(dashKey), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  })
    .then(r => { if (!r.ok) return r.json().then(d => { throw new Error(d.error); }); return r.json(); })
    .then(() => {
      showToast('Nickname locked!', 'success');
      document.getElementById('nlUserId').value = '';
      document.getElementById('nlNickname').value = '';
      loadNicknameLock();
    })
    .catch(err => showToast(err.message || 'Failed to lock nickname', 'error'));
}

function removeNicknameLock(userId) {
  if (!confirm('Unlock this user\'s nickname?')) return;
  fetch('/api/nickname-lock?key=' + encodeURIComponent(dashKey), {
    method: 'DELETE',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ userId })
  })
    .then(r => { if (!r.ok) throw new Error(); return r.json(); })
    .then(() => {
      showToast('User unlocked', 'success');
      loadNicknameLock();
    })
    .catch(() => showToast('Failed to unlock', 'error'));
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
        '<span style="color: var(--ink); font-size: 0.85rem; font-weight: 600;">' + u.messages.toLocaleString() + ' msgs</span>' +
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
          '<span class="player-name" style="font-weight: 500; color: var(--ink);">' + escapeHtml(ch.name) + '</span>' +
        '</div>' +
        '<span style="color: var(--ink-muted); font-size: 0.82rem;">' + ch.messages.toLocaleString() + ' msgs</span>' +
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
          '<span class="player-name" style="font-weight: 500; color: var(--ink);">' + escapeHtml(ch.name) + '</span>' +
        '</div>' +
        '<span class="player-time">' + ch.hours.toLocaleString() + ' hrs</span>' +
      '</div>';
    }).join('');
  }
}

// ══════════════════════════════════════
//  EMBED BUILDER (NEW FEATURE)
// ══════════════════════════════════════
let isEbListenersBound = false;

async function loadEmbedBuilder() {
  // Try to load bot profile for preview (username/avatar)
  try {
    const res = await fetch('/api/stats?key=' + encodeURIComponent(dashKey));
    const stats = await res.json();
    if (stats.botName) {
      document.getElementById('ebBotName').innerText = stats.botName;
      if (stats.botAvatar) {
        const avatarPlaceholder = document.getElementById('ebBotAvatar');
        if (avatarPlaceholder) {
          avatarPlaceholder.outerHTML = `<img src="${stats.botAvatar}" id="ebBotAvatar" class="discord-avatar" alt="Avatar">`;
        }
      }
    }
  } catch (err) {
    console.error('Failed to load bot stats for preview:', err);
  }

  // Bind live preview listeners if not already bound
  if (!isEbListenersBound) {
    bindEbListeners();
    isEbListenersBound = true;
  }

  // Fetch server channels
  await fetchChannels();
}

async function fetchChannels() {
  const select = document.getElementById('ebChannelSelect');
  if (!select) return;
  
  try {
    const res = await fetch(`/api/channels?key=${encodeURIComponent(dashKey)}`);
    if (!res.ok) throw new Error('Failed to fetch channels');
    const channels = await res.json();
    
    if (channels.length === 0) {
      select.innerHTML = '<option value="">No text channels found</option>';
    } else {
      select.innerHTML = channels.map(ch => `<option value="${ch.id}">#${ch.name}</option>`).join('');
    }
  } catch (err) {
    console.error(err);
    select.innerHTML = '<option value="">Error loading channels</option>';
  }
}

function bindEbListeners() {
  const titleInput = document.getElementById('ebTitle');
  const descInput = document.getElementById('ebDescription');
  const colorInput = document.getElementById('ebColor');
  const colorHexInput = document.getElementById('ebColorHex');
  const thumbInput = document.getElementById('ebThumbnail');
  const imgInput = document.getElementById('ebImage');
  const footerInput = document.getElementById('ebFooter');

  const previewCard = document.getElementById('ebPreviewCard');
  const previewTitle = document.getElementById('ebPreviewTitle');
  const previewDesc = document.getElementById('ebPreviewDescription');
  const previewThumb = document.getElementById('ebPreviewThumbnail');
  const previewImg = document.getElementById('ebPreviewImage');
  const previewFooter = document.getElementById('ebPreviewFooter');

  function updatePreview() {
    // Title
    if (titleInput.value.trim()) {
      previewTitle.innerText = titleInput.value;
      previewTitle.classList.remove('hidden');
    } else {
      previewTitle.classList.add('hidden');
    }

    // Description
    if (descInput.value.trim()) {
      let formattedText = escapeHtml(descInput.value)
        .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
        .replace(/\*(.*?)\*/g, '<em>$1</em>')
        .replace(/__(.*?)__/g, '<u>$1</u>')
        .replace(/\n/g, '<br>');
      previewDesc.innerHTML = formattedText;
      previewDesc.classList.remove('hidden');
    } else {
      previewDesc.classList.add('hidden');
    }

    // Thumbnail
    if (thumbInput.value.trim() && (thumbInput.value.startsWith('http://') || thumbInput.value.startsWith('https://'))) {
      previewThumb.src = thumbInput.value;
      previewThumb.classList.remove('hidden');
    } else {
      previewThumb.classList.add('hidden');
    }

    // Image
    if (imgInput.value.trim() && (imgInput.value.startsWith('http://') || imgInput.value.startsWith('https://'))) {
      previewImg.src = imgInput.value;
      previewImg.classList.remove('hidden');
    } else {
      previewImg.classList.add('hidden');
    }

    // Footer
    if (footerInput.value.trim()) {
      previewFooter.innerText = footerInput.value;
      previewFooter.classList.remove('hidden');
    } else {
      previewFooter.classList.add('hidden');
    }
  }

  // Synchronize color picker and hex text input
  colorInput.addEventListener('input', () => {
    colorHexInput.value = colorInput.value;
    previewCard.style.borderLeftColor = colorInput.value;
  });

  colorHexInput.addEventListener('input', () => {
    const val = colorHexInput.value.trim();
    if (/^#[0-9A-F]{6}$/i.test(val)) {
      colorInput.value = val;
      previewCard.style.borderLeftColor = val;
    }
  });

  // Listeners for updates
  titleInput.addEventListener('input', updatePreview);
  descInput.addEventListener('input', updatePreview);
  thumbInput.addEventListener('input', updatePreview);
  imgInput.addEventListener('input', updatePreview);
  footerInput.addEventListener('input', updatePreview);

  // Initialize preview
  updatePreview();
}

async function sendEmbed() {
  const channelId = document.getElementById('ebChannelSelect').value;
  const title = document.getElementById('ebTitle').value.trim();
  const description = document.getElementById('ebDescription').value.trim();
  const color = document.getElementById('ebColorHex').value.trim();
  const thumbnail = document.getElementById('ebThumbnail').value.trim();
  const image = document.getElementById('ebImage').value.trim();
  const footer = document.getElementById('ebFooter').value.trim();

  if (!channelId) {
    showToast('Please select a target channel', 'error');
    return;
  }
  if (!title && !description) {
    showToast('Embed must have at least a Title or Description', 'error');
    return;
  }

  try {
    const res = await fetch(`/api/send-embed?key=${encodeURIComponent(dashKey)}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        channelId,
        title,
        description,
        color,
        thumbnail,
        image,
        footer
      })
    });

    const data = await res.json();
    if (res.ok && data.success) {
      showToast('Embed successfully sent to Discord!', 'success');
      // Clear input fields
      document.getElementById('ebTitle').value = '';
      document.getElementById('ebDescription').value = '';
      document.getElementById('ebThumbnail').value = '';
      document.getElementById('ebImage').value = '';
      document.getElementById('ebFooter').value = '';
      
      // Update preview card
      document.getElementById('ebPreviewTitle').innerText = 'Embed Title';
      document.getElementById('ebPreviewDescription').innerText = 'Embed body text (supports markdown)';
      document.getElementById('ebPreviewTitle').classList.remove('hidden');
      document.getElementById('ebPreviewDescription').classList.remove('hidden');
      document.getElementById('ebPreviewThumbnail').classList.add('hidden');
      document.getElementById('ebPreviewImage').classList.add('hidden');
      document.getElementById('ebPreviewFooter').classList.add('hidden');
    } else {
      showToast(data.error || 'Failed to send embed', 'error');
    }
  } catch (err) {
    console.error(err);
    showToast('Failed to send request to server', 'error');
  }
}
