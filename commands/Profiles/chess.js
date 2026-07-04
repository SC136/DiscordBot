const { EmbedBuilder , SlashCommandBuilder } = require('discord.js');
const { sendError } = require('../../utils/errorEmbed');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('chess')
    .setDescription('View Chess.com statistics, ratings, and records for a user.'),
  name: 'chess',
  aliases: ['chessstats', 'chessrating'],
  description: 'View Chess.com statistics, ratings, and records for a user.',
  run: async (client, message, args) => {
    const username = args.join(' ') || 'sc-136';

    try {
      message.channel.sendTyping().catch(() => {});

      const urlName = encodeURIComponent(username);

      // Fetch player profile first to verify existence and get avatar
      const profileRes = await fetch(`https://api.chess.com/pub/player/${urlName}`);
      
      if (profileRes.status === 404) {
        return message.channel.send({
          embeds: [
            new EmbedBuilder()
              .setDescription(`❌ *Could not find Chess.com user **"${username}"**.*`)
              .setColor('#E85D5D')
          ]
        });
      }

      if (!profileRes.ok) {
        return message.channel.send({
          embeds: [
            new EmbedBuilder()
              .setDescription(`❌ *Failed to fetch user profile from Chess.com.*`)
              .setColor('#E85D5D')
          ]
        });
      }

      const profile = await profileRes.json();

      // Fetch stats
      const statsRes = await fetch(`https://api.chess.com/pub/player/${urlName}/stats`);
      
      if (!statsRes.ok) {
        return message.channel.send({
          embeds: [
            new EmbedBuilder()
              .setDescription(`❌ *Failed to fetch stats for user from Chess.com.*`)
              .setColor('#E85D5D')
          ]
        });
      }

      const data = await statsRes.json();

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

      const embed = new EmbedBuilder()
        .setTitle(`♟️ Chess.com Stats: ${profile.username}`)
        .setURL(profile.url || `https://www.chess.com/member/${profile.username}`)
        .setColor('#7FA650') // Chess.com Green
        .setThumbnail(profile.avatar || '')
        .addFields([
          { name: 'Bullet Rating', value: `\`${bulletRating}\``, inline: true },
          { name: 'Blitz Rating', value: `\`${blitzRating}\``, inline: true },
          { name: 'Rapid Rating', value: `\`${rapidRating}\``, inline: true },
          { name: 'Highest Tactics', value: `\`${tacticsRating}\``, inline: true },
          { name: 'W/L/D Record', value: `\`${recordStr}\``, inline: true },
          { name: 'Status', value: profile.status || 'Member', inline: true }
        ])
        .setFooter({ text: 'Chess.com Public API', iconURL: 'https://www.chess.com/bundles/web/images/share/chess-logo-single.png' })
        .setTimestamp();

      if (profile.name) {
        embed.setDescription(`**Real Name:** ${profile.name}`);
      }

      message.channel.send({ embeds: [embed] });

    } catch (err) {
      sendError(message, {
        title: 'Failed to fetch Chess.com stats',
        description: 'An error occurred while fetching Chess.com statistics. Check the username or try again later.',
        command: 'chess',
        error: err
      });
    }
  }
};
