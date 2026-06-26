const { MessageEmbed } = require('discord.js');

module.exports = {
  name: 'rr',
  description: '[Owner Only] Post a new self-roles reaction embed with standard emojis.',
  run: async (client, message, args) => {
    if (message.author.id !== '594504468931018752') return message.channel.send(':SCSmartTechLogo: Only Owner Of SC SmartTech Can Use This Command!!!');
    let rr = new MessageEmbed()
      .setTitle('<:SCSmartTechLogo:793665812493893652> Self Roles!!!')
      .setDescription('React To This Message To Get Roles!!!\nNote - If You Didn\'t Get The Role, Then DM <@594504468931018752>')
      .addField('AnnounceMent Ping - <:DiscordAnnouncement:822725051966160926>', 'Get Ping For Important AnnounceMents In <#739514869992390737> Channel')
      .addField('YouTube Ping - <:YouTubeLogo:809087886044561428>', 'Get Pinged For Important Things In <#756086408162312192> Channel!!!')
      .addField('Upload Ping - 🎞️', 'Get Pinged When SC SmartTech Uploads A New Video!!!')
      .addField('Twitch Ping - <:TwitchGlitchPurple:822728916358922280>', 'Get Pinged For Twitch Related Things In <#756086115017949217>')
      .addField('Partner Ping - 🤝', 'Get Pinged For New Partners In <#814394238108303370> Channel!!!')
      .addField('GiveAway Ping - 🎉', 'Get Pinged For GiveAways In <#710889135703064657> Channel!!!')
      .addField('Mentions/Pings Role - <:DiscordPing:822737333639315476>', 'Get Pinged For Everything Above + More!!!')
      .setFooter('To Get The Role React Below With The Corresponding Emoji Of The Role!!!')
      .setColor('#0059FF')
    const msg = await message.channel.send(rr)
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