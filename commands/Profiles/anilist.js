const { EmbedBuilder } = require('discord.js');
const fetch = require('node-fetch');
const { sendError } = require('../../utils/errorEmbed');

module.exports = {
  name: 'anilist',
  aliases: ['al'],
  description: 'View AniList statistics and currently watching anime for a user.',
  run: async (client, message, args) => {
    const username = args.join(' ') || 'SC136';

    try {
      message.channel.sendTyping().catch(() => {});

      const statsQuery = `query ($name: String) {
        User(name: $name) {
          name
          avatar { large }
          bannerImage
          statistics {
            anime { count episodesWatched minutesWatched meanScore }
          }
        }
      }`;

      const watchingQuery = `query ($name: String) {
        MediaListCollection(userName: $name, type: ANIME, status: CURRENT) {
          lists {
            entries {
              progress
              media { 
                title { romaji english } 
                coverImage { medium } 
              }
            }
          }
        }
      }`;

      const headers = { 'Content-Type': 'application/json', 'Accept': 'application/json' };

      // Fetch stats
      const statsRes = await fetch('https://graphql.anilist.co', {
        method: 'POST',
        headers: headers,
        body: JSON.stringify({ query: statsQuery, variables: { name: username } })
      });

      if (!statsRes.ok) {
        return message.channel.send({
          embeds: [
            new EmbedBuilder()
              .setDescription(`❌ *Could not find AniList user **"${username}"** or API error.*`)
              .setColor('#E85D5D')
          ]
        });
      }

      const statsData = await statsRes.json();
      const user = statsData?.data?.User;
      const stats = user?.statistics?.anime;

      if (!user || !stats) {
        return message.channel.send({
          embeds: [
            new EmbedBuilder()
              .setDescription(`❌ *Could not find AniList user **"${username}"**.*`)
              .setColor('#E85D5D')
          ]
        });
      }

      // Fetch currently watching
      const watchingRes = await fetch('https://graphql.anilist.co', {
        method: 'POST',
        headers: headers,
        body: JSON.stringify({ query: watchingQuery, variables: { name: username } })
      });

      let watchingList = 'Not currently watching any anime.';
      let thumbnail = user.avatar?.large || '';

      if (watchingRes.ok) {
        const watchingData = await watchingRes.json();
        const lists = watchingData?.data?.MediaListCollection?.lists;
        if (lists && lists.length > 0) {
          const entries = lists[0].entries || [];
          if (entries.length > 0) {
            watchingList = entries
              .slice(0, 6)
              .map(entry => {
                const title = entry.media.title.english || entry.media.title.romaji;
                return `• **${title}** (ep ${entry.progress})`;
              })
              .join('\n');

            // Use cover image of the first currently watching anime as thumbnail if available
            if (entries[0].media?.coverImage?.medium) {
              thumbnail = entries[0].media.coverImage.medium;
            }
          }
        }
      }

      const embed = new EmbedBuilder()
        .setTitle(`🌸 AniList Profile: ${user.name}`)
        .setURL(`https://anilist.co/user/${encodeURIComponent(user.name)}`)
        .setColor(client.color || '#E8C87A')
        .setThumbnail(thumbnail)
        .addFields([
          { name: 'Total Anime', value: stats.count.toString(), inline: true },
          { name: 'Episodes Watched', value: stats.episodesWatched.toLocaleString(), inline: true },
          { name: 'Hours Watched', value: Math.round(stats.minutesWatched / 60).toLocaleString(), inline: true },
          { name: 'Mean Score', value: stats.meanScore ? `${stats.meanScore.toFixed(1)}/10` : '—', inline: true },
          { name: 'Currently Watching', value: watchingList, inline: false }
        ])
        .setFooter({ text: 'AniList GraphQL API', iconURL: user.avatar?.large || '' })
        .setTimestamp();

      if (user.bannerImage) {
        embed.setImage(user.bannerImage);
      }

      message.channel.send({ embeds: [embed] });

    } catch (err) {
      sendError(message, {
        title: 'Failed to fetch AniList stats',
        description: 'An error occurred while fetching AniList statistics. Check the username or try again later.',
        command: 'anilist',
        error: err
      });
    }
  }
};
