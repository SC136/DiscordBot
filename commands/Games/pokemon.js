const { EmbedBuilder } = require('discord.js');
const fetch = require('node-fetch');
const Levels = require('discord-xp');

module.exports = {
  name: 'pokemon',
  aliases: ['guesspokemon', 'whosthatpokemon', 'wtp'],
  description: 'Play a game of Guess the Pokémon!',
  run: async (client, message, args) => {
    try {
      // Send a typing indicator and a loading message
      message.channel.sendTyping().catch(() => {});
      const loadingEmbed = new EmbedBuilder()
        .setDescription("🔍 *Searching the tall grass for a wild Pokémon...*")
        .setColor(client.color);
      
      const statusMsg = await message.channel.send({ embeds: [loadingEmbed] });

      // Generate a random Pokémon ID (Gen 1-3 is 1-386)
      const pokemonId = Math.floor(Math.random() * 386) + 1;
      const res = await fetch(`https://pokeapi.co/api/v2/pokemon/${pokemonId}`);
      
      if (!res.ok) {
        return statusMsg.edit({
          embeds: [
            new EmbedBuilder()
              .setDescription("❌ *The wild Pokémon ran away! (API Error)*")
              .setColor("#E85D5D")
          ]
        });
      }

      const pokemon = await res.json();

      const officialArtwork = pokemon.sprites.other && pokemon.sprites.other['official-artwork'] && pokemon.sprites.other['official-artwork'].front_default;
      const sprite = officialArtwork || pokemon.sprites.front_default;

      if (!sprite) {
        return statusMsg.edit({
          embeds: [
            new EmbedBuilder()
              .setDescription("❌ *Could not find artwork for this Pokémon!*")
              .setColor("#E85D5D")
          ]
        });
      }

      const capitalize = (str) => str.split('-').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
      const cleanName = (str) => str.toLowerCase().replace(/[^a-z0-9]/g, '');

      const pokemonNameClean = cleanName(pokemon.name);
      const pokemonNameDisplay = capitalize(pokemon.name);

      const typeList = pokemon.types.map(t => capitalize(t.type.name)).join(', ');

      const gameEmbed = new EmbedBuilder()
        .setTitle("🎮 Who's That Pokémon?")
        .setDescription("Type your guess in the chat! You have **20 seconds**.\n\n*Hint: Type is* **" + typeList + "**")
        .setImage(sprite)
        .setColor(client.color)
        .setFooter({ text: "Guess correctly to earn +50 XP! • Type 'cancel' to stop." })
        .setTimestamp();

      await statusMsg.delete();
      const gameMsg = await message.channel.send({ embeds: [gameEmbed] });

      const filter = m => !m.author.bot && m.channel.id === message.channel.id;
      const collector = message.channel.createMessageCollector({ filter, time: 20000 });

      let winner = null;

      collector.on('collect', m => {
        const guess = m.content.trim();
        
        if (guess.toLowerCase() === 'cancel' && m.author.id === message.author.id) {
          collector.stop('cancelled');
          return;
        }

        if (cleanName(guess) === pokemonNameClean) {
          winner = m.author;
          collector.stop('correct');
        }
      });

      collector.on('end', async (collected, reason) => {
        if (reason === 'correct' && winner) {
          let xpMsg = "";
          // Add XP if Mongo is configured
          if (process.env.MONGO_URI) {
            try {
              await Levels.appendXp(winner.id, message.guild.id, 50);
              xpMsg = "\nThey have earned **+50 XP**! 🏆";
            } catch (err) {
              console.error("Error adding XP to winner:", err);
            }
          }

          const winEmbed = new EmbedBuilder()
            .setTitle("🎉 Correct! It's " + pokemonNameDisplay + "!")
            .setDescription(`**${winner.tag}** guessed it right in time!${xpMsg}`)
            .setImage(sprite)
            .setColor("#6BCB77")
            .setTimestamp();

          return message.channel.send({ embeds: [winEmbed] });
        } else if (reason === 'cancelled') {
          const cancelEmbed = new EmbedBuilder()
            .setTitle("🛑 Game Cancelled")
            .setDescription(`The game was cancelled by the host. The Pokémon was **${pokemonNameDisplay}**.`)
            .setImage(sprite)
            .setColor(client.color)
            .setTimestamp();

          return message.channel.send({ embeds: [cancelEmbed] });
        } else {
          const failEmbed = new EmbedBuilder()
            .setTitle("⏰ Time's Up!")
            .setDescription(`No one guessed it in time! The Pokémon was **${pokemonNameDisplay}**.`)
            .setImage(sprite)
            .setColor("#E85D5D")
            .setTimestamp();

          return message.channel.send({ embeds: [failEmbed] });
        }
      });
    } catch (err) {
      console.error("Error in pokemon command:", err);
      message.channel.send("❌ *An error occurred while starting the game!*");
    }
  }
}
