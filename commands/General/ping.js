const { EmbedBuilder , SlashCommandBuilder } = require('discord.js');
const e = require('../../utils/emojis');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('ping')
    .setDescription('Returns latency and API ping'),
    name : 'ping',
    category : 'info',
    description : 'Returns latency and API ping',

    /**
     * @param {Client} client
     * @param {Message} message
     * @param {String[]} args
     */

    run : async(client, message, args) => {
        const msg = await message.channel.send(`${e.Ping} Pinging...`)
        const embed = new EmbedBuilder()
            .setTitle(`${e.Ping} Pong!`)
            .setDescription(`${e.Timer} WebSocket ping is \`${client.ws.ping}ms\`\n${e.Info} Message edit ping is \`${Math.floor(msg.createdAt - message.createdAt)}ms\``)
            .setColor('#0059FF')
            await message.channel.send({ embeds: [embed] })
            msg.delete()

    }
}
