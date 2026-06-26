const fetch = require("node-superfetch");
const Discord = require('discord.js');

module.exports = {
  name: 'youtube-stats',
  aliases: ['ytstats', 'yts'],
  description: 'Shows SC SmartTech YT Stats',
  run: async (client, message, args) => {
    let name = 'SC SmartTech';
    if (!name) return message.channel.send("Unknown channel name.");

    if (!process.env.GOOGLE) {
      return message.channel.send("Google API key (GOOGLE) is not set in environment variables.");
    }

    try {
      const channelRes = await fetch.get(`https://www.googleapis.com/youtube/v3/search?part=snippet&q=${encodeURIComponent(name)}&key=${process.env.GOOGLE}&maxResults=1&type=channel`);
      
      if (!channelRes || !channelRes.body || !channelRes.body.items || channelRes.body.items.length === 0) {
        return message.channel.send("No channel result found. Try again.");
      }
      
      const channelItem = channelRes.body.items[0];
      
      const dataRes = await fetch.get(`https://www.googleapis.com/youtube/v3/channels?part=snippet,contentDetails,statistics,brandingSettings&id=${channelItem.id.channelId}&key=${process.env.GOOGLE}`);
      
      if (!dataRes || !dataRes.body || !dataRes.body.items || dataRes.body.items.length === 0) {
        return message.channel.send("Failed to retrieve detailed channel statistics.");
      }
      
      const dataItem = dataRes.body.items[0];

      const embed = new Discord.MessageEmbed()
        .setColor(0x7289DA)
        .setThumbnail(channelItem.snippet?.thumbnails?.high?.url || '')
        .setTimestamp(new Date())
        .addField("Channel Name", channelItem.snippet?.channelTitle || "Unknown", true)
        .addField("Channel Description", channelItem.snippet?.description || "No description", true)
        .addField("Subscribers Count", parseInt(dataItem.statistics?.subscriberCount || 0).toLocaleString(), true)
        .addField("Totaal Views", parseInt(dataItem.statistics?.viewCount || 0).toLocaleString(), true)
        .addField("Total Video(s)", parseInt(dataItem.statistics?.videoCount || 0).toLocaleString(), true)
        .addField("Date Created", channelItem.snippet?.publishedAt ? new Date(channelItem.snippet.publishedAt).toDateString() : "Unknown", true)
        .addField("Link", `[${channelItem.snippet?.channelTitle || 'Channel Link'}](https://www.youtube.com/channel/${channelItem.id?.channelId})`, true);
        
      return message.channel.send(embed);
    } catch (err) {
      console.error("Error in youtube-stats command:", err);
      return message.channel.send(`An error occurred: ${err.message}`);
    }
  }
}