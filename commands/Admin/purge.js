const clearCmd = require('./clear');
const { SlashCommandBuilder } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('purge')
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
  name: 'purge',
  aliases: ['purgemessages'],
  description: '[Owner Only] Bulk delete messages from the current channel.',
  usage: '<amount: 1-100> [@user]',
  ownerOnly: true,
  run: async (client, message, args) => {
    return clearCmd.run(client, message, args);
  }
};
