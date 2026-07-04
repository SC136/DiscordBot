const Levels = require('discord-xp')
const { EmbedBuilder , SlashCommandBuilder } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('level')
    .setDescription('rank'),
  name: 'level',
  aliases: ['rank', 'xp'],
  description: 'rank',
  run: async (client, message, args) => {
    if (!process.env.MONGO_URI) {
      return message.channel.send("XP/Leveling system is currently disabled because the database is not configured.");
    }

    const target = message.mentions.users.first() || message.author; // Grab the target.

    const user = await Levels.fetch(target.id, message.guild.id); // Selects the target from the database.

    if (!user) return message.channel.send("Seems That This User Is A Noob Or A Bot, Bruhhh He Is Not Chatting. Tell Him To Spam A Liittle And Then Use This Command Again ;-)"); // If there isnt such user in the database, we send a message in general.

    const neededXp = Levels.xpFor(parseInt(user.level) + 1);

    const embed = new EmbedBuilder()
      .setTitle('SC SmartTech Rank Command')
      .setThumbnail('https://media.discordapp.net/attachments/779005181760765985/782878022332055559/SC_SmartTech_Logo.png?width=588&height=588')
      .setDescription('> Level/XP System!!!')
      .addFields([
        { name: `${target.tag}'s Level :`, value: `\`\`\`${user.level}\`\`\`` },
        { name: 'Rank :', value: String(parseInt(user.position)) },
        { name: 'Current XP :', value: `\`\`\`${user.xp}\`\`\`` },
        { name: 'Required XP :', value: `\`\`\`${neededXp}\`\`\`` }
      ])
      .setFooter({ text: 'TIP : You Can Also View Someone Elses Rank By Doing `sc rank @username` :-)' })
      .setColor('#0059FF')
    message.channel.send({ embeds: [embed] }); // We show the level.
  }
}