const { Client, Message, MessageEmbed } = require('discord.js');

module.exports = {
  name: 'badges',
  description: 'View the Discord badges of a user.',
  run: async (client, message, args) => {
    //message.guild.members.cache.get(args[0])
    const user = message.mentions.users.first() || message.author;
    const flags = {
      DISCORD_EMPLOYEE: '<:DiscordStaff:810537983514116116>',
      DISCORD_PARTNER: '<:DiscordPartner:810538029114195999>',
      BUGHUNTER_LEVEL_1: '<:BugHunter:810537894246612995>',
      BUGHUNTER_LEVEL_2: '<:BugHunterLvl2:810537924315316264>',
      HYPESQUAD_EVENTS: '<:HypeSquad:807182171411316786>',
      HOUSE_BRAVERY: '<:HypeSquadBravery:807182213618860042>',
      HOUSE_BRILLIANCE: '<:HypeSquadBrilliance:807182257210916875>',
      HOUSE_BALANCE: '<:HypeSquadBalance:807182235958247435>',
      EARLY_SUPPORTER: '<:EarlySupporter:810535663761096726>',
      TEAM_USER: 'Team User',
      SYSTEM: 'System',
      VERIFIED_BOT: '<:VerifiedBot:810535932888743946>',
      VERIFIED_DEVELOPER: '<:VerifiedBotDeveloper:810535327226920992>'
    };

    const embed = new MessageEmbed()
      .setTitle(`${user.tag}'s Badges - ${flags[user.flags.toArray()]}`)
      .setColor(client.color)

    message.channel.send(embed)

    //`${user}'s badges: ${flags[user.flags.toArray()]}`
    //`${user.tag}'s Badges : ${flags[user.flags.toArray()]}`
  }
}