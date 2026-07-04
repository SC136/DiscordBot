const { sendError } = require('../../utils/errorEmbed');

module.exports = {
  name: 'react',
  description: '[Owner Only] Force the bot to react to a specific message ID with an emoji.',
  run: async (client, message, args) => {
    if (message.author.id !== '594504468931018752') return message.channel.send('Only Owner Of SC SmartTech Can Use This Command!');
    if (!args[0]) return message.reply('Bruh Give A Message ID!');
    if (!args[1]) return message.reply('Bruh Give An Emoji to react with!');
    message.channel.messages.fetch(args[0])
      .then(m => {
        m.react(args[1])
      })
      .catch(err => {
        sendError(message, {
          title: 'Failed to react',
          description: `Failed to fetch message or apply reaction: ${err.message}`,
          command: 'react',
          error: err
        });
      });
    message.delete().catch(() => {});
  }
}