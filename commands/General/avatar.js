const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const fs = require('fs');
const e = require('../../utils/emojis');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('avatar')
    .setDescription('Display high-resolution avatar and profile picture of a user.')
    .addUserOption(opt =>
      opt.setName('user')
        .setDescription('The user whose avatar you want to view (defaults to yourself)')
        .setRequired(false)
    ),
  name: 'avatar',
  aliases: ['pfp', 'av', 'useravatar', 'icon'],
  description: 'Display high-resolution avatar and banner of a user.',
  usage: '[@user / userId]',
  run: async (client, message, args) => {
    let config = {};
    try {
      config = JSON.parse(fs.readFileSync('./config.json', 'utf8'));
    } catch {
      config = require('../../config.json');
    }

    const interaction = (message.interaction && message.interaction.options) ? message.interaction : (message.options ? message : null);
    const isSlash = !!interaction;

    let targetUser = null;
    let targetMember = null;

    if (interaction && interaction.options) {
      targetUser = interaction.options.getUser('user') || message.author;
    } else {
      if (args && args[0]) {
        const match = args[0].match(/\d{17,20}/);
        const userId = match ? match[0] : args[0];
        targetUser = await client.users.fetch(userId).catch(() => null);
        if (!targetUser) {
          return message.reply(`${e.BlurpleCross || '<:BlurpleXCross:830844721789927434>'} Could not find a user with that ID or mention.`);
        }
      } else {
        targetUser = message.author;
      }
    }

    // Try fetching member and full user for banner
    if (message.guild) {
      targetMember = await message.guild.members.fetch(targetUser.id).catch(() => null);
    }
    const fullUser = await client.users.fetch(targetUser.id, { force: true }).catch(() => targetUser);

    const isAnimated = targetUser.avatar && targetUser.avatar.startsWith('a_');
    const avatarPng = targetUser.displayAvatarURL({ extension: 'png', size: 2048 });
    const avatarJpg = targetUser.displayAvatarURL({ extension: 'jpg', size: 2048 });
    const avatarWebp = targetUser.displayAvatarURL({ extension: 'webp', size: 2048 });
    const avatarGif = isAnimated ? targetUser.displayAvatarURL({ extension: 'gif', size: 2048 }) : null;

    let links = `[PNG](${avatarPng}) • [JPG](${avatarJpg}) • [WEBP](${avatarWebp})`;
    if (avatarGif) {
      links += ` • [GIF](${avatarGif})`;
    }

    // Check for server-specific avatar
    let serverAvatarUrl = null;
    if (targetMember && targetMember.avatar) {
      serverAvatarUrl = targetMember.avatarURL({ size: 2048, forceStatic: false });
      links += ` • [Server Avatar](${serverAvatarUrl})`;
    }

    // Check for banner
    const bannerUrl = fullUser.bannerURL({ size: 2048, forceStatic: false });
    if (bannerUrl) {
      links += ` • [Banner](${bannerUrl})`;
    }

    const embedColor = targetMember?.displayHexColor && targetMember.displayHexColor !== '#000000'
      ? targetMember.displayHexColor
      : (config.color || '#0059ff');

    const embed = new EmbedBuilder()
      .setColor(embedColor)
      .setTitle(`${targetUser.tag}'s Avatar`)
      .setDescription(`**Download Links:**\n${links}`)
      .setImage(targetUser.displayAvatarURL({ size: 1024, forceStatic: false }))
      .setFooter({
        text: `Requested by ${message.author.tag || message.author.username} | ID: ${targetUser.id}`,
        iconURL: message.author.displayAvatarURL({ forceStatic: false })
      })
      .setTimestamp();

    if (bannerUrl) {
      embed.setThumbnail(bannerUrl);
    }

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setLabel('Open Avatar')
        .setStyle(ButtonStyle.Link)
        .setURL(targetUser.displayAvatarURL({ size: 2048, forceStatic: false }))
    );

    if (bannerUrl) {
      row.addComponents(
        new ButtonBuilder()
          .setLabel('Open Banner')
          .setStyle(ButtonStyle.Link)
          .setURL(bannerUrl)
      );
    }

    if (isSlash) {
      await message.reply({ embeds: [embed], components: [row] });
    } else {
      await message.channel.send({ embeds: [embed], components: [row] });
    }
  }
};
