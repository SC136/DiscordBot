module.exports = {
  name: 'img',
  description: 'Send a message or image URL via the bot, deleting the original message.',
  run: async (client, message, args) => {
    try {
      message.channel.send(args[0])
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