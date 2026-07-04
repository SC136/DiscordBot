const { ActionRowBuilder, ButtonBuilder, ButtonStyle, ComponentType } = require('discord.js');

/**
 * Reusable button-based pagination utility
 * @param {Message} message - The original message that triggered the command
 * @param {EmbedBuilder[]} pages - An array of EmbedBuilder instances to page through
 * @param {Object} options - Options for the pagination
 * @param {number} [options.timeout=60000] - Duration to listen for button clicks in ms
 */
async function paginate(message, pages, options = {}) {
  if (!message || !pages || pages.length === 0) return;

  if (pages.length === 1) {
    return message.channel.send({ embeds: [pages[0]] });
  }

  const timeout = options.timeout || 60000;
  let currentPage = 0;

  // Create pagination buttons
  const getRow = (page) => {
    return new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId('prev')
        .setLabel('◀ Prev')
        .setStyle(ButtonStyle.Primary)
        .setDisabled(page === 0),
      new ButtonBuilder()
        .setCustomId('page_num')
        .setLabel(`Page ${page + 1}/${pages.length}`)
        .setStyle(ButtonStyle.Secondary)
        .setDisabled(true),
      new ButtonBuilder()
        .setCustomId('next')
        .setLabel('Next ▶')
        .setStyle(ButtonStyle.Primary)
        .setDisabled(page === pages.length - 1)
    );
  };

  const paginatedMessage = await message.channel.send({
    embeds: [pages[currentPage]],
    components: [getRow(currentPage)]
  });

  const collector = paginatedMessage.createMessageComponentCollector({
    componentType: ComponentType.Button,
    time: timeout
  });

  collector.on('collect', async (interaction) => {
    if (interaction.user.id !== message.author.id) {
      return interaction.reply({
        content: "Only the user who executed this command can change pages!",
        ephemeral: true
      });
    }

    await interaction.deferUpdate();

    if (interaction.customId === 'prev') {
      if (currentPage > 0) currentPage--;
    } else if (interaction.customId === 'next') {
      if (currentPage < pages.length - 1) currentPage++;
    }

    await paginatedMessage.edit({
      embeds: [pages[currentPage]],
      components: [getRow(currentPage)]
    });
  });

  collector.on('end', () => {
    const disabledRow = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId('prev')
        .setLabel('◀ Prev')
        .setStyle(ButtonStyle.Primary)
        .setDisabled(true),
      new ButtonBuilder()
        .setCustomId('page_num')
        .setLabel(`Page ${currentPage + 1}/${pages.length}`)
        .setStyle(ButtonStyle.Secondary)
        .setDisabled(true),
      new ButtonBuilder()
        .setCustomId('next')
        .setLabel('Next ▶')
        .setStyle(ButtonStyle.Primary)
        .setDisabled(true)
    );

    paginatedMessage.edit({ components: [disabledRow] }).catch(() => {});
  });

  return paginatedMessage;
}

module.exports = { paginate };
