const { EmbedBuilder } = require('discord.js');
module.exports = {
  name: 'poll',
  description: 'Create a dynamic poll with reaction voting.',
  run: async (client, message, args) => {
    if (!args[0]) return message.reply('Bruh Give A Title...')
    const embed = new EmbedBuilder()
      .setTitle(args.join(" "))
      .setThumbnail("https://i.imgur.com/yWnDBui.png")
      .setColor("#0055ff")
    message.reply("First Argument...")
      .then(med => setTimeout(() => med.delete().catch(() => {}), 10000))
    const filter = m => m.content.includes('p');
    const collector = message.channel.createMessageCollector({ filter, time: 15000 });
    collector.on("collect", m => {
      embed.addFields({ name: m.content.slice(1), value: "1️⃣ - For This Option" });
      m.delete()
    });
    collector.on('end', () => {
      message.reply("Second Argument...")
        .then(men => setTimeout(() => men.delete().catch(() => {}), 10000))
      const filter2 = m => m.content.includes('p');
      const collector2 = message.channel.createMessageCollector({ filter: filter2, time: 15000 });
      collector2.on("collect", m => {
        embed.addFields({ name: m.content.slice(1), value: "2️⃣ - For This Option" });
        m.channel.send({ content: "<@&597305356900761611>", embeds: [embed] })
          .then(msg => {
            msg.react("1️⃣")
            msg.react("2️⃣")
          });
        m.delete();
      });
    });
    message.delete();
  },
};