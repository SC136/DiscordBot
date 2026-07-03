const { PermissionFlagsBits } = require('discord.js');

module.exports = {
  name: 'kick',
  description: 'Kick mentioned user from this server.',
  run: async (client, message, [member = '', ...reason] ) => {

    if (!message.member.permissions.has(PermissionFlagsBits.KickMembers)) return message.reply("You cannot kick people.")

    if (!member.match(/\d{17,19}/)){
      return message.channel.send(`\\❌ | ${message.author}, Please provide the ID or mention the user to kick. [mention first before adding the reason]`);
    };

    member = await message.guild.members
    .fetch(member.match(/\d{17,19}/)[0])
    .catch(() => null);

    if (!member){
      return message.channel.send(`\\❌ | ${message.author}, User could not be found! Please ensure the supplied ID is valid. Mention user for more precision on pinpointing user.`);
    };

    if (member.id === message.author.id){
      return message.channel.send(`\\❌ | ${message.author}, You cannot kick yourself!`);
    };

    if (member.id === client.user.id){
      return message.channel.send(`\\❌ | ${message.author}, Please don't kic me!`);
    };

    if (member.id === message.guild.ownerId){
      return message.channel.send(`\\❌ | ${message.author}, You cannot kick a server owner!`);
    };

    //if (client.config.owner.includes(member.id)){
    //  return message.channel.send(`\\❌ | ${message.author}, No, you can't kick my developers through me!`)
    //};

    if (message.member.roles.highest.position < member.roles.highest.position){
      return message.channel.send(`\\❌ | ${message.author}, You can't kick that user! He/She has a higher role than yours`)
    };

    if (!member.kickable){
      return message.channel.send(`\\❌ | ${message.author}, I couldn't kick that user!`);
    };

    await member.send(`**${message.author.tag}** kicked you from ${message.guild.name}!\n**Reason**: ${reason.join(' ') || 'Unspecified.'}`)
    .catch(() => null);

    return member.kick({ reason: `Kick Command: ${message.author.tag}: ${reason.join(' ') || 'Unspecified'}`})
    .then(_member => message.channel.send(`\\✔️ Successfully kicked **${_member.user.tag}**`))
    .catch(() => message.channel.send(`\\❌ Failed to kicked **${member.user.tag}**!`));
  }
};