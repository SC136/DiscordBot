const { EmbedBuilder , SlashCommandBuilder } = require('discord.js');
const request = require("node-superfetch");
const { sendError } = require('../../utils/errorEmbed');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('meme')
    .setDescription('Fetch a random hot meme from Reddit.'),
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
      return sendError(message, {
        title: 'Failed to fetch meme',
        description: 'An error occurred while fetching the meme from Reddit.',
        command: 'meme',
        error: err
      });
    }
  }
};
