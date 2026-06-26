const Discord = require('discord.js');
const fetch = require('node-fetch');

module.exports = {
  name: 'steam',
  aliases: ['steamstats', 'steamprofile'],
  description: 'View Steam profile statistics and activity for SC.',
  run: async (client, message, args) => {
    try {
      message.channel.startTyping();

      const STEAM_FN = 'https://vixnfmutdbaprqflgzpr.supabase.co/functions/v1/steam-profile';
      const res = await fetch(STEAM_FN);
      
      if (!res.ok) {
        message.channel.stopTyping();
        return message.channel.send(
          new Discord.MessageEmbed()
            .setDescription('❌ *Failed to fetch Steam profile statistics.*')
            .setColor('#E85D5D')
        );
      }

      const data = await res.json();
      message.channel.stopTyping();

      if (data.error) {
        return message.channel.send(
          new Discord.MessageEmbed()
            .setDescription(`❌ *Steam Profile Error: ${data.error}*`)
            .setColor('#E85D5D')
        );
      }

      const statusDot = data.onlineState === 'online' ? '🟢' : (data.onlineState === 'in-game' ? '🎮' : '⚫');
      const statusColor = data.onlineState === 'online' ? '#57cbde' : (data.onlineState === 'in-game' ? '#97cfa6' : '#95a5a6');
      
      const embed = new Discord.MessageEmbed()
        .setTitle(`${statusDot} Steam Profile: ${data.username || 'SC'}`)
        .setColor(statusColor)
        .setThumbnail(data.avatarFull || '')
        .addField('Status', data.stateMessage || data.onlineState || 'offline', true)
        .addField('Recent Playtime (2 wks)', data.hoursPlayed2Wk ? `${data.hoursPlayed2Wk}h` : '0h', true)
        .addField('Member Since', data.memberSince ? data.memberSince.split(',')[0].trim() : '—', true);

      if (data.topGame) {
        embed.addField('Top Played Game', `🎮 **${data.topGame}** (${data.topGameHours || 0} hrs)`, false);
        
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

        embed.addField('💡 Game Hint', hintBox, false);
      }

      message.channel.send(embed);

    } catch (err) {
      console.error('Error in steam command:', err);
      message.channel.stopTyping();
      message.channel.send('❌ *An error occurred while fetching the Steam profile!*');
    }
  }
};
