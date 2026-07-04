const { EmbedBuilder , SlashCommandBuilder } = require('discord.js');
const { useQueue } = require('discord-player');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('nowplaying')
    .setDescription('Display the current playing song details.'),
  name: 'nowplaying',
  aliases: ['np'],
  description: 'Display the current playing song details.',
  run: async (client, message, args) => {
    const queue = useQueue(message.guild.id);

    if (!queue || !queue.currentTrack) {
      return message.reply('❌ No music is currently playing in this server!');
    }

    const track = queue.currentTrack;
    // Create progress bar
    const progress = queue.node.createProgressBar();

    const embed = new EmbedBuilder()
      .setTitle('🎵 Now Playing')
      .setDescription(`[${track.title}](${track.url}) by **${track.author}**`)
      .setThumbnail(track.thumbnail)
      .addFields([
        { name: 'Duration', value: track.duration, inline: true },
        { name: 'Progress', value: progress || '0:00 / 0:00', inline: false }
      ])
      .setColor('#7C3AED')
      .setTimestamp();

    return message.channel.send({ embeds: [embed] });
  }
};
