const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle , SlashCommandBuilder } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('rr')
    .setDescription('[Owner Only] Post a new self-roles button embed.'),
  name: 'rr',
  description: '[Owner Only] Post a new self-roles button embed.',
  run: async (client, message, args) => {
    if (message.author.id !== '594504468931018752') {
      return message.channel.send('Only Owner Of SC SmartTech Can Use This Command!!!');
    }

    const embed = new EmbedBuilder()
      .setTitle('<:SCSmartTechLogo:793665812493893652> Self Roles!!!')
      .setDescription('Click the buttons below to toggle your roles!\nNote - If you didn\'t get the role, then DM <@594504468931018752>')
      .addFields([
        { name: 'AnnounceMent Ping', value: 'Get Ping For Important AnnounceMents In <#739514869992390737> Channel' },
        { name: 'YouTube Ping', value: 'Get Pinged For Important Things In <#756086408162312192> Channel!!!' },
        { name: 'Upload Ping', value: 'Get Pinged When SC SmartTech Uploads A New Video!!!' },
        { name: 'Twitch Ping', value: 'Get Pinged For Twitch Related Things In <#756086115017949217>' },
        { name: 'Partner Ping', value: 'Get Pinged For New Partners In <#814394238108303370> Channel!!!' },
        { name: 'GiveAway Ping', value: 'Get Pinged For GiveAways In <#710889135703064657> Channel!!!' },
        { name: 'Mentions/Pings Role', value: 'Get Pinged For Everything Above + More!!!' }
      ])
      .setFooter({ text: 'Use the buttons below to toggle these roles on or off.' })
      .setColor('#0059FF')
      .setTimestamp();

    const row1 = new ActionRowBuilder()
      .addComponents(
        new ButtonBuilder()
          .setCustomId('role_announce')
          .setLabel('Announcement Ping')
          .setStyle(ButtonStyle.Primary)
          .setEmoji('822725051966160926'),
        new ButtonBuilder()
          .setCustomId('role_youtube')
          .setLabel('YouTube Ping')
          .setStyle(ButtonStyle.Primary)
          .setEmoji('809087886044561428'),
        new ButtonBuilder()
          .setCustomId('role_upload')
          .setLabel('Upload Ping')
          .setStyle(ButtonStyle.Primary)
          .setEmoji('🎞️'),
        new ButtonBuilder()
          .setCustomId('role_twitch')
          .setLabel('Twitch Ping')
          .setStyle(ButtonStyle.Primary)
          .setEmoji('822728916358922280')
      );

    const row2 = new ActionRowBuilder()
      .addComponents(
        new ButtonBuilder()
          .setCustomId('role_partner')
          .setLabel('Partner Ping')
          .setStyle(ButtonStyle.Primary)
          .setEmoji('🤝'),
        new ButtonBuilder()
          .setCustomId('role_giveaway')
          .setLabel('GiveAway Ping')
          .setStyle(ButtonStyle.Primary)
          .setEmoji('🎉'),
        new ButtonBuilder()
          .setCustomId('role_pings')
          .setLabel('Mentions/Pings')
          .setStyle(ButtonStyle.Primary)
          .setEmoji('822737333639315476')
      );

    await message.channel.send({ embeds: [embed], components: [row1, row2] });
    await message.delete().catch(() => {});
  }
};