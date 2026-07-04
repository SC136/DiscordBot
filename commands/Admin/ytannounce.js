const { EmbedBuilder , SlashCommandBuilder } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('ytannounce')
    .setDescription('[Owner Only] Announce a new YouTube video with an embed and URL.'),
  name: 'ytannounce',
  aliases: ['yta'],
  description: '[Owner Only] Announce a new YouTube video with an embed and URL.',
  run: async (client, message, args) => {
    if (message.author.id !== '594504468931018752') return message.channel.send('<:SCSmartTechLogo:793665812493893652> Only Owner Of SC SmartTech Can Use This Command!!!');
    if (!args[0]) return message.reply('Bruh!!!')
    const embed = new EmbedBuilder()
      .setTitle('<:SCSmartTechLogo:793665812493893652> New Video!!!')
      .setURL(args[0])
      .setThumbnail('https://media.discordapp.net/attachments/779005181760765985/819493737402728448/yt_icon_rgb.png')
      .setDescription('👀 WATCH, 👍 LIKE & ❗ SHARE!')
      .setFooter({ text: 'https://www.youtube.com/scsmarttech' })
      .setColor('#0059FF')
    message.channel.send({ embeds: [embed] });
    message.channel.send(args[0]);
    await message.delete();
  }
}