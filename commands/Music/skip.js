const { SlashCommandBuilder } = require('discord.js');
const { useQueue } = require('discord-player');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('skip')
    .setDescription('Skip the current playing track.'),
  name: 'skip',
  aliases: ['s'],
  description: 'Skip the current playing track.',
  run: async (client, message, args) => {
    const queue = useQueue(message.guild.id);

    if (!queue || !queue.isPlaying()) {
      return message.reply('❌ No music is currently playing in this server!');
    }

    const currentTrack = queue.currentTrack;
    queue.node.skip();
    return message.reply(`⏭️ Skipped **${currentTrack.title}**.`);
  }
};
