const Discord = require('discord.js');
const fetch = require('node-fetch');

module.exports = {
  name: 'anilist',
  aliases: ['al'],
  description: 'View AniList statistics and currently watching anime for a user.',
  run: async (client, message, args) => {
    const username = args.join(' ') || 'SC136';

    try {
      message.channel.startTyping();

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
        message.channel.stopTyping();
        return message.channel.send(
          new Discord.MessageEmbed()
            .setDescription(`❌ *Could not find AniList user **"${username}"** or API error.*`)
            .setColor('#E85D5D')
        );
      }

      const statsData = await statsRes.json();
      const user = statsData?.data?.User;
      const stats = user?.statistics?.anime;

      if (!user || !stats) {
        message.channel.stopTyping();
        return message.channel.send(
          new Discord.MessageEmbed()
            .setDescription(`❌ *Could not find AniList user **"${username}"**.*`)
            .setColor('#E85D5D')
        );
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

      message.channel.stopTyping();

      const embed = new Discord.MessageEmbed()
        .setTitle(`🌸 AniList Profile: ${user.name}`)
        .setURL(`https://anilist.co/user/${encodeURIComponent(user.name)}`)
        .setColor(client.color || '#E8C87A')
        .setThumbnail(thumbnail)
        .addField('Total Anime', stats.count.toString(), true)
        .addField('Episodes Watched', stats.episodesWatched.toLocaleString(), true)
        .addField('Hours Watched', Math.round(stats.minutesWatched / 60).toLocaleString(), true)
        .addField('Mean Score', stats.meanScore ? `${stats.meanScore.toFixed(1)}/10` : '—', true)
        .addField('Currently Watching', watchingList, false)
        .setFooter('AniList GraphQL API', user.avatar?.large || '')
        .setTimestamp();

      if (user.bannerImage) {
        embed.setImage(user.bannerImage);
      }

      message.channel.send(embed);

    } catch (err) {
      console.error('Error in anilist command:', err);
      message.channel.stopTyping();
      message.channel.send('❌ *An error occurred while fetching the AniList stats!*');
    }
  }
};
