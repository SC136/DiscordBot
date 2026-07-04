const { EmbedBuilder } = require('discord.js');
const { sendError } = require('../../utils/errorEmbed');
const { paginate } = require('../../utils/paginate');

module.exports = {
  name: 'invitelb',
  description: 'Invite leaderboard with pagination.',
  run: async (bot, message, args) => {
    if (message.author.id !== '594504468931018752') {
      return message.channel.send('This Is A Owner Only Command. You Cannot Use This, Only The Owner Of SC SmartTech Discord Server Can!!! <:1099_chicken_nocie:793737126357368843>');
    }
    const { guild } = message;

    guild.invites.fetch().then(async (invites) => {
      const inviteCounter = {};

      invites.forEach((invite) => {
        const { uses, inviter } = invite;
        if (!inviter) return;
        const { username, discriminator } = inviter;
        const name = `${username}#${discriminator}`;
        inviteCounter[name] = (inviteCounter[name] || 0) + uses;
      });

      const sortedInvites = Object.keys(inviteCounter).sort(
        (a, b) => inviteCounter[b] - inviteCounter[a]
      );

      if (sortedInvites.length === 0) {
        return message.channel.send("📊 *The invite leaderboard is currently empty!*");
      }

      // Group into pages of 10
      const chunkSize = 10;
      const pages = [];

      for (let i = 0; i < sortedInvites.length; i += chunkSize) {
        const chunk = sortedInvites.slice(i, i + chunkSize);
        
        const list = chunk.map((invite, index) => {
          const overallIndex = i + index;
          let medal = '•';
          if (overallIndex === 0) medal = '🥇';
          else if (overallIndex === 1) medal = '🥈';
          else if (overallIndex === 2) medal = '🥉';

          const count = inviteCounter[invite];
          return `\`${medal}\` **${invite}** — **${count}** member(s) invited`;
        }).join('\n');

        const embed = new EmbedBuilder()
          .setTitle(`🏆 Server Invite Leaderboard — ${message.guild.name}`)
          .setColor('#00E6FF')
          .setThumbnail(message.guild.iconURL({ forceStatic: false, size: 256 }))
          .setDescription(list)
          .setTimestamp()
          .setFooter({ text: `Page ${pages.length + 1} | Invite Leaderboard | SC SmartTech` });

        pages.push(embed);
      }

      await paginate(message, pages, { timeout: 60000 });
    }).catch(err => {
      sendError(message, {
        title: 'Failed to fetch invites',
        description: 'An error occurred while fetching guild invites. Make sure the bot has "Manage Server" permission.',
        command: 'invitelb',
        error: err
      });
    });
  },
}