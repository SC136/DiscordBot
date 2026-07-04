const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, ComponentType , SlashCommandBuilder } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('poll')
    .setDescription('Create a dynamic poll with button voting.'),
  name: 'poll',
  description: 'Create a dynamic poll with button voting.',
  run: async (client, message, args) => {
    if (!args[0]) return message.reply('Bruh Give A Title...');
    const pollTitle = args.join(" ");

    // Ask for first option
    const prompt1 = await message.reply("Please type the **first option** (start with the letter `p`, e.g., `pOption A`):");
    setTimeout(() => prompt1.delete().catch(() => {}), 15000);

    const filter1 = m => m.author.id === message.author.id && m.content.toLowerCase().startsWith('p');
    const collector1 = message.channel.createMessageCollector({ filter: filter1, max: 1, time: 15000 });

    let option1 = '';
    let option2 = '';

    collector1.on('collect', async m => {
      option1 = m.content.slice(1).trim();
      await m.delete().catch(() => {});

      // Ask for second option
      const prompt2 = await message.channel.send("Please type the **second option** (start with the letter `p`, e.g., `pOption B`):");
      setTimeout(() => prompt2.delete().catch(() => {}), 15000);

      const collector2 = message.channel.createMessageCollector({ filter: filter1, max: 1, time: 15000 });

      collector2.on('collect', async m2 => {
        option2 = m2.content.slice(1).trim();
        await m2.delete().catch(() => {});

        // Send the poll!
        const embed = new EmbedBuilder()
          .setTitle(`📊 Poll: ${pollTitle}`)
          .setThumbnail("https://i.imgur.com/yWnDBui.png")
          .setColor("#0055ff")
          .addFields([
            { name: `Option 1: ${option1}`, value: `**0** votes`, inline: true },
            { name: `Option 2: ${option2}`, value: `**0** votes`, inline: true }
          ])
          .setFooter({ text: "Vote using the buttons below! • SC SmartTech" })
          .setTimestamp();

        // Limit label size to 80 characters for safety
        const btn1Label = option1.length > 80 ? option1.substring(0, 77) + "..." : option1;
        const btn2Label = option2.length > 80 ? option2.substring(0, 77) + "..." : option2;

        const row = new ActionRowBuilder().addComponents(
          new ButtonBuilder()
            .setCustomId('poll_opt1')
            .setLabel(`1️⃣ ${btn1Label}`)
            .setStyle(ButtonStyle.Success),
          new ButtonBuilder()
            .setCustomId('poll_opt2')
            .setLabel(`2️⃣ ${btn2Label}`)
            .setStyle(ButtonStyle.Success)
        );

        // Ping the Polls role
        const pollMsg = await message.channel.send({
          content: "<@&597305356900761611>",
          embeds: [embed],
          components: [row]
        });

        // Track votes
        const votes1 = new Set();
        const votes2 = new Set();

        const btnCollector = pollMsg.createMessageComponentCollector({
          componentType: ComponentType.Button,
          time: 86400000 // 24 hours
        });

        btnCollector.on('collect', async (interaction) => {
          const userId = interaction.user.id;

          if (interaction.customId === 'poll_opt1') {
            if (votes1.has(userId)) {
              votes1.delete(userId);
            } else {
              votes1.add(userId);
              votes2.delete(userId);
            }
          } else if (interaction.customId === 'poll_opt2') {
            if (votes2.has(userId)) {
              votes2.delete(userId);
            } else {
              votes2.add(userId);
              votes1.delete(userId);
            }
          }

          // Update the embed fields
          embed.setFields([
            { name: `Option 1: ${option1}`, value: `**${votes1.size}** votes`, inline: true },
            { name: `Option 2: ${option2}`, value: `**${votes2.size}** votes`, inline: true }
          ]);

          await interaction.update({ embeds: [embed] });
        });

        btnCollector.on('end', () => {
          // Disable buttons
          const disabledRow = new ActionRowBuilder().addComponents(
            new ButtonBuilder()
              .setCustomId('poll_opt1')
              .setLabel(`1️⃣ ${btn1Label}`)
              .setStyle(ButtonStyle.Success)
              .setDisabled(true),
            new ButtonBuilder()
              .setCustomId('poll_opt2')
              .setLabel(`2️⃣ ${btn2Label}`)
              .setStyle(ButtonStyle.Success)
              .setDisabled(true)
          );
          pollMsg.edit({ components: [disabledRow] }).catch(() => {});
        });
      });

      collector2.on('end', (collected, reason) => {
        if (reason === 'time' && option2 === '') {
          message.channel.send("❌ Poll creation timed out while waiting for the second option.");
        }
      });
    });

    collector1.on('end', (collected, reason) => {
      if (reason === 'time' && option1 === '') {
        message.channel.send("❌ Poll creation timed out while waiting for the first option.");
      }
    });

    await message.delete().catch(() => {});
  }
};