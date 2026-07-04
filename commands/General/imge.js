const { EmbedBuilder , SlashCommandBuilder } = require('discord.js');
const { sendError } = require('../../utils/errorEmbed');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('imge')
    .setDescription('Send an image URL wrapped inside a beautiful MessageEmbed, deleting the original message.'),
  name: 'imge',
  description: 'Send an image URL wrapped inside a beautiful MessageEmbed, deleting the original message.',
  run: async (client, message, args) => {
    try {
      if (!args[0]) return message.reply("Please specify an image URL!");
      const embed = new EmbedBuilder()
        .setImage(args[0])
        .setColor(client.color);
      message.channel.send({ embeds: [embed] });
      await message.delete();
    } catch (e) {
      sendError(message, {
        title: 'Failed to send embed image',
        description: 'Could not process the embed image command. Make sure the bot has permission to manage messages.',
        command: 'imge',
        error: e
      });
    }
  }
}