const { EmbedBuilder , SlashCommandBuilder } = require('discord.js');
const { sendError } = require('../../utils/errorEmbed');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('invites')
    .setDescription('Shows Users Joined Through Someone\'s Invites'),
        name: "invites",
        description: "Shows Users Joined Through Someone's Invites",
    run: async (bot, message, args) => {
        try {
            let member = await message.mentions.members.first() || message.guild.members.cache.get(args[0]) || message.guild.members.cache.find(r => r.user.username.toLowerCase() === args.join(' ').toLocaleLowerCase()) || message.guild.members.cache.find(r => r.displayName.toLowerCase() === args.join(' ').toLocaleLowerCase()) || message.member;

            let invites = await message.guild.invites.fetch();

            let memberInvites = invites.filter(i => i.inviter && i.inviter.id === member.user.id);

            if (memberInvites.size <= 0) {
                return message.channel.send({ content: `**${member.displayName} didn't invite anyone to the server!**` });
            }

            let content = memberInvites.map(i => i.code).join("\n");
            let index = 0;
            memberInvites.forEach(invite => index += invite.uses);

            let embed = new EmbedBuilder()
                .setColor("Green")
                .setFooter({ text: message.guild.name, iconURL: message.guild.iconURL() })
                .setAuthor({ name: `Invite Tracker for ${message.guild.name}` })
                .setDescription(`Information on Invites of ${member.displayName}`)
                .addFields([
                    { name: "**No. Invited Persons**", value: String(index) },
                    { name: "Invitation Codes\n\n", value: content }
                ]);
            message.channel.send({ embeds: [embed] });
        } catch (e) {
            sendError(message, {
                title: 'Failed to retrieve invites',
                description: 'An error occurred while tracking invitation details.',
                command: 'invites',
                error: e
            });
        }
    }
};