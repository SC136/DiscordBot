const fetch = require('node-fetch')
const { sendError } = require('../../utils/errorEmbed')

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
          return sendError(message, {
            title: 'User not found',
            description: 'Could not find the Twitch user. They may not exist or the API may be unavailable.',
            command: 'twitch'
          });
        }
        console.log(stats)
        message.channel.send(stats.username)
      })
    } catch (e) {
      sendError(message, {
        title: 'Failed to fetch Twitch profile',
        description: 'An error occurred while contacting the Twitch API. Please try again later.',
        command: 'twitch',
        error: e
      });
    }
  }
}