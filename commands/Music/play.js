const { EmbedBuilder } = require('discord.js');
const { useMainPlayer } = require('discord-player');

module.exports = {
  name: 'play',
  aliases: ['p'],
  description: 'Play a song or playlist in your voice channel.',
  usage: '<song name or url>',
  run: async (client, message, args) => {
    const player = useMainPlayer();
    const voiceChannel = message.member.voice.channel;

    if (!voiceChannel) {
      return message.reply('❌ You need to be in a voice channel to play music!');
    }

    if (!args[0]) {
      return message.reply('❌ Please specify a song name or URL to play!');
    }

    const query = args.join(' ');

    // Check permissions
    const permissions = voiceChannel.permissionsFor(message.client.user);
    if (!permissions.has('Connect') || !permissions.has('Speak')) {
      return message.reply('❌ I do not have permission to connect or speak in your voice channel!');
    }

    const reply = await message.reply(`🔍 Searching for **${query}**...`);

    try {
      const { track } = await player.play(voiceChannel, query, {
        nodeOptions: {
          metadata: {
            channel: message.channel,
            client: message.client,
            requestedBy: message.author
          },
          selfDeaf: true,
          disableVolume: true,
          disableBiquad: true,
          leaveOnEnd: true,
          leaveOnEmpty: true,
          leaveOnEmptyCooldown: 30000
        }
      });

      const embed = new EmbedBuilder()
        .setTitle('🎵 Track Queued')
        .setDescription(`[${track.title}](${track.url}) by **${track.author}** has been added to the queue!`)
        .setThumbnail(track.thumbnail)
        .addFields([
          { name: 'Duration', value: track.duration, inline: true },
          { name: 'Requested By', value: message.author.toString(), inline: true }
        ])
        .setColor('#10B981')
        .setTimestamp();

      await reply.edit({ content: null, embeds: [embed] });
    } catch (e) {
      console.error(e);
      const errorMessage = e.message ? e.message.substring(0, 1000) : "Unknown error";
      await reply.edit(`❌ Could not find/play that track! Error: ${errorMessage}`);
    }
  }
};
