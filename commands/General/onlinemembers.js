const { EmbedBuilder } = require('discord.js');

module.exports = {
  name: 'onlinemembers',
  aliases: ['om'],
  description: 'View the count of members currently online in the server.',
  run: async (client, message, args) => {
    const onlineCount = message.guild.members.cache.filter(member => member.presence && member.presence.status !== "offline").size;
    const embed = new EmbedBuilder()
      .setTitle('Total Online Members :')
      .setDescription(String(onlineCount))
      .setColor(client.color);
    message.channel.send({ embeds: [embed] });
  }
}