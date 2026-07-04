const { EmbedBuilder , SlashCommandBuilder } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('partnerannounce')
    .setDescription('No description provided')
    .addStringOption(opt => opt.setName('url').setDescription('Invite URL').setRequired(true))
    .addStringOption(opt => opt.setName('thumbnail').setDescription('Thumbnail URL').setRequired(true))
    .addStringOption(opt => opt.setName('description').setDescription('Server Description').setRequired(true)),
  name: 'partnerannounce',
  usage: 'url thumbnail description',
  description: '[Owner Only] Announce a new server partnership with an embed and URL.',
  run: async (client, message, args) => {
    if (message.author.id !== '594504468931018752') return message.channel.send('<:SCSmartTechLogo:793665812493893652> Only Owner Of SC SmartTech Can Use This Command!!!');
    const embed = new EmbedBuilder()
      .setTitle('🤝 New Partner!!!')
      .setURL(args[0])
      .setThumbnail(args[1])
      .setDescription(args.slice(2).join(" "))
      .setFooter({ text: 'If You Also Want To Partner Then DM SC#0600' })
      .setColor('#0059FF')
    let msg = await message.channel.send({ embeds: [embed] });
    let msg2 = await message.channel.send(args[0]);
    msg.react('🤝')
    msg2.react('👍')
    await message.delete()
  }
}