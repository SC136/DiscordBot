const { EmbedBuilder } = require('discord.js');
const fetch = require('node-fetch');

module.exports = {
  name: 'npm',
  aliases: ['npmstats', 'npm-stats'],
  description: 'View metadata and download statistics for any NPM package.',
  run: async (client, message, args) => {
    const packageName = args.join(' ') || 'sc136';

    try {
      message.channel.sendTyping().catch(() => {});

      // NPM registry URLs need scoped package names to preserve the '@' but encode the '/'
      // e.g. @types/node -> @types%2Fnode
      let urlName = packageName;
      if (packageName.startsWith('@') && packageName.includes('/')) {
        const parts = packageName.split('/');
        urlName = parts[0] + '%2F' + parts.slice(1).join('/');
      } else {
        urlName = encodeURIComponent(packageName);
      }

      // Fetch package metadata
      const metaRes = await fetch(`https://registry.npmjs.org/${urlName}`);
      
      if (metaRes.status === 404) {
        return message.channel.send({
          embeds: [
            new EmbedBuilder()
              .setDescription(`❌ *Could not find NPM package **"${packageName}"**.*`)
              .setColor('#E85D5D')
          ]
        });
      }

      if (!metaRes.ok) {
        return message.channel.send({
          embeds: [
            new EmbedBuilder()
              .setDescription(`❌ *Failed to fetch package metadata from NPM Registry.*`)
              .setColor('#E85D5D')
          ]
        });
      }

      const metaData = await metaRes.json();
      const latestVersion = metaData['dist-tags']?.latest || '—';
      const description = metaData.description || 'No description provided.';
      
      // Fetch download stats (last year)
      const dlRes = await fetch(`https://api.npmjs.org/downloads/point/last-year/${urlName}`);
      let downloads = '—';
      if (dlRes.ok) {
        const dlData = await dlRes.json();
        if (dlData.downloads != null) {
          downloads = dlData.downloads.toLocaleString();
        }
      }

      // Get author info
      let author = '—';
      if (metaData.author) {
        if (typeof metaData.author === 'string') {
          author = metaData.author;
        } else if (typeof metaData.author === 'object') {
          author = metaData.author.name || '—';
        }
      }

      // Get keywords
      const keywords = Array.isArray(metaData.keywords) && metaData.keywords.length > 0
        ? metaData.keywords.slice(0, 5).map(k => `\`${k}\``).join(', ')
        : '—';

      const embed = new EmbedBuilder()
        .setTitle(`📦 NPM Package: ${metaData.name}`)
        .setURL(`https://www.npmjs.com/package/${metaData.name}`)
        .setColor('#CB3837') // NPM Red
        .setDescription(description)
        .addFields([
          { name: 'Latest Version', value: `\`v${latestVersion}\``, inline: true },
          { name: 'Downloads (Last Year)', value: `\`${downloads}\``, inline: true },
          { name: 'Author', value: author, inline: true },
          { name: 'Keywords', value: keywords, inline: false }
        ])
        .setFooter({ text: 'NPM Registry & Downloads API', iconURL: 'https://static-production.npmjs.com/58a1b27d4ca92d1bdf69da57af3f0f7c.png' })
        .setTimestamp();

      message.channel.send({ embeds: [embed] });

    } catch (err) {
      console.error('Error in npm command:', err);
      message.channel.send('❌ *An error occurred while fetching the NPM stats!*');
    }
  }
};
