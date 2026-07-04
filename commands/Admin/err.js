const { EmbedBuilder , SlashCommandBuilder } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('err')
    .setDescription('[Owner Only] Edit and update the self-roles reaction embed.'),
  name: 'err',
  description: '[Owner Only] Edit and update the self-roles reaction embed.',
  run: async (client, message, args) => {

    if (message.author.id !== '594504468931018752') return message.channel.send(':SCSmartTechLogo: Only Owner Of SC SmartTech Can Use This Command!!!');

    let embed = new EmbedBuilder()
      .setTitle('<:SCSmartTechLogo:793665812493893652> Self Roles!')
      .setDescription('React To This Message To Get Roles!\n**Note** - If You Didn\'t Get The Role, Then DM <@594504468931018752>')
      .addFields([
        { name: 'AnnounceMent Ping - <:DiscordAnnouncement:822725051966160926>', value: 'Get Pinged For Important AnnounceMents In <#739514869992390737> Channel!' },
        { name: 'YouTube Ping - <:YouTubeLogo:809087886044561428>', value: 'Get Pinged For Important Things In <#756086408162312192> Channel!' },
        { name: 'Upload Ping - 🎞️', value: 'Get Pinged When SC SmartTech Uploads A New Video!' },
        { name: 'Twitch Ping - <:TwitchGlitchPurple:822728916358922280>', value: 'Get Pinged For Twitch Related Things In <#756086115017949217>' },
        { name: 'Partner Ping - 🤝', value: 'Get Pinged For New Partners In <#814394238108303370> Channel!' },
        { name: 'GiveAway Ping - 🎉', value: 'Get Pinged For GiveAways In <#710889135703064657> Channel!' },
        { name: 'Mentions/Pings Role - <:DiscordPing:822737333639315476>', value: 'Get Pinged For Everything Above + More!' },
        { name: 'Discord Updates - 📡', value: 'Get Pinged In <#734031780650418258> For Any New Discord Updates!' },
        { name: 'Polls Ping - 📊', value: 'Get Pinged In <#874354989580058704> For Any New Polls!' }
      ])
      .setFooter({ text: 'To Get The Role React Below With The Corresponding Emoji Of The Role!' })
      .setColor('#0059FF')

    const editThis = message.channel.messages.fetch("827492861455892500")
      .then(m => {
        m.edit({ embeds: [embed] })
        m.react('📊')
      })

  }
}