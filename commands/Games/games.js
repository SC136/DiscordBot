const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, ComponentType , SlashCommandBuilder } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('game')
    .setDescription('Play a bunch of games with other people'),
  name: 'game',
  aliases: ['games'],
  description: 'Play a bunch of games with other people',
  category: 'games',
  usage: 'game (or click buttons to pick!)',
  run: async (client, message, args) => {
    // If a game name is provided as an argument, directly launch it
    if (args[0]) {
      return handleGame(message, args[0].toLowerCase());
    }

    const embed = new EmbedBuilder()
      .setTitle("🎮  Game Arcade  🎮")
      .setDescription(
        "**Pick a game by clicking a button below!**\n" +
        "You have 30 seconds to choose."
      )
      .setColor("#7C3AED")
      .setFooter({
        text: `Requested by ${message.author.tag}`,
        iconURL: message.author.displayAvatarURL({ forceStatic: false })
      })
      .setTimestamp();

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId('game_guessnumber')
        .setLabel('🔢 Guess The Number')
        .setStyle(ButtonStyle.Primary),
      new ButtonBuilder()
        .setCustomId('game_rps')
        .setLabel('✊ Rock Paper Scissors')
        .setStyle(ButtonStyle.Primary),
      new ButtonBuilder()
        .setCustomId('game_hangman')
        .setLabel('🪓 Hangman')
        .setStyle(ButtonStyle.Primary),
      new ButtonBuilder()
        .setCustomId('game_cancel')
        .setLabel('❌ Cancel')
        .setStyle(ButtonStyle.Danger)
    );

    const msg = await message.channel.send({ embeds: [embed], components: [row] });

    const collector = msg.createMessageComponentCollector({
      componentType: ComponentType.Button,
      time: 30000
    });

    collector.on('collect', async (interaction) => {
      if (interaction.user.id !== message.author.id) {
        return interaction.reply({ content: "Only the person who started the arcade can select a game!", ephemeral: true });
      }

      // Disable all buttons upon selection
      const disabledRow = new ActionRowBuilder().addComponents(
        row.components.map(btn => ButtonBuilder.from(btn).setDisabled(true))
      );

      if (interaction.customId === 'game_cancel') {
        await interaction.update({
          embeds: [
            new EmbedBuilder()
              .setTitle("🎮  Game Arcade")
              .setDescription("Game selection cancelled.")
              .setColor("#EF4444")
          ],
          components: [disabledRow]
        });
        return collector.stop('cancelled');
      }

      const gameMap = {
        'game_guessnumber': { name: 'Guess The Number', cmd: 'guessnumber' },
        'game_rps': { name: 'Rock Paper Scissors', cmd: 'rps' },
        'game_hangman': { name: 'Hangman', cmd: 'hangman' }
      };

      const game = gameMap[interaction.customId];
      if (!game) return;

      await interaction.update({
        embeds: [
          new EmbedBuilder()
            .setTitle(`🎮 Starting: ${game.name}`)
            .setDescription("Get ready...")
            .setColor("#10B981")
        ],
        components: [disabledRow]
      });

      collector.stop('selected');
      return handleGame(message, game.cmd);
    });

    collector.on('end', (collected, reason) => {
      if (reason === 'time') {
        const disabledRow = new ActionRowBuilder().addComponents(
          row.components.map(btn => ButtonBuilder.from(btn).setDisabled(true))
        );
        msg.edit({
          embeds: [
            new EmbedBuilder()
              .setTitle("🎮  Game Arcade")
              .setDescription("⏰ Timed out! No game was selected.")
              .setColor("#6B7280")
          ],
          components: [disabledRow]
        }).catch(() => {});
      }
    });
  }
};

