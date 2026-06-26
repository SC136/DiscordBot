const Discord = require('discord.js')
const fetch = require('node-fetch')

async function twitchUserInfo(username, callback) {
  try {
    const res = await fetch(`https://decapi.me/twitch/id/${username}`);
    if (!res.ok) {
      return callback(null);
    }
    const text = await res.text();
    const cleanText = text.trim();
    if (cleanText.includes("User not found") || cleanText.startsWith("<html>") || cleanText.startsWith("<!DOCTYPE") || !/^\d+$/.test(cleanText)) {
      callback(null);
    } else {
      callback({
        username: username,
        id: cleanText,
      });
    }
  } catch (err) {
    // Safe fallback in case of network errors
    callback(null);
  }
}

module.exports = {
  name: 'twitch',
  description: 'View Twitch user details for sc_136.',
  run: async (client, message, args) => {
    try {
      twitchUserInfo('sc_136', function(stats) {
        if (!stats) {
          return console.error("User not found!")
        }
        console.log(stats)
        message.channel.send(stats.username)
      })
    } catch (e) {
      console.log(String(e.stack).bgRed)
      return message.channel.send(new MessageEmbed()
        .setColor(color.no)
        .setTitle(`${color.cross} An error has occurred`)
        .setDescription(`\`\`\`${e.stack}\`\`\``)
      );
    }
  }
}