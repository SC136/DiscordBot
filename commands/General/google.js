const Discord = require("discord.js")
request = require("node-superfetch");

module.exports = {
  name: 'google',
  aliases: ['gl'],
  description: 'Search Google and return the top result.',
  run: async (client, message, args) => {
    let googleKey = process.env.GOOGLE_KEY;
    let csx = process.env.GOOGLE_CX;

    if (!googleKey || !csx) {
      return message.channel.send("❌ *Google API key or Search Engine ID is not configured in environment variables.*");
    }

    let query = args.join(" ");
    let result;

    if (!query) return message.channel.send("Please enter the query.");

    href = await search(query);
    if (!href) return message.channel.send("Unknown search.");

    const embed = new Discord.MessageEmbed()
      .setTitle(href.title)
      .setDescription(href.snippet)
      .setImage(href.pagemap ? href.pagemap.cse_thumbnail[0].src : null) // Sometimes, the thumbnail might be unavailable in variant site. Return it to null.
      .setURL(href.link)
      .setColor('#0059FF')
      .setFooter("Powered By Google | SC SmartTech")

    return message.channel.send(embed);

    async function search(query) {
      const { body } = await request.get("https://www.googleapis.com/customsearch/v1").query({
        key: googleKey, cx: csx, safe: "off", q: query
      });

      if (!body.items) return null;
      return body.items[0];
    }
  }
};  