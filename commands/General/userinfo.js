const Discord = require("discord.js");
const moment = require("moment");

module.exports = {
  name: 'userinfo',
  aliases: ['ui', 'whois', 'user'],
  description: 'View detailed information about a server member.',
  run: async (client, message, args) => {
    try {
      // Find targeted member or fallback to command author
      const member = message.mentions.members.first() || 
                     message.guild.members.cache.get(args[0]) || 
                     message.member;

      const user = member.user;

      // Status indicator
      const statusMap = {
        online: '🟢 Online',
        idle: '🟡 Idle',
        dnd: '🔴 Do Not Disturb',
        offline: '⚫ Offline'
      };
      const status = statusMap[user.presence ? user.presence.status : 'offline'] || '⚫ Offline';

      // Activities details
      let activityText = '*None*';
      if (user.presence && user.presence.activities.length > 0) {
        const activities = user.presence.activities.map(act => {
          if (act.type === 'CUSTOM_STATUS') {
            const emojiStr = act.emoji ? `${act.emoji.name} ` : '';
            return `Custom Status: ${emojiStr}*"${act.state || ''}"*`;
          }
          return `Playing: **${act.name}**`;
        });
        activityText = activities.join('\n');
      }

      // Member roles
      const roles = member.roles.cache
        .filter(r => r.id !== message.guild.id) // Filter out @everyone
        .map(r => r.toString());
        
      const rolesDisplay = roles.length > 0 ? roles.join(', ') : 'None';

      const embed = new Discord.MessageEmbed()
        .setTitle(`👤 User Information — ${user.tag}`)
        .setColor(member.displayHexColor || '#5865F2')
        .setThumbnail(user.displayAvatarURL({ dynamic: true, size: 256 }))
        .setTimestamp()
        .setFooter(`ID: ${user.id} | SC SmartTech`)
        
        .addField('📌 User Details', [
          `**Username:** ${user.username}`,
          `**Discriminator:** #${user.discriminator}`,
          `**User ID:** \`${user.id}\``,
          `**Is Bot:** ${user.bot ? '✅ Yes' : '❌ No'}`
        ].join('\n'))

        .addField('🎮 Presence & Activity', [
          `**Status:** ${status}`,
          `**Current Activity:**\n${activityText}`
        ].join('\n'))

        .addField('📅 Dates & Timestamps', [
          `**Account Created:** ${moment(user.createdAt).format('MMMM Do YYYY, h:mm a')} (${moment(user.createdAt).fromNow()})`,
          `**Joined Server:** ${moment(member.joinedAt).format('MMMM Do YYYY, h:mm a')} (${moment(member.joinedAt).fromNow()})`
        ].join('\n'))

        .addField(`🛡️ Roles [${roles.length}]`, rolesDisplay);

      return message.channel.send(embed);
    } catch (err) {
      console.error("Error in userinfo command:", err);
      return message.channel.send(`❌ *An error occurred while fetching user info: ${err.message}*`);
    }
  }
};
