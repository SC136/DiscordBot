const { EmbedBuilder } = require("discord.js");
const request = require("node-superfetch");

module.exports = {
  name: 'meme',
  aliases: ['dankmeme', 'joke'],
  description: 'Fetch a random hot meme from Reddit.',
  run: async (client, message, args) => {
    try {
      // Fetch a random meme from meme-api.com
      const { body } = await request.get("https://meme-api.com/gimme");

      if (!body || !body.url) {
        return message.channel.send("❌ *Failed to fetch a meme from Reddit. Please try again later.*");
      }

      const embed = new EmbedBuilder()
        .setTitle(body.title)
        .setURL(body.postLink)
        .setImage(body.url)
        .setColor('#FF4500') // Reddit OrangeRed color
        .setTimestamp()
        .setFooter({ text: `👍 ${body.ups.toLocaleString()} upvotes | Subreddit: r/${body.subreddit} | SC SmartTech` });

      return message.channel.send({ embeds: [embed] });
    } catch (err) {
      console.error("Error in meme command:", err);
      return message.channel.send(`❌ *An error occurred while fetching the meme: ${err.message}*`);
    }
  }
};