// ── Game Logic ──
async function handleGame(message, gameName) {
  if (gameName === 'guessnumber' || gameName === 'guessthenumber') {
    const randomNumber = Math.floor(Math.random() * 10) + 1;
    await message.channel.send({
      embeds: [
        new EmbedBuilder()
          .setTitle("🔢 Guess The Number!")
          .setDescription("I'm thinking of a number between **1** and **10**.\nYou have **30 seconds** to guess it in chat!")
          .setColor("#3B82F6")
      ]
    });

    const filter = res => res.author.id === message.author.id && !isNaN(res.content);
    try {
      const collected = await message.channel.awaitMessages({ filter, max: 1, time: 30000, errors: ['time'] });
      const guess = parseInt(collected.first().content);
      if (guess === randomNumber) {
        return message.reply({
          embeds: [
            new EmbedBuilder()
              .setTitle("🎉 Correct!")
              .setDescription(`The number was indeed **${randomNumber}**!`)
              .setColor("#10B981")
          ]
        });
      } else {
        return message.reply({
          embeds: [
            new EmbedBuilder()
              .setTitle("❌ Wrong!")
              .setDescription(`The number was **${randomNumber}**. Better luck next time!`)
              .setColor("#EF4444")
          ]
        });
      }
    } catch (err) {
      return message.reply(`⏰ Time's up! The number was **${randomNumber}**.`);
    }
  }

  if (gameName === 'rps') {
    const validChoices = ['rock', 'paper', 'scissors'];
    const rpsEmojis = { rock: "✊", paper: "✋", scissors: "✌️" };

    const rpsEmbed = new EmbedBuilder()
      .setTitle("✊✋✌️ Rock Paper Scissors!")
      .setDescription("Click a button below to make your choice!\nYou have **30 seconds**.")
      .setColor("#F59E0B")
      .setTimestamp();

    const rpsRow = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId('rps_rock')
        .setLabel('✊ Rock')
        .setStyle(ButtonStyle.Secondary),
      new ButtonBuilder()
        .setCustomId('rps_paper')
        .setLabel('✋ Paper')
        .setStyle(ButtonStyle.Secondary),
      new ButtonBuilder()
        .setCustomId('rps_scissors')
        .setLabel('✌️ Scissors')
        .setStyle(ButtonStyle.Secondary)
    );

    const rpsMsg = await message.channel.send({
      embeds: [rpsEmbed],
      components: [rpsRow]
    });

    const rpsCollector = rpsMsg.createMessageComponentCollector({
      componentType: ComponentType.Button,
      time: 30000
    });

    rpsCollector.on('collect', async (interaction) => {
      if (interaction.user.id !== message.author.id) {
        return interaction.reply({ content: "Only the player who started the game can make a choice!", ephemeral: true });
      }

      const userChoice = interaction.customId.replace('rps_', '');
      const botChoice = validChoices[Math.floor(Math.random() * 3)];

      let result, color;
      if (userChoice === botChoice) {
        result = "🤝 It's a tie!";
        color = "#F59E0B";
      } else if (
        (userChoice === 'rock' && botChoice === 'scissors') ||
        (userChoice === 'paper' && botChoice === 'rock') ||
        (userChoice === 'scissors' && botChoice === 'paper')
      ) {
        result = "🎉 You win!";
        color = "#10B981";
      } else {
        result = "🤖 I win!";
        color = "#EF4444";
      }

      const disabledRpsRow = new ActionRowBuilder().addComponents(
        rpsRow.components.map(btn => ButtonBuilder.from(btn).setDisabled(true))
      );

      await interaction.update({
        embeds: [
          new EmbedBuilder()
            .setTitle("✊✋✌️ Rock Paper Scissors — Result")
            .setDescription(
              `${rpsEmojis[userChoice]} **You chose:** ${userChoice}\n` +
              `${rpsEmojis[botChoice]} **I chose:** ${botChoice}\n\n` +
              `**${result}**`
            )
            .setColor(color)
        ],
        components: [disabledRpsRow]
      });

      rpsCollector.stop('resolved');
    });

    rpsCollector.on('end', (collected, reason) => {
      if (reason === 'time') {
        const disabledRpsRow = new ActionRowBuilder().addComponents(
          rpsRow.components.map(btn => ButtonBuilder.from(btn).setDisabled(true))
        );
        rpsMsg.edit({
          embeds: [
            new EmbedBuilder()
              .setTitle("✊✋✌️ Rock Paper Scissors — Timed Out")
              .setDescription("⏰ Time's up! You didn't make a choice.")
              .setColor("#6B7280")
          ],
          components: [disabledRpsRow]
        }).catch(() => {});
      }
    });
    return;
  }

  if (gameName === 'hangman') {
    return message.reply("To play Hangman, please run the command: `sc hangman` directly!");
  }

  if (['ttt', 'cnt4', 'snake', 'fasttyper'].includes(gameName)) {
    return message.reply({
      embeds: [
        new EmbedBuilder()
          .setTitle("🚧 Under Maintenance")
          .setDescription("This game is currently under maintenance. Try `guessnumber` or `rps`!")
          .setColor("#6B7280")
      ]
    });
  }

  return message.reply("Unknown game! Use `sc game` to see all available games.");
}
