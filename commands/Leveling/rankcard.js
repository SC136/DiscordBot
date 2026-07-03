const { AttachmentBuilder } = require('discord.js')
const Levels = require('discord-xp')
const canvacord = require('canvacord')
module.exports = {
  name: 'rankcard',
  description: 'Shows the current level and rank of the user!',
  run: async (client, message, args) => {
    if (!message.guild) return;
    if (message.author.bot) return;

    if (!process.env.MONGO_URI) {
      return message.channel.send("XP/Leveling system is currently disabled because the database is not configured.");
    }

    const target = message.mentions.users.first() || message.author

    let fetchBg = "https://media.istockphoto.com/photos/bright-blue-defocused-blurred-motion-abstract-background-picture-id1047234038?k=6&m=1047234038&s=612x612&w=0&h=O1lP8GIn46sboZL5bnMsznd4A1tRNJ7iXm1MMVh5I5c="

    const user = await Levels.fetch(target.id, message.guild.id, true); // Selects the target from the database.

    if (!user) return message.channel.send("Seems like this user has not earned any xp so far."); // If there isnt such user in the database, we send a message in general.

    const neededXp = Levels.xpFor(parseInt(user.level) + 1)

    const Rank = new canvacord.Rank()
      .setAvatar(target.displayAvatarURL({ forceStatic: false, extension: "jpg" }))
      .setCurrentXP(user.xp)
      .setRank(parseInt(user.position))
      .setLevel(user.level)
      .setRequiredXP(neededXp)
      .setStatus(target.presence ? target.presence.status : 'offline')
      .setProgressBar("WHITE", "COLOR")
      .setUsername(target.username)
      .setDiscriminator(target.discriminator)
      .setBackground("IMAGE", fetchBg)

    Rank.build()
      .then(data => {
        const attachment = new AttachmentBuilder(data, { name: "RankCard.png" });
        message.channel.send({ files: [attachment] });
      });

  }
}