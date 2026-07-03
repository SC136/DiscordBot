const { EmbedBuilder } = require('discord.js')

module.exports = {
  name: 'youtube',
  aliases: ['channel', 'yt', 'youtubechannel', 'youtube-channel', 'youtube channel'],
  description: 'Get My YouTube Channel Link',
  run: async(client, message) => {
    const embed = new EmbedBuilder()
    .setTitle('<:SCSmartTechLogo:793665812493893652> SC SmartTech YouTube Channel')
    .setURL('https://www.youtube.com/c/SCSmartTech')
    .setThumbnail('https://media.discordapp.net/attachments/779005181760765985/795529445234573332/unknown.png')
    .setDescription('<:YouTubeLogo:809087886044561428> Subscribe SC SmartTech YouTube Channel!!!')
    .setImage('https://media.discordapp.net/attachments/779005181760765985/795528698451329054/unknown.png')
    .setFooter({ text: 'https://www.youtube.com/scsmarttech' })
    .setColor('#0059FF')

    message.channel.send({ embeds: [embed] })
  }
}