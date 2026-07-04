const { sendError } = require('../../utils/errorEmbed');

module.exports = {
  name: 'img',
  description: 'Send a message or image URL via the bot, deleting the original message.',
  run: async (client, message, args) => {
    try {
      if (args[0]) {
        message.channel.send(args[0]);
      }
      await message.delete();
    } catch (e) {
      sendError(message, {
        title: 'Failed to send image',
        description: 'Could not process the image command. Make sure the bot has permission to manage messages.',
        command: 'img',
        error: e
      });
    }
  }
}