const discord = require('discord.js');

module.exports = {
  name: 'onlinemembers',
  aliases: ['om'],
  description: 'View the count of members currently online in the server.',
  run: async (client, message, args) => {
    message.channel.send(
      new discord.MessageEmbed()
        .setTitle('Total Online Members :')
        .setDescription(message.guild.members.cache.filter(member => member.presence.status !== "offline").size)
        .setColor(client.color)
    )
  }
}