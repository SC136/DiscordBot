const discord = require('discord.js');

module.exports = {
  name: 'game',
  aliases: ['games'],
  description: 'Play a bunch of games with other people',
  category: 'games',
  usage: 'game (or react to pick a game!)',
  run: async (client, message, args) => {

    // ── Direct launch if a game name is provided ──
    if (args[0]) {
      return handleGame(message, args[0].toLowerCase());
    }

    // ── Interactive Game Selector ──
    const games = [
      { emoji: "1️⃣", name: "Guess The Number", cmd: "guessnumber", status: "✅" },
      { emoji: "2️⃣", name: "Rock Paper Scissors", cmd: "rps", status: "✅" },
      { emoji: "3️⃣", name: "Hangman", cmd: "hangman", status: "✅" },
    ];

    const embed = new discord.MessageEmbed()
      .setTitle("🎮  Game Arcade  🎮")
      .setDescription(
        "**Pick a game by reacting below!**\n" +
        "You have 30 seconds to choose.\n\n" +
        games.map(g => `${g.emoji}  **${g.name}** ${g.status}`).join("\n") +
        "\n\n❌  Cancel"
      )
      .setColor("#7C3AED")
      .setFooter(
        `Requested by ${message.author.tag}`,
        message.author.displayAvatarURL({ dynamic: true })
      )
      .setTimestamp();

    const msg = await message.channel.send(embed);

    // Add all game reactions + cancel
    for (const g of games) {
      await msg.react(g.emoji);
    }
    await msg.react("❌");

    const validEmojis = games.map(g => g.emoji).concat("❌");
    const filter = (reaction, user) =>
      validEmojis.includes(reaction.emoji.name) &&
      user.id === message.author.id;

    const collector = msg.createReactionCollector(filter, { max: 1, time: 30000 });

    collector.on("collect", async (reaction) => {
      try { await msg.reactions.removeAll(); } catch (e) { /* missing perms */ }

      if (reaction.emoji.name === "❌") {
        return msg.edit(
          new discord.MessageEmbed()
            .setTitle("🎮  Game Arcade")
            .setDescription("Game selection cancelled.")
            .setColor("#EF4444")
        );
      }

      const selected = games.find(g => g.emoji === reaction.emoji.name);
      if (!selected) return;

      await msg.edit(
        new discord.MessageEmbed()
          .setTitle(`🎮  Starting: ${selected.name}`)
          .setDescription("Get ready...")
          .setColor("#10B981")
      );

      return handleGame(message, selected.cmd);
    });

    collector.on("end", (collected) => {
      if (collected.size === 0) {
        try { msg.reactions.removeAll(); } catch (e) { /* missing perms */ }
        msg.edit(
          new discord.MessageEmbed()
            .setTitle("🎮  Game Arcade")
            .setDescription("⏰ Timed out! No game was selected.")
            .setColor("#6B7280")
        );
      }
    });
  }
};

// ── Game Logic ──
async function handleGame(message, gameName) {
  if (gameName === 'guessnumber' || gameName === 'guessthenumber') {
    const randomNumber = Math.floor(Math.random() * 10) + 1;
    message.channel.send(
      new discord.MessageEmbed()
        .setTitle("🔢 Guess The Number!")
        .setDescription("I'm thinking of a number between **1** and **10**.\nYou have **30 seconds** to guess it!")
        .setColor("#3B82F6")
    );

    const filter = res => res.author.id === message.author.id && !isNaN(res.content);
    try {
      const collected = await message.channel.awaitMessages(filter, { max: 1, time: 30000, errors: ['time'] });
      const guess = parseInt(collected.first().content);
      if (guess === randomNumber) {
        return message.reply(
          new discord.MessageEmbed()
            .setTitle("🎉 Correct!")
            .setDescription(`The number was indeed **${randomNumber}**!`)
            .setColor("#10B981")
        );
      } else {
        return message.reply(
          new discord.MessageEmbed()
            .setTitle("❌ Wrong!")
            .setDescription(`The number was **${randomNumber}**. Better luck next time!`)
            .setColor("#EF4444")
        );
      }
    } catch (err) {
      return message.reply(`⏰ Time's up! The number was **${randomNumber}**.`);
    }
  }

  if (gameName === 'rps') {
    message.channel.send(
      new discord.MessageEmbed()
        .setTitle("✊✋✌️ Rock Paper Scissors!")
        .setDescription("Reply with `rock`, `paper`, or `scissors` to play!\nYou have **30 seconds**.")
        .setColor("#F59E0B")
    );

    const validChoices = ['rock', 'paper', 'scissors'];
    const emojiMap = { rock: "🪨", paper: "📄", scissors: "✂️" };
    const filter = res => res.author.id === message.author.id && validChoices.includes(res.content.toLowerCase());

    try {
      const collected = await message.channel.awaitMessages(filter, { max: 1, time: 30000, errors: ['time'] });
      const userChoice = collected.first().content.toLowerCase();
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

      return message.reply(
        new discord.MessageEmbed()
          .setTitle("✊✋✌️ Rock Paper Scissors — Result")
          .setDescription(
            `${emojiMap[userChoice]} **You:** ${userChoice}\n` +
            `${emojiMap[botChoice]} **Me:** ${botChoice}\n\n` +
            `**${result}**`
          )
          .setColor(color)
      );
    } catch (err) {
      return message.reply("⏰ Time's up! You didn't make a choice.");
    }
  }

  if (gameName === 'hangman') {
    return message.reply("To play Hangman, please run the command: `sc hangman` directly!");
  }

  if (['ttt', 'cnt4', 'snake', 'fasttyper'].includes(gameName)) {
    return message.reply(
      new discord.MessageEmbed()
        .setTitle("🚧 Under Maintenance")
        .setDescription("This game is currently under maintenance. Try `guessnumber` or `rps`!")
        .setColor("#6B7280")
    );
  }

  return message.reply("Unknown game! Use `sc game` to see all available games.");
}
