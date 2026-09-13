const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits } = require('discord.js');
const fs = require('fs');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('lockname')
    .setDescription('[Owner Only] Lock a user\'s nickname so they can\'t change it.')
    .addSubcommand(sub =>
      sub.setName('add')
        .setDescription('Lock a user\'s current nickname')
        .addUserOption(opt => opt.setName('user').setDescription('The user to lock').setRequired(true))
    )
    .addSubcommand(sub =>
      sub.setName('remove')
        .setDescription('Unlock a user\'s nickname')
        .addUserOption(opt => opt.setName('user').setDescription('The user to unlock').setRequired(true))
    )
    .addSubcommand(sub =>
      sub.setName('list')
        .setDescription('Show all nickname-locked users')
    ),
  name: 'lockname',
  aliases: ['ln', 'nickloc'],
  description: '[Owner Only] Lock/unlock user nicknames so they can\'t change them.',
  ownerOnly: true,
  run: async (client, message, args) => {
    const config = JSON.parse(fs.readFileSync('./config.json', 'utf8'));
    const ownerId = client.owner || config.owner || '594504468931018752';
    const isOwner = Array.isArray(ownerId) ? ownerId.includes(message.author.id) : message.author.id === ownerId;

    if (!isOwner) {
      return message.reply('<:BlurpleXCross:830844721789927434> Only the bot owner can use this command.');
    }

    const interaction = (message.interaction && message.interaction.options) ? message.interaction : (message.options ? message : null);
    let sub, targetUserId;

    if (interaction) {
      // Slash command — use interaction options
      sub = interaction.options.getSubcommand();
      const userOpt = interaction.options.getUser('user');
      if (userOpt) targetUserId = userOpt.id;
    } else {
      // Prefix command — parse args: .lockname add @user / .lockname remove 123456 / .lockname list
      sub = (args && args[0] ? args[0] : '').toLowerCase();
      if (!['add', 'remove', 'list'].includes(sub)) {
        return message.reply('<:DiscordInfo:870511644709650472> Usage: `' + (config.prefix || '.') + 'lockname add @user` · `' + (config.prefix || '.') + 'lockname remove @user` · `' + (config.prefix || '.') + 'lockname list`');
      }
      const rawUser = (args && args[1]) ? args[1] : '';
      const match = rawUser.match(/\d{17,20}/);
      if (match) targetUserId = match[0];
    }

    if (!config.nicknameLockedUsers) config.nicknameLockedUsers = {};

    if (sub === 'add') {
      if (!targetUserId) {
        return message.reply('<:DiscordError:848521062198673438> Please mention a user or provide their ID.');
      }
      const targetMember = await message.guild.members.fetch(targetUserId).catch(() => null);
      if (!targetMember) {
        return message.reply('<:DiscordError:848521062198673438> Could not find that member in the server.');
      }

      const currentNick = targetMember.nickname || targetMember.user.displayName;
      config.nicknameLockedUsers[targetUserId] = currentNick;
      fs.writeFileSync('./config.json', JSON.stringify(config, null, 2));

      const embed = new EmbedBuilder()
        .setTitle('🔒 Nickname Locked')
        .setDescription(`**<@${targetUserId}>**'s nickname has been locked to:\n\`${currentNick}\`\n\nIf they try to change it, the bot will revert it automatically.`)
        .setColor(config.color || '#0059ff')
        .setTimestamp();

      return message.reply({ embeds: [embed] });
    }

    if (sub === 'remove') {
      if (!targetUserId) {
        return message.reply('<:DiscordError:848521062198673438> Please mention a user or provide their ID.');
      }

      if (!config.nicknameLockedUsers[targetUserId]) {
        return message.reply('<:DiscordInfo:870511644709650472> That user doesn\'t have a nickname lock.');
      }

      delete config.nicknameLockedUsers[targetUserId];
      fs.writeFileSync('./config.json', JSON.stringify(config, null, 2));

      const embed = new EmbedBuilder()
        .setTitle('🔓 Nickname Unlocked')
        .setDescription(`**<@${targetUserId}>** can now change their nickname freely.`)
        .setColor('#6BCB77')
        .setTimestamp();

      return message.reply({ embeds: [embed] });
    }

    if (sub === 'list') {
      const entries = Object.entries(config.nicknameLockedUsers);

      if (entries.length === 0) {
        return message.reply('<:DiscordInfo:870511644709650472> No users are currently nickname-locked.');
      }

      const lines = await Promise.all(entries.map(async ([userId, nick], i) => {
        let tag = userId;
        try {
          const u = await client.users.fetch(userId);
          tag = u.username;
        } catch {}
        return `\`${i + 1}.\` <@${userId}> — locked as \`${nick}\``;
      }));

      const embed = new EmbedBuilder()
        .setTitle('🔒 Nickname-Locked Users')
        .setDescription(lines.join('\n'))
        .setColor(config.color || '#0059ff')
        .setFooter({ text: `${entries.length} user${entries.length > 1 ? 's' : ''} locked` })
        .setTimestamp();

      return message.reply({ embeds: [embed] });
    }
  }
};
