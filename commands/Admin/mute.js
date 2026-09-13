const timeoutCmd = require('./timeout');
const { SlashCommandBuilder } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('mute')
    .setDescription('Timeout or mute a member in the server.')
    .addUserOption(opt =>
      opt.setName('user')
        .setDescription('The member to mute/timeout')
        .setRequired(true)
    )
    .addStringOption(opt =>
      opt.setName('duration')
        .setDescription('Duration (e.g. 5m, 1h, 1d, 1w, or 0/remove to unmute)')
        .setRequired(true)
    )
    .addStringOption(opt =>
      opt.setName('reason')
        .setDescription('Reason for the mute')
        .setRequired(false)
    ),
  name: 'mute',
  aliases: ['m'],
  description: 'Timeout or mute a member in the server.',
  usage: '<@user> <duration: 5m/1h/1d or 0/remove> [reason]',
  run: async (client, message, args) => {
    return timeoutCmd.run(client, message, args);
  }
};
