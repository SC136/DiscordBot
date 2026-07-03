const { EmbedBuilder, ChannelType } = require("discord.js");
const moment = require("moment");

module.exports = {
  name: 'serverinfo',
  aliases: ['si', 'server', 'guildinfo'],
  description: 'View detailed statistics and metadata about this server.',
  run: async (client, message, args) => {
    try {
      const guild = message.guild;
      
      // Calculate member counts
      const totalMembers = guild.memberCount;
      const botsCount = guild.members.cache.filter(m => m.user.bot).size;
      const humansCount = totalMembers - botsCount;
      
      // Calculate statuses
      const onlineCount = guild.members.cache.filter(m => m.presence && m.presence.status === 'online').size;
      const idleCount = guild.members.cache.filter(m => m.presence && m.presence.status === 'idle').size;
      const dndCount = guild.members.cache.filter(m => m.presence && m.presence.status === 'dnd').size;
      const offlineCount = totalMembers - (onlineCount + idleCount + dndCount);

      // Channel counts
      const textChannels = guild.channels.cache.filter(c => c.type === ChannelType.GuildText).size;
      const voiceChannels = guild.channels.cache.filter(c => c.type === ChannelType.GuildVoice).size;
      const categoryChannels = guild.channels.cache.filter(c => c.type === ChannelType.GuildCategory).size;

      // Guild boost status
      const boostLevel = guild.premiumTier;
      const boostCount = guild.premiumSubscriptionCount;

      const embed = new EmbedBuilder()
        .setTitle(`🏰 Server Information — ${guild.name}`)
        .setColor('#5865F2')
        .setThumbnail(guild.iconURL({ forceStatic: false, size: 256 }))
        .setTimestamp()
        .setFooter({ text: "Server Stats | SC SmartTech" })
        
        .addFields([
          {
            name: '📌 General Info',
            value: [
              `**Name:** ${guild.name}`,
              `**Server ID:** ${guild.id}`,
              `**Owner:** <@${guild.ownerId}> (ID: \`${guild.ownerId}\`)`,
              `**Created On:** ${moment(guild.createdAt).format('MMMM Do YYYY, h:mm a')} (${moment(guild.createdAt).fromNow()})`
            ].join('\n'),
            inline: false
          },
          {
            name: '👤 Members Breakdown',
            value: [
              `**Total Members:** \`${totalMembers.toLocaleString()}\``,
              `• Humans: \`${humansCount.toLocaleString()}\``,
              `• Bots: \`${botsCount.toLocaleString()}\``,
              `**Status:** 🟢 \`${onlineCount}\` | 🟡 \`${idleCount}\` | 🔴 \`${dndCount}\` | ⚫ \`${offlineCount}\``
            ].join('\n'),
            inline: true
          },
          {
            name: '📁 Channels & Roles',
            value: [
              `**Total Channels:** \`${guild.channels.cache.size}\``,
              `• Text: \`${textChannels}\``,
              `• Voice: \`${voiceChannels}\``,
              `• Categories: \`${categoryChannels}\``,
              `**Roles Count:** \`${guild.roles.cache.size}\``
            ].join('\n'),
            inline: true
          },
          {
            name: '⚡ Boost Status',
            value: [
              `**Boost Level:** Tier \`${boostLevel}\``,
              `**Boost Count:** \`${boostCount || 0}\` boosts`
            ].join('\n'),
            inline: false
          }
        ]);

      return message.channel.send({ embeds: [embed] });
    } catch (err) {
      console.error("Error in serverinfo command:", err);
      return message.channel.send(`❌ *An error occurred while fetching server info: ${err.message}*`);
    }
  }
};
