const { EmbedBuilder , SlashCommandBuilder } = require('discord.js');
const { sendError } = require('../../utils/errorEmbed');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('steam')
    .setDescription('No description provided')
    .addStringOption(opt => opt.setName('query').setDescription('Game name').setRequired(true)),
  name: 'steam',
  aliases: ['steamstats', 'steamprofile'],
  description: 'View Steam profile statistics and activity for SC.',
  run: async (client, message, args) => {
    try {
      message.channel.sendTyping().catch(() => {});

      const STEAM_FN = 'https://vixnfmutdbaprqflgzpr.supabase.co/functions/v1/steam-profile';
      const res = await fetch(STEAM_FN);
      
      if (!res.ok) {
        return message.channel.send({
          embeds: [
            new EmbedBuilder()
              .setDescription('❌ *Failed to fetch Steam profile statistics.*')
              .setColor('#E85D5D')
          ]
        });
      }

      const data = await res.json();

      if (data.error) {
        return message.channel.send({
          embeds: [
            new EmbedBuilder()
              .setDescription(`❌ *Steam Profile Error: ${data.error}*`)
              .setColor('#E85D5D')
          ]
        });
      }

      const statusDot = data.onlineState === 'online' ? '🟢' : (data.onlineState === 'in-game' ? '🎮' : '⚫');
      const statusColor = data.onlineState === 'online' ? '#57cbde' : (data.onlineState === 'in-game' ? '#97cfa6' : '#95a5a6');
      
      const embed = new EmbedBuilder()
        .setTitle(`${statusDot} Steam Profile: ${data.username || 'SC'}`)
        .setColor(statusColor)
        .setThumbnail(data.avatarFull || '')
        .addFields([
          { name: 'Status', value: data.stateMessage || data.onlineState || 'offline', inline: true },
          { name: 'Recent Playtime (2 wks)', value: data.hoursPlayed2Wk ? `${data.hoursPlayed2Wk}h` : '0h', inline: true },
          { name: 'Member Since', value: data.memberSince ? data.memberSince.split(',')[0].trim() : '—', inline: true }
        ]);

      if (data.topGame) {
        embed.addFields({ name: 'Top Played Game', value: `🎮 **${data.topGame}** (${data.topGameHours || 0} hrs)`, inline: false });
        
        // Dynamically wrap/pad the game name for a perfectly aligned ASCII Game Hint Box
        const gameName = data.topGame.length > 20 ? data.topGame.substring(0, 17) + '...' : data.topGame;
        const paddedGame = gameName.padEnd(20);
        
        const hintBox = 
          `\`\`\`\n` +
          `┌────────────────────────────────┐\n` +
          `│  ★ play this!                  │\n` +
          `│  └─▶  ${paddedGame}     │\n` +
          `└────────────────────────────────┘\n` +
          `\`\`\``;

        embed.addFields({ name: '💡 Game Hint', value: hintBox, inline: false });
      }

      message.channel.send({ embeds: [embed] });

    } catch (err) {
      sendError(message, {
        title: 'Failed to fetch Steam profile',
        description: 'An error occurred while fetching the Steam profile stats.',
        command: 'steam',
        error: err
      });
    }
  }
};
