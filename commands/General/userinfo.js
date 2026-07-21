const { EmbedBuilder, ActivityType , SlashCommandBuilder } = require('discord.js');
const moment = require("moment");
const { sendError } = require('../../utils/errorEmbed');
const e = require('../../utils/emojis');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('userinfo')
    .setDescription('No description provided')
    .addUserOption(opt => opt.setName('user').setDescription('User to get info for').setRequired(false)),
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
        online: `${e.Online} Online`,
        idle: `${e.Idle} Idle`,
        dnd: `${e.DND} Do Not Disturb`,
        offline: `${e.Invisible} Offline`
      };
      const status = statusMap[member.presence ? member.presence.status : 'offline'] || `${e.Invisible} Offline`;

      // Activities details
      let activityText = '*None*';
      if (member.presence && member.presence.activities.length > 0) {
        const activities = member.presence.activities.map(act => {
          if (act.type === ActivityType.Custom) {
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

      const embed = new EmbedBuilder()
        .setTitle(`${e.Members} User Information — ${user.tag}`)
        .setColor(member.displayHexColor || '#5865F2')
        .setThumbnail(user.displayAvatarURL({ forceStatic: false, size: 256 }))
        .setTimestamp()
        .setFooter({ text: `ID: ${user.id} | SC SmartTech` })
        
        .addFields([
          {
            name: `${e.Info} User Details`,
            value: [
              `**Username:** ${user.username}`,
              `**Discriminator:** #${user.discriminator}`,
              `**User ID:** \`${user.id}\``,
              `**Is Bot:** ${user.bot ? `${e.Bot} Yes` : `${e.CrossX} No`}`
            ].join('\n'),
            inline: false
          },
          {
            name: `${e.Fun} Presence & Activity`,
            value: [
              `**Status:** ${status}`,
              `**Current Activity:**\n${activityText}`
            ].join('\n'),
            inline: false
          },
          {
            name: `${e.Timer} Dates & Timestamps`,
            value: [
              `**Account Created:** ${moment(user.createdAt).format('MMMM Do YYYY, h:mm a')} (${moment(user.createdAt).fromNow()})`,
              `**Joined Server:** ${moment(member.joinedAt).format('MMMM Do YYYY, h:mm a')} (${moment(member.joinedAt).fromNow()})`
            ].join('\n'),
            inline: false
          },
          {
            name: `${e.Role} Roles [${roles.length}]`,
            value: rolesDisplay,
            inline: false
          }
        ]);

      return message.channel.send({ embeds: [embed] });
    } catch (err) {
      return sendError(message, {
        title: 'Failed to load user info',
        description: 'An error occurred while fetching user information. Please try again later.',
        command: 'userinfo',
        error: err
      });
    }
  }
};
