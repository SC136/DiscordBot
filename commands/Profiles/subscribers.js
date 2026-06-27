const Discord = require('discord.js')
const getYoutubeSubscriber = require('getyoutubesubscriber')

module.exports = {
  name: 'subscribers',
  aliases: ['subs', 'total-subs'],
  description: 'Shows You The Subscriber Count Of SC SmartTech!!!',
  run: async (client, message, args) => {
    getYoutubeSubscriber('UCTJRWkSYAMI7S6YgsQyj-qQ').then((data) => {
      const embed = new Discord.MessageEmbed()
      .setTitle(`<:SCSmartTechLogo:793665812493893652> SC SmartTech Have '${data}'\nSubscribers On Youtube!!!`)
      .setThumbnail('https://media.discordapp.net/attachments/779005181760765985/782878022332055559/SC_SmartTech_Logo.png?width=586&height=586')
      .setDescription('<:YouTubeLogo:728542821379735634> [Subscribe Here!!!](https://www.youtube.com/SCSmartTech)')
      .setFooter('SC SmartTech')
      .setColor('#0059FF')
      .setTimestamp()
      message.channel.send(embed)
    })
  }
}