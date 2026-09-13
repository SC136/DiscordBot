const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits } = require('discord.js');
const fs = require('fs');
const e = require('../../utils/emojis');

function parseTimeoutMs(str) {
  if (!str) return null;
  str = str.toLowerCase().trim();
  if (['0', 'remove', 'unmute', 'untimeout', 'off', 'none'].includes(str)) return 0;

  const match = str.match(/^(\d+)\s*(s|sec|seconds?|m|min|minutes?|h|hr|hours?|d|days?|w|weeks?)?$/i);
  if (!match) return null;

  const val = parseInt(match[1], 10);
  const unit = (match[2] || 'm').toLowerCase();

  if (unit.startsWith('w')) return val * 7 * 24 * 60 * 60 * 1000;
  if (unit.startsWith('d')) return val * 24 * 60 * 60 * 1000;
  if (unit.startsWith('h')) return val * 60 * 60 * 1000;
  if (unit.startsWith('m')) return val * 60 * 1000;
  if (unit.startsWith('s')) return val * 1000;
  return val * 60 * 1000; // default to minutes
}

function formatTimeoutDuration(ms) {
  if (ms === 0) return 'Removed (Untimeout)';
  const totalSec = Math.floor(ms / 1000);
  const d = Math.floor(totalSec / 86400);
  const h = Math.floor((totalSec % 86400) / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  const s = totalSec % 60;

  const parts = [];
  if (d > 0) parts.push(`${d} day${d > 1 ? 's' : ''}`);
  if (h > 0) parts.push(`${h} hour${h > 1 ? 's' : ''}`);
  if (m > 0) parts.push(`${m} minute${m > 1 ? 's' : ''}`);
  if (s > 0 && d === 0 && h === 0) parts.push(`${s} second${s > 1 ? 's' : ''}`);
  return parts.join(' ') || `${totalSec}s`;
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName('timeout')
    .setDescription('Timeout or mute a member in the server.')
    .addUserOption(opt =>
      opt.setName('user')
        .setDescription('The member to timeout')
        .setRequired(true)
    )
    .addStringOption(opt =>
      opt.setName('duration')
        .setDescription('Duration (e.g. 5m, 1h, 1d, 1w, or 0/remove to untimeout)')
        .setRequired(true)
    )
    .addStringOption(opt =>
      opt.setName('reason')
        .setDescription('Reason for the timeout')
        .setRequired(false)
    ),
  name: 'timeout',
  aliases: ['mute', 'to', 'tempmute', 'muteuser'],
  description: 'Timeout or mute a member in the server using Discord native timeout.',
  usage: '<@user> <duration: 5m/1h/1d or 0/remove> [reason]',
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

    if (!isOwner && !message.member?.permissions.has(PermissionFlagsBits.ModerateMembers)) {
      return message.reply(`${e.BlurpleCross || '<:BlurpleXCross:830844721789927434>'} You need the **Moderate Members** permission to use this command.`);
    }

    if (!message.guild) {
      return message.reply(`${e.BlurpleCross || '<:BlurpleXCross:830844721789927434>'} This command can only be used in a server channel.`);
    }

    const botMember = message.guild.members.me || await message.guild.members.fetchMe().catch(() => null);
    if (!botMember || !botMember.permissions.has(PermissionFlagsBits.ModerateMembers)) {
      return message.reply(`${e.BlurpleCross || '<:BlurpleXCross:830844721789927434>'} I need the **Moderate Members** permission to timeout members.`);
    }

    const interaction = (message.interaction && message.interaction.options) ? message.interaction : (message.options ? message : null);
    const isSlash = !!interaction;

    let targetUserId = null;
    let durationStr = null;
    let reason = 'No reason provided';

    if (interaction && interaction.options) {
      const userOpt = interaction.options.getUser('user');
      if (userOpt) targetUserId = userOpt.id;
      durationStr = interaction.options.getString('duration');
      reason = interaction.options.getString('reason') || reason;
    } else {
      if (!args || args.length < 2) {
        return message.reply(
          `${e.Info || '<:DiscordInfo:870511644709650472>'} **Usage:** \`${config.prefix || '.'}timeout <@user> <duration: 5m/1h/1d or 0/remove> [reason]\`\n` +
          `**Example:** \`${config.prefix || '.'}timeout @User 10m Spamming\` or \`${config.prefix || '.'}timeout @User 0 remove timeout\``
        );
      }

      // Check for user mention / ID in args[0] or args[1]
      const matchFirst = args[0].match(/\d{17,20}/);
      const matchSecond = args[1].match(/\d{17,20}/);

      if (matchFirst) {
        targetUserId = matchFirst[0];
        durationStr = args[1];
        if (args.slice(2).length > 0) reason = args.slice(2).join(' ');
      } else if (matchSecond) {
        targetUserId = matchSecond[0];
        durationStr = args[0];
        if (args.slice(2).length > 0) reason = args.slice(2).join(' ');
      } else {
        return message.reply(`${e.BlurpleCross || '<:BlurpleXCross:830844721789927434>'} Please mention a valid user or provide their ID.`);
      }
    }

    const targetMember = await message.guild.members.fetch(targetUserId).catch(() => null);
    if (!targetMember) {
      return message.reply(`${e.BlurpleCross || '<:BlurpleXCross:830844721789927434>'} That member was not found in this server.`);
    }

    if (targetMember.id === authorId) {
      return message.reply(`${e.BlurpleCross || '<:BlurpleXCross:830844721789927434>'} You cannot timeout yourself!`);
    }

    if (targetMember.id === client.user.id) {
      return message.reply(`${e.BlurpleCross || '<:BlurpleXCross:830844721789927434>'} I cannot timeout myself.`);
    }

    if (targetMember.id === message.guild.ownerId) {
      return message.reply(`${e.BlurpleCross || '<:BlurpleXCross:830844721789927434>'} You cannot timeout the server owner!`);
    }

    if (!isOwner && message.author.id !== message.guild.ownerId) {
      if (message.member.roles.highest.position <= targetMember.roles.highest.position) {
        return message.reply(`${e.BlurpleCross || '<:BlurpleXCross:830844721789927434>'} You cannot timeout this member because their role is higher than or equal to yours.`);
      }
    }

    if (!targetMember.moderatable) {
      return message.reply(`${e.BlurpleCross || '<:BlurpleXCross:830844721789927434>'} I cannot timeout this user. Their highest role may be above mine.`);
    }

    const durationMs = parseTimeoutMs(durationStr);
    if (durationMs === null || isNaN(durationMs)) {
      return message.reply(`${e.BlurpleCross || '<:BlurpleXCross:830844721789927434>'} Invalid duration format. Valid formats: \`60s\`, \`5m\`, \`1h\`, \`1d\`, \`1w\`, or \`0\`/\`remove\` to untimeout.`);
    }

    const MAX_TIMEOUT_MS = 28 * 24 * 60 * 60 * 1000; // 28 days max in Discord API
    if (durationMs > MAX_TIMEOUT_MS) {
      return message.reply(`${e.BlurpleCross || '<:BlurpleXCross:830844721789927434>'} Timeout duration cannot exceed **28 days** (Discord API limit).`);
    }

    try {
      const fullReason = `${reason} (by ${message.author.tag || message.author.username})`;
      
      if (durationMs === 0) {
        // Untimeout
        await targetMember.timeout(null, fullReason);

        const embed = new EmbedBuilder()
          .setColor(0x57F287) // Green
          .setTitle(`🔊 Timeout Removed`)
          .setDescription(`Successfully removed timeout for <@${targetMember.id}>.`)
          .addFields([
            { name: 'User', value: `<@${targetMember.id}> (\`${targetMember.user.tag}\`)`, inline: true },
            { name: 'Moderator', value: `<@${authorId}>`, inline: true },
            { name: 'Reason', value: reason, inline: false }
          ])
          .setTimestamp();

        if (isSlash) await message.reply({ embeds: [embed] });
        else await message.channel.send({ embeds: [embed] });
      } else {
        // Apply timeout
        await targetMember.timeout(durationMs, fullReason);

        // Try DMing user
        await targetMember.send(
          `⚠️ You have been timed out in **${message.guild.name}** for **${formatTimeoutDuration(durationMs)}**.\n` +
          `**Reason:** ${reason}`
        ).catch(() => {});

        const embed = new EmbedBuilder()
          .setColor(0xED4245) // Red
          .setTitle(`🔇 Member Timed Out`)
          .setDescription(`Successfully timed out <@${targetMember.id}>.`)
          .addFields([
            { name: 'User', value: `<@${targetMember.id}> (\`${targetMember.user.tag}\`)`, inline: true },
            { name: 'Duration', value: `\`${formatTimeoutDuration(durationMs)}\``, inline: true },
            { name: 'Moderator', value: `<@${authorId}>`, inline: true },
            { name: 'Until', value: `<t:${Math.floor((Date.now() + durationMs) / 1000)}:F> (<t:${Math.floor((Date.now() + durationMs) / 1000)}:R>)`, inline: false },
            { name: 'Reason', value: reason, inline: false }
          ])
          .setTimestamp();

        if (isSlash) await message.reply({ embeds: [embed] });
        else await message.channel.send({ embeds: [embed] });
      }
    } catch (err) {
      console.error('[timeout] Error:', err);
      return message.reply(`${e.BlurpleCross || '<:BlurpleXCross:830844721789927434>'} Failed to timeout member: \`${err.message}\``);
    }
  }
};
