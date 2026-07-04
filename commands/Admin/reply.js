const { SlashCommandBuilder } = require('discord.js');
const { sendError } = require('../../utils/errorEmbed');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('reply')
    .setDescription('[Owner Only] Force the bot to reply to a specific message ID with text.'),
  name: 'reply',
  description: '[Owner Only] Force the bot to reply to a specific message ID with text.',
  run: async (client, message, args) => {
    if (message.author.id !== '594504468931018752') return message.channel.send('Only Owner Of SC SmartTech Can Use This Command!');
    if (!args[0]) return message.reply('Bruh Give A Message ID!');
    if (!args[1]) return message.reply('Bruh Give A Message Content to reply with!');
    message.channel.messages.fetch(args[0])
      .then(m => {
        m.reply(args.slice(1).join(" "))
      })
      .catch(err => {
        sendError(message, {
          title: 'Failed to reply',
          description: `Failed to fetch message or post reply: ${err.message}`,
          command: 'reply',
          error: err
        });
      });
    message.delete().catch(() => {});
  }
}