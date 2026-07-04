const { EmbedBuilder } = require("discord.js");
const Levels = require("discord-xp");
const { sendError } = require('../../utils/errorEmbed');
const { paginate } = require('../../utils/paginate');

module.exports = {
  name: 'leaderboard',
  aliases: ['lb', 'xplb'],
  description: 'View the server level and XP leaderboard with pagination.',
  run: async (client, message, args) => {
    if (!process.env.MONGO_URI) {
      return message.channel.send("❌ *MongoDB is not configured in the environment variables. Leveling is disabled.*");
    }

    try {
      // Fetch up to 50 users
      const rawLeaderboard = await Levels.fetchLeaderboard(message.guild.id, 50);
      if (rawLeaderboard.length < 1) {
        return message.channel.send("📊 *The leaderboard is currently empty! Send some messages to earn XP.*");
      }

      const leaderboard = await Levels.computeLeaderboard(client, rawLeaderboard, true);

      // Chunk the leaderboard into lists of 10 entries per page
      const chunkSize = 10;
      const pages = [];

      for (let i = 0; i < leaderboard.length; i += chunkSize) {
        const chunk = leaderboard.slice(i, i + chunkSize);
        
        const list = chunk.map((entry, index) => {
          const overallIndex = i + index;
          let medal = '•';
          if (overallIndex === 0) medal = '🥇';
          else if (overallIndex === 1) medal = '🥈';
          else if (overallIndex === 2) medal = '🥉';

          const username = entry.username || `User#${entry.discriminator || '0000'}`;
          return `\`${medal}\` **${username}** (Level ${entry.level}) — \`${entry.xp.toLocaleString()} XP\``;
        }).join('\n');

        const embed = new EmbedBuilder()
          .setTitle(`🏆 Server XP Leaderboard — ${message.guild.name}`)
          .setColor('#FFD700') // Gold color
          .setThumbnail(message.guild.iconURL({ forceStatic: false, size: 256 }))
          .setDescription(list)
          .setTimestamp()
          .setFooter({ text: `Page ${pages.length + 1} | XP Leaderboard | SC SmartTech` });

        pages.push(embed);
      }

      await paginate(message, pages, { timeout: 60000 });
    } catch (err) {
      return sendError(message, {
        title: 'Failed to load leaderboard',
        description: 'An error occurred while fetching the leveling leaderboard. Please try again later.',
        command: 'leaderboard',
        error: err
      });
    }
  }
};
