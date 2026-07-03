const { EmbedBuilder } = require('discord.js');

module.exports = {
  name: 'badges',
  description: 'View the Discord badges of a user.',
  run: async (client, message, args) => {
    const user = message.mentions.users.first() || message.author;
    const flags = {
      Staff: '<:DiscordStaff:810537983514116116>',
      Partner: '<:DiscordPartner:810538029114195999>',
      BugHunterLevel1: '<:BugHunter:810537894246612995>',
      BugHunterLevel2: '<:BugHunterLvl2:810537924315316264>',
      Hypesquad: '<:HypeSquad:807182171411316786>',
      HypeSquadOnlineHouse1: '<:HypeSquadBravery:807182213618860042>',
      HypeSquadOnlineHouse2: '<:HypeSquadBrilliance:807182257210916875>',
      HypeSquadOnlineHouse3: '<:HypeSquadBalance:807182235958247435>',
      PremiumEarlySupporter: '<:EarlySupporter:810535663761096726>',
      VerifiedBot: '<:VerifiedBot:810535932888743946>',
      VerifiedDeveloper: '<:VerifiedBotDeveloper:810535327226920992>',
      ActiveDeveloper: 'Active Developer'
    };

    const userFlags = user.flags ? user.flags.toArray() : [];
    const badgesList = userFlags.map(flag => flags[flag]).filter(Boolean).join(' ') || 'None';

    const embed = new EmbedBuilder()
      .setTitle(`${user.tag}'s Badges`)
      .setDescription(badgesList)
      .setColor(client.color)

    message.channel.send({ embeds: [embed] })
  }
}