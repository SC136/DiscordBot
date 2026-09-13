const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits } = require('discord.js');
const fs = require('fs');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('clear')
    .setDescription('[Owner Only] Bulk delete messages from the current channel.')
    .addIntegerOption(opt =>
      opt.setName('amount')
        .setDescription('Number of messages to delete (1-100)')
        .setMinValue(1)
        .setMaxValue(100)
        .setRequired(true)
    )
    .addUserOption(opt =>
      opt.setName('user')
        .setDescription('Only delete messages sent by this specific user (optional)')
        .setRequired(false)
    ),
  name: 'clear',
  aliases: ['clean', 'cls', 'prune'],
  description: '[Owner Only] Bulk delete messages from the current channel.',
  usage: '<amount: 1-100> [@user]',
  ownerOnly: true,
  run: async (client, message, args) => {
    // Read config to check owner
    let config = {};
    try {
      config = JSON.parse(fs.readFileSync('./config.json', 'utf8'));
    } catch {
      config = require('../../config.json');
    }

    const ownerId = client.owner || config.owner || '594504468931018752';
    const authorId = message.author ? message.author.id : (message.user ? message.user.id : null);
    const isOwner = Array.isArray(ownerId) ? ownerId.includes(authorId) : authorId === ownerId;

    if (!isOwner) {
      return message.reply('<:BlurpleXCross:830844721789927434> Only the bot owner can use this command.');
    }

    if (!message.guild) {
      return message.reply('<:BlurpleXCross:830844721789927434> This command can only be used in a server channel.');
    }

    // Permission check for the bot
    const botMember = message.guild.members.me || await message.guild.members.fetchMe().catch(() => null);
    if (!botMember || !message.channel.permissionsFor(botMember)?.has(PermissionFlagsBits.ManageMessages)) {
      return message.reply('<:BlurpleXCross:830844721789927434> I need the **Manage Messages** permission in this channel to delete messages.');
    }

    const interaction = (message.interaction && message.interaction.options) ? message.interaction : (message.options ? message : null);
    const isSlash = !!interaction;

    let amount = null;
    let targetUser = null;

    if (interaction && interaction.options) {
      amount = interaction.options.getInteger ? interaction.options.getInteger('amount') : parseInt(args[0], 10);
      targetUser = interaction.options.getUser ? interaction.options.getUser('user') : null;
    } else {
      // Prefix command argument parsing
      if (!args || args.length === 0) {
        return message.reply(`<:DiscordInfo:870511644709650472> **Usage:** \`${config.prefix || '.'}clear <amount: 1-100> [@user]\` or \`${config.prefix || '.'}purge <amount: 1-100>\``);
      }

      for (const arg of args) {
        const num = parseInt(arg, 10);
        if (!isNaN(num) && num >= 1 && num <= 100 && amount === null && !arg.match(/^<@!?\d+>$/) && !arg.match(/^\d{17,20}$/)) {
          amount = num;
        } else if (!isNaN(num) && amount === null && num >= 1 && num <= 100) {
          amount = num;
        }

        const match = arg.match(/\d{17,20}/);
        if (match && !targetUser && (isNaN(num) || num > 100 || arg.startsWith('<@'))) {
          const foundId = match[0];
          targetUser = await client.users.fetch(foundId).catch(() => null);
        }
      }
    }

    if (!amount || isNaN(amount) || amount < 1 || amount > 100) {
      return message.reply('<:BlurpleXCross:830844721789927434> Please specify a valid number of messages to delete between **1** and **100**.');
    }

    try {
      // If it's a prefix command, delete the command trigger message first so it doesn't clutter
      if (!isSlash && typeof message.delete === 'function') {
        await message.delete().catch(() => {});
      }

      let deletedCount = 0;
      let noteOld = '';

      if (targetUser) {
        // Filter by specific user
        const messages = await message.channel.messages.fetch({ limit: 100 });
        const userMessages = messages.filter(m => m.author.id === targetUser.id);
        const toDelete = Array.from(userMessages.values()).slice(0, amount);

        if (toDelete.length === 0) {
          const embed = new EmbedBuilder()
            .setColor(config.color || '#0059ff')
            .setDescription(`<:DiscordInfo:870511644709650472> No recent messages found from **${targetUser.tag || targetUser.username}** (within the last 100 messages).`);
          
          const sent = isSlash ? await message.reply({ embeds: [embed] }) : await message.channel.send({ embeds: [embed] });
          setTimeout(() => {
            if (isSlash && interaction && typeof interaction.deleteReply === 'function') {
              interaction.deleteReply().catch(() => {});
            } else if (sent && typeof sent.delete === 'function') {
              sent.delete().catch(() => {});
            }
          }, 4000);
          return;
        }

        const deleted = await message.channel.bulkDelete(toDelete, true);
        deletedCount = deleted.size;
        if (deleted.size < toDelete.length) {
          noteOld = '\n*(Messages older than 14 days cannot be deleted due to Discord limits)*';
        }
      } else {
        // General bulk delete
        const deleted = await message.channel.bulkDelete(amount, true);
        deletedCount = deleted.size;
        if (deleted.size < amount) {
          noteOld = '\n*(Messages older than 14 days cannot be deleted due to Discord limits)*';
        }
      }

      const description = targetUser
        ? `🧹 Successfully cleared **${deletedCount}** message${deletedCount === 1 ? '' : 's'} from **${targetUser.tag || targetUser.username}**.${noteOld}`
        : `🧹 Successfully cleared **${deletedCount}** message${deletedCount === 1 ? '' : 's'}.${noteOld}`;

      const embed = new EmbedBuilder()
        .setColor(config.color || '#0059ff')
        .setDescription(description);

      const sent = isSlash ? await message.reply({ embeds: [embed] }) : await message.channel.send({ embeds: [embed] });
      
      // Auto-delete confirmation after 4 seconds
      setTimeout(() => {
        if (isSlash && interaction && typeof interaction.deleteReply === 'function') {
          interaction.deleteReply().catch(() => {});
        } else if (sent && typeof sent.delete === 'function') {
          sent.delete().catch(() => {});
        }
      }, 4000);

    } catch (err) {
      console.error('[clear] Error during deletion:', err);
      const errorEmbed = new EmbedBuilder()
        .setColor(0xED4245)
        .setDescription(`<:BlurpleXCross:830844721789927434> Failed to clear messages: \`${err.message}\``);
      
      if (isSlash) {
        await message.reply({ embeds: [errorEmbed] }).catch(() => {});
      } else {
        await message.channel.send({ embeds: [errorEmbed] }).catch(() => {});
      }
    }
  }
};
