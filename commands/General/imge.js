const imge = require('discord.js');

module.exports = {
  name: 'imge',
  description: 'Send an image URL wrapped inside a beautiful MessageEmbed, deleting the original message.',
  run: async (client, message, args) => {
    try {
      message.channel.send(new imge.MessageEmbed()
        .setImage(args[0])
        .setColor(client.color)
      );
      await message.delete()
    } catch (e) {
      console.log(String(e.stack).bgRed)
      return message.channel.send(new MessageEmbed()
        .setColor(color.no)
        .setTitle(`${color.cross} An error has occurred`)
        .setDescription(`\`\`\`${e.stack}\`\`\``)
      );
    }
  }
}