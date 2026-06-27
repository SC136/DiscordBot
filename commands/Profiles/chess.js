const Discord = require('discord.js');
const fetch = require('node-fetch');

module.exports = {
  name: 'chess',
  aliases: ['chessstats', 'chessrating'],
  description: 'View Chess.com statistics, ratings, and records for a user.',
  run: async (client, message, args) => {
    const username = args.join(' ') || 'sc-136';

    try {
      message.channel.startTyping();

      const urlName = encodeURIComponent(username);

      // Fetch player profile first to verify existence and get avatar
      const profileRes = await fetch(`https://api.chess.com/pub/player/${urlName}`);
      
      if (profileRes.status === 404) {
        message.channel.stopTyping();
        return message.channel.send(
          new Discord.MessageEmbed()
            .setDescription(`❌ *Could not find Chess.com user **"${username}"**.*`)
            .setColor('#E85D5D')
        );
      }

      if (!profileRes.ok) {
        message.channel.stopTyping();
        return message.channel.send(
          new Discord.MessageEmbed()
            .setDescription(`❌ *Failed to fetch user profile from Chess.com.*`)
            .setColor('#E85D5D')
        );
      }

      const profile = await profileRes.json();

      // Fetch stats
      const statsRes = await fetch(`https://api.chess.com/pub/player/${urlName}/stats`);
      
      if (!statsRes.ok) {
        message.channel.stopTyping();
        return message.channel.send(
          new Discord.MessageEmbed()
            .setDescription(`❌ *Failed to fetch stats for user from Chess.com.*`)
            .setColor('#E85D5D')
        );
      }

      const data = await statsRes.json();
      message.channel.stopTyping();

      const bulletRating = data.chess_bullet?.last?.rating || '—';
      const blitzRating = data.chess_blitz?.last?.rating || '—';
      const rapidRating = data.chess_rapid?.last?.rating || '—';
      const tacticsRating = data.tactics?.highest?.rating || '—';

      // Build W/L/D record from all game types
      let w = 0, l = 0, d = 0;
      ['chess_bullet', 'chess_blitz', 'chess_rapid'].forEach(mode => {
        if (data[mode] && data[mode].record) {
          w += data[mode].record.win || 0;
          l += data[mode].record.loss || 0;
          d += data[mode].record.draw || 0;
        }
      });

      const totalGames = w + l + d;
      const recordStr = totalGames > 0 ? `${w}W / ${l}L / ${d}D` : '—';

      const embed = new Discord.MessageEmbed()
        .setTitle(`♟️ Chess.com Stats: ${profile.username}`)
        .setURL(profile.url || `https://www.chess.com/member/${profile.username}`)
        .setColor('#7FA650') // Chess.com Green
        .setThumbnail(profile.avatar || '')
        .addField('Bullet Rating', `\`${bulletRating}\``, true)
        .addField('Blitz Rating', `\`${blitzRating}\``, true)
        .addField('Rapid Rating', `\`${rapidRating}\``, true)
        .addField('Highest Tactics', `\`${tacticsRating}\``, true)
        .addField('W/L/D Record', `\`${recordStr}\``, true)
        .addField('Status', profile.status || 'Member', true)
        .setFooter('Chess.com Public API', 'https://www.chess.com/bundles/web/images/share/chess-logo-single.png')
        .setTimestamp();

      if (profile.name) {
        embed.setDescription(`**Real Name:** ${profile.name}`);
      }

      message.channel.send(embed);

    } catch (err) {
      console.error('Error in chess command:', err);
      message.channel.stopTyping();
      message.channel.send('❌ *An error occurred while fetching Chess.com stats!*');
    }
  }
};
