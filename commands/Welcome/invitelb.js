module.exports = {
  name: 'invitelb',
  description: 'Invite leaderboard',
  run: async (bot, message, args) => {
    if (message.author.id !== '594504468931018752') return message.channel.send('This Is A Owner Only Command. You Cannot Use This, Only The Owner Of SC SmartTech Discord Server Can!!! <:1099_chicken_nocie:793737126357368843>');
    const { guild } = message

    guild.invites.fetch().then((invites) => {
      const inviteCounter = {};

      invites.forEach((invite) => {
        const { uses, inviter } = invite;
        if (!inviter) return;
        const { username, discriminator } = inviter;

        const name = `${username}#${discriminator}`;

        inviteCounter[name] = (inviteCounter[name] || 0) + uses;
      });

      let replyText = 'Invites:';

      const sortedInvites = Object.keys(inviteCounter).sort(
        (a, b) => inviteCounter[b] - inviteCounter[a]
      );

      console.log(sortedInvites);

      if (sortedInvites.length === 10) sortedInvites.length = 10;

      for (const invite of sortedInvites) {
        const count = inviteCounter[invite];
        replyText += `\n${invite} has invited ${count} member(s)!`;
      }

      message.channel.send(replyText);
    }).catch(err => {
      console.error(err);
      message.channel.send("❌ *Failed to fetch guild invites.*");
    });
  },
}