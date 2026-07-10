const { EmbedBuilder, SlashCommandBuilder } = require('discord.js');
const os = require('os');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('status')
    .setDescription('Returns bot health statistics (RAM, CPU, Uptime)'),
  name: 'status',
  category: 'info',
  description: 'Returns bot health statistics (RAM, CPU, Uptime)',
  run: async (client, message, args) => {
    // 1. Calculate RAM usage
    const memory = process.memoryUsage();
    const rss = (memory.rss / 1024 / 1024).toFixed(1);
    const heapUsed = (memory.heapUsed / 1024 / 1024).toFixed(1);

    // 2. Calculate Uptime
    let days = Math.floor(client.uptime / 86400000);
    let hours = Math.floor(client.uptime / 3600000) % 24;
    let minutes = Math.floor(client.uptime / 60000) % 60;
    let seconds = Math.floor(client.uptime / 1000) % 60;

    // 3. CPU Load
    const cpuLoad = os.loadavg()[0].toFixed(2);

    const embed = new EmbedBuilder()
      .setTitle('🤖 Bot System Status')
      .addFields([
        { name: '📶 WebSocket Ping', value: `\`${client.ws.ping}ms\``, inline: true },
        { name: '⏱️ Bot Uptime', value: `\`${days}d ${hours}h ${minutes}m ${seconds}s\``, inline: true },
        { name: '💾 RAM Usage (RSS)', value: `\`${rss} MB\``, inline: true },
        { name: '🧠 RAM Usage (Heap)', value: `\`${heapUsed} MB\``, inline: true },
        { name: '⚙️ CPU Load (1m)', value: `\`${cpuLoad}%\``, inline: true },
        { name: '🔌 Host Platform', value: `\`${os.platform()} (${os.arch()})\``, inline: true }
      ])
      .setColor('#0059FF')
      .setTimestamp();

    message.channel.send({ embeds: [embed] });
  }
};
