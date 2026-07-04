const { AttachmentBuilder } = require("discord.js");
const canvacord = require("canvacord");
const { sendError } = require('../../utils/errorEmbed');

module.exports = {
  name: 'card',
  description: 'Generate a custom rank and XP card image for yourself.',
  run: async (client, message, args) => {
    const Rank = new canvacord.Rank()
      .setAvatar(message.author.displayAvatarURL({ forceStatic: false, extension: "jpg" }))
      .setCurrentXP(450)
      .setLevel(7)
      .setRequiredXP(1000)
      .setStatus(message.author.presence?.status || "online")
      .setProgressBar("WHITE", "COLOR")
      .setUsername(message.author.username)
      .setDiscriminator(message.author.discriminator || "0000")
      .setBackground("COLOR", "#0059ff");

    Rank.build()
      .then(data => {
        const attachment = new AttachmentBuilder(data, { name: "rank-card.png" });
        message.channel.send({ files: [attachment] });
      }).catch(err => {
        sendError(message, {
          title: 'Failed to generate card',
          description: 'An error occurred while building the custom rank card image.',
          command: 'card',
          error: err
        });
      });
  }
}