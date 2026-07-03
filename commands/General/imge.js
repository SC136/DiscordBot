const { EmbedBuilder } = require('discord.js');

module.exports = {
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