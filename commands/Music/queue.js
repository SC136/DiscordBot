const { EmbedBuilder } = require('discord.js');
const { useQueue } = require('discord-player');
const { paginate } = require('../../utils/paginate');

module.exports = {
  name: 'queue',
  aliases: ['q'],
  description: 'View the music queue with pagination.',
  run: async (client, message, args) => {
    const queue = useQueue(message.guild.id);

    if (!queue || !queue.currentTrack) {
      return message.reply('❌ No music is currently playing in this server!');
    }

    const currentTrack = queue.currentTrack;
    const tracks = queue.tracks.toArray();

    if (tracks.length === 0) {
      const embed = new EmbedBuilder()
        .setTitle(`🎵 Music Queue — ${message.guild.name}`)
        .setDescription(`**Now Playing:**\n[${currentTrack.title}](${currentTrack.url}) by **${currentTrack.author}**\n\n*The queue is empty.*`)
        .setColor('#7C3AED')
        .setTimestamp();
      return message.channel.send({ embeds: [embed] });
    }

    // Chunk tracks into pages of 10
    const chunkSize = 10;
    const pages = [];

    for (let i = 0; i < tracks.length; i += chunkSize) {
      const chunk = tracks.slice(i, i + chunkSize);
      
      const trackList = chunk.map((track, index) => {
        const overallIndex = i + index + 1;
        return `\`${overallIndex}.\` [${track.title}](${track.url}) by **${track.author}**`;
      }).join('\n');

      const embed = new EmbedBuilder()
        .setTitle(`🎵 Music Queue — ${message.guild.name}`)
        .setDescription(
          `**Now Playing:**\n[${currentTrack.title}](${currentTrack.url}) by **${currentTrack.author}**\n\n` +
          `**Up Next:**\n${trackList}`
        )
        .setColor('#7C3AED')
        .setTimestamp()
        .setFooter({ text: `Page ${pages.length + 1} | Total Tracks: ${tracks.length}` });

      pages.push(embed);
    }

    await paginate(message, pages, { timeout: 60000 });
  }
};
