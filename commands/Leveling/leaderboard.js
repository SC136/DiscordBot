const Discord = require("discord.js");
const Levels = require("discord-xp");

module.exports = {
  name: 'leaderboard',
  aliases: ['lb', 'xplb'],
  description: 'View the server level and XP leaderboard.',
  run: async (client, message, args) => {
    if (!process.env.MONGO_URI) {
      return message.channel.send("❌ *MongoDB is not configured in the environment variables. Leveling is disabled.*");
    }

    try {
      const rawLeaderboard = await Levels.fetchLeaderboard(message.guild.id, 10);
      if (rawLeaderboard.length < 1) {
        return message.channel.send("📊 *The leaderboard is currently empty! Send some messages to earn XP.*");
      }

      const leaderboard = await Levels.computeLeaderboard(client, rawLeaderboard, true);

      const embed = new Discord.MessageEmbed()
        .setTitle(`🏆 Server XP Leaderboard — ${message.guild.name}`)
        .setColor('#FFD700') // Gold color
        .setThumbnail(message.guild.iconURL({ dynamic: true, size: 256 }))
        .setTimestamp()
        .setFooter("XP Leaderboard | SC SmartTech");

      const list = leaderboard.map((entry, index) => {
        let medal = '•';
        if (index === 0) medal = '🥇';
        else if (index === 1) medal = '🥈';
        else if (index === 2) medal = '🥉';

        const username = entry.username || `User#${entry.discriminator || '0000'}`;
        return `\`${medal}\` **${username}** (Level ${entry.level}) — \`${entry.xp.toLocaleString()} XP\``;
      }).join('\n');

      embed.setDescription(list);

      return message.channel.send(embed);
    } catch (err) {
      console.error("Error in leaderboard command:", err);
      return message.channel.send(`❌ *An error occurred while fetching the leaderboard: ${err.message}*`);
    }
  }
};
