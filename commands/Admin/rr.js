const { EmbedBuilder } = require('discord.js');

module.exports = {
  name: 'rr',
  description: '[Owner Only] Post a new self-roles reaction embed with standard emojis.',
  run: async (client, message, args) => {
    if (message.author.id !== '594504468931018752') return message.channel.send(':SCSmartTechLogo: Only Owner Of SC SmartTech Can Use This Command!!!');
    let rr = new EmbedBuilder()
      .setTitle('<:SCSmartTechLogo:793665812493893652> Self Roles!!!')
      .setDescription('React To This Message To Get Roles!!!\nNote - If You Didn\'t Get The Role, Then DM <@594504468931018752>')
      .addFields([
        { name: 'AnnounceMent Ping - <:DiscordAnnouncement:822725051966160926>', value: 'Get Ping For Important AnnounceMents In <#739514869992390737> Channel' },
        { name: 'YouTube Ping - <:YouTubeLogo:809087886044561428>', value: 'Get Pinged For Important Things In <#756086408162312192> Channel!!!' },
        { name: 'Upload Ping - 🎞️', value: 'Get Pinged When SC SmartTech Uploads A New Video!!!' },
        { name: 'Twitch Ping - <:TwitchGlitchPurple:822728916358922280>', value: 'Get Pinged For Twitch Related Things In <#756086115017949217>' },
        { name: 'Partner Ping - 🤝', value: 'Get Pinged For New Partners In <#814394238108303370> Channel!!!' },
        { name: 'GiveAway Ping - 🎉', value: 'Get Pinged For GiveAways In <#710889135703064657> Channel!!!' },
        { name: 'Mentions/Pings Role - <:DiscordPing:822737333639315476>', value: 'Get Pinged For Everything Above + More!!!' }
      ])
      .setFooter({ text: 'To Get The Role React Below With The Corresponding Emoji Of The Role!!!' })
      .setColor('#0059FF')
    const msg = await message.channel.send({ embeds: [rr] })
    await msg.react('<:DiscordAnnouncement:822725051966160926>')
    await msg.react('<:YouTubeLogo:809087886044561428>')
    await msg.react('🎞️')
    await msg.react('<:TwitchGlitchPurple:822728916358922280>')
    await msg.react('🤝')
    await msg.react('🎉')
    await msg.react('<:DiscordPing:822737333639315476>')
    await message.delete()
  }
}