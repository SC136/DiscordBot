const { useQueue } = require('discord-player');

module.exports = {
  name: 'stop',
  aliases: ['leave', 'disconnect'],
  description: 'Stop the music player, clear the queue, and leave the voice channel.',
  run: async (client, message, args) => {
    const queue = useQueue(message.guild.id);

    if (!queue) {
      return message.reply('❌ No music is currently active in this server!');
    }

    queue.delete();
    return message.reply('🛑 Stopped playing and left the voice channel.');
  }
};
