const { EmbedBuilder , SlashCommandBuilder } = require('discord.js');
const e = require('../../utils/emojis');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('uptime')
    .setDescription('bot\'s uptime'),
    name: 'uptime',
    description: 'bot\'s uptime',
    aliases : ['up'],
    run: async (client, message) => {
        let days = Math.floor(client.uptime / 86400000);
        let hours = Math.floor(client.uptime / 3600000) % 24;
        let minutes = Math.floor(client.uptime / 60000) % 60;
        let seconds = Math.floor(client.uptime / 1000) % 60;

        const embed = new EmbedBuilder()
        .setTitle(`${e.Timer} My UpTime :`)
        .setDescription('This Is Just That For How Much Time I Was Online Or Up')
        .addFields({ name: `${e.Online} UpTime`, value: `\`\`\`${days}d ${hours}h ${minutes}m ${seconds}s\`\`\`` })
        .setColor('#0059FF')
        .setTimestamp()

        message.channel.send({ embeds: [embed] });
    }
}