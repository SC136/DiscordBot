const Discord = require('discord.js')

module.exports = {
    name: 'uptime',
    description: 'bot\'s uptime',
    aliases : ['up'],
    run: async (client, message) => {
        let days = Math.floor(client.uptime / 86400000);
        let hours = Math.floor(client.uptime / 3600000) % 24;
        let minutes = Math.floor(client.uptime / 60000) % 60;
        let seconds = Math.floor(client.uptime / 1000) % 60;

        const embed = new Discord.MessageEmbed()
        .setTitle('<:SCSmartTechLogo:793665812493893652> My UpTime :')
        .setDescription('This Is Just That For How Much Time I Was Online Or Up')
        .addField('<a:7908_Cat_laugh_omega:793734088741748746> UpTime', `\`\`\`${days}d ${hours}h ${minutes}m ${seconds}s\`\`\``)
        .setColor('#0059FF')
        .setTimestamp()

        message.channel.send(embed);
    }
}