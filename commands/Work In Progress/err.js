const { MessageEmbed } = require('discord.js')

module.exports = {
  name: 'err',
  description: '[Owner Only] Edit and update the self-roles reaction embed.',
  run: async (client, message, args) => {

    if (message.author.id !== '594504468931018752') return message.channel.send(':SCSmartTechLogo: Only Owner Of SC SmartTech Can Use This Command!!!');

    let embed = new MessageEmbed()
      .setTitle('<:SCSmartTechLogo:793665812493893652> Self Roles!')
      .setDescription('React To This Message To Get Roles!\n**Note** - If You Didn\'t Get The Role, Then DM <@594504468931018752>')
      .addField('AnnounceMent Ping - <:DiscordAnnouncement:822725051966160926>', 'Get Pinged For Important AnnounceMents In <#739514869992390737> Channel!')
      .addField('YouTube Ping - <:YouTubeLogo:809087886044561428>', 'Get Pinged For Important Things In <#756086408162312192> Channel!')
      .addField('Upload Ping - 🎞️', 'Get Pinged When SC SmartTech Uploads A New Video!')
      .addField('Twitch Ping - <:TwitchGlitchPurple:822728916358922280>', 'Get Pinged For Twitch Related Things In <#756086115017949217>')
      .addField('Partner Ping - 🤝', 'Get Pinged For New Partners In <#814394238108303370> Channel!')
      .addField('GiveAway Ping - 🎉', 'Get Pinged For GiveAways In <#710889135703064657> Channel!')
      .addField('Mentions/Pings Role - <:DiscordPing:822737333639315476>', 'Get Pinged For Everything Above + More!')
      .addField('Discord Updates - 📡', 'Get Pinged In <#734031780650418258> For Any New Discord Updates!')
      .addField('Polls Ping - 📊', 'Get Pinged In <#874354989580058704> For Any New Polls!')
      .setFooter('To Get The Role React Below With The Corresponding Emoji Of The Role!')
      .setColor('#0059FF')

    const editThis = message.channel.messages.fetch("827492861455892500")
      .then(m => {
        m.edit(embed)
        m.react('📊')
      })

  }
}