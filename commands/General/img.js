const { EmbedBuilder } = require('discord.js');

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
      console.log(String(e.stack));
      return message.channel.send({
        embeds: [
          new EmbedBuilder()
            .setColor('#EF4444')
            .setTitle(`❌ An error has occurred`)
            .setDescription(`\`\`\`${e.stack.slice(0, 2000)}\`\`\``)
        ]
      });
    }
  }
}