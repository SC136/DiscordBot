const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits } = require('discord.js');
const fs = require('fs');
const e = require('../../utils/emojis');

function parseDurationSeconds(str) {
  if (!str) return null;
  str = str.toLowerCase().trim();
  if (['0', 'off', 'disable', 'none', 'reset', '0s'].includes(str)) return 0;

  const match = str.match(/^(\d+)\s*(s|sec|seconds?|m|min|minutes?|h|hr|hours?)?$/i);
  if (!match) return null;

  const val = parseInt(match[1], 10);
  const unit = (match[2] || 's').toLowerCase();

  if (unit.startsWith('h')) return val * 3600;
  if (unit.startsWith('m')) return val * 60;
  return val;
}

function formatDuration(seconds) {
  if (seconds === 0) return 'Disabled';
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;

  const parts = [];
  if (h > 0) parts.push(`${h} hour${h > 1 ? 's' : ''}`);
  if (m > 0) parts.push(`${m} minute${m > 1 ? 's' : ''}`);
  if (s > 0) parts.push(`${s} second${s > 1 ? 's' : ''}`);
  return parts.join(' ');
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName('slowmode')
    .setDescription('Set the slowmode message cooldown for the channel.')
    .addStringOption(opt =>
      opt.setName('time')
        .setDescription('Cooldown time (e.g. 5s, 30s, 1m, 1h, or 0/off to disable)')
        .setRequired(true)
    )
    .addStringOption(opt =>
      opt.setName('reason')
        .setDescription('Reason for slowmode update')
        .setRequired(false)
    ),
  name: 'slowmode',
  aliases: ['sm', 'slow'],
  description: 'Set the slowmode message cooldown for the channel.',
  usage: '<time: 0/5s/10s/1m/1h> [reason]',
  run: async (client, message, args) => {
    let config = {};
    try {
      config = JSON.parse(fs.readFileSync('./config.json', 'utf8'));
    } catch {
      config = require('../../config.json');
    }

    const ownerId = client.owner || config.owner || '594504468931018752';
    const authorId = message.author ? message.author.id : (message.user ? message.user.id : null);
    const isOwner = Array.isArray(ownerId) ? ownerId.includes(authorId) : authorId === ownerId;

    if (!isOwner && !message.member?.permissions.has(PermissionFlagsBits.ManageChannels)) {
      return message.reply(`${e.BlurpleCross || '<:BlurpleXCross:830844721789927434>'} You need the **Manage Channels** permission to use this command.`);
    }

    if (!message.guild) {
      return message.reply(`${e.BlurpleCross || '<:BlurpleXCross:830844721789927434>'} This command can only be used in a server channel.`);
    }

    const botMember = message.guild.members.me || await message.guild.members.fetchMe().catch(() => null);
    if (!botMember || !message.channel.permissionsFor(botMember)?.has(PermissionFlagsBits.ManageChannels)) {
      return message.reply(`${e.BlurpleCross || '<:BlurpleXCross:830844721789927434>'} I need the **Manage Channels** permission to adjust slowmode.`);
    }

    const interaction = (message.interaction && message.interaction.options) ? message.interaction : (message.options ? message : null);
    const isSlash = !!interaction;

    let timeStr = null;
    let reason = 'No reason provided';

    if (interaction && interaction.options) {
      timeStr = interaction.options.getString('time');
      reason = interaction.options.getString('reason') || reason;
    } else {
      if (!args || args.length === 0) {
        const currentSlowmode = message.channel.rateLimitPerUser || 0;
        return message.reply(
          `${e.Info || '<:DiscordInfo:870511644709650472>'} Current channel slowmode: **${formatDuration(currentSlowmode)}**\n` +
          `**Usage:** \`${config.prefix || '.'}slowmode <time: 0/5s/10s/1m/1h> [reason]\``
        );
      }
      timeStr = args[0];
      if (args.slice(1).length > 0) {
        reason = args.slice(1).join(' ');
      }
    }

    const seconds = parseDurationSeconds(timeStr);
    if (seconds === null || isNaN(seconds)) {
      return message.reply(`${e.BlurpleCross || '<:BlurpleXCross:830844721789927434>'} Invalid time format. Examples: \`5s\`, \`30s\`, \`2m\`, \`1h\`, or \`0\`/\`off\` to disable.`);
    }

    if (seconds < 0 || seconds > 21600) {
      return message.reply(`${e.BlurpleCross || '<:BlurpleXCross:830844721789927434>'} Slowmode duration must be between **0 seconds** and **6 hours** (21600s).`);
    }

    try {
      await message.channel.setRateLimitPerUser(seconds, `${reason} (by ${message.author.tag || message.author.username})`);

      const embed = new EmbedBuilder()
        .setColor(config.color || '#0059ff')
        .setTitle(`⏳ Slowmode Updated`)
        .setDescription(
          seconds === 0
            ? `Slowmode has been **disabled** for <#${message.channel.id}>.`
            : `Slowmode for <#${message.channel.id}> set to **${formatDuration(seconds)}**.`
        )
        .addFields([
          { name: 'Channel', value: `<#${message.channel.id}>`, inline: true },
          { name: 'Duration', value: `\`${formatDuration(seconds)}\``, inline: true },
          { name: 'Moderator', value: `<@${authorId}>`, inline: true }
        ])
        .setFooter({ text: `Reason: ${reason}` })
        .setTimestamp();

      if (isSlash) {
        await message.reply({ embeds: [embed] });
      } else {
        await message.channel.send({ embeds: [embed] });
      }
    } catch (err) {
      console.error('[slowmode] Error setting rateLimitPerUser:', err);
      return message.reply(`${e.BlurpleCross || '<:BlurpleXCross:830844721789927434>'} Failed to update slowmode: \`${err.message}\``);
    }
  }
};
