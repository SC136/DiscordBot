const Discord = require('discord.js');
const fetch = require('node-fetch');

const typeColors = {
  normal: '#A8A77A',
  fire: '#EE8130',
  water: '#6390F0',
  electric: '#F7D02C',
  grass: '#7AC74C',
  ice: '#96D9D6',
  fighting: '#C22E28',
  poison: '#A33EA1',
  ground: '#E2BF65',
  flying: '#A98FF3',
  psychic: '#F95587',
  bug: '#A6B91A',
  rock: '#B8A038',
  ghost: '#705898',
  dragon: '#6F35FC',
  dark: '#705746',
  steel: '#B7B7CE',
  fairy: '#D685AD'
};

module.exports = {
  name: 'pokesearch',
  aliases: ['searchpokemon', 'pokemonsearch', 'pokemoninfo', 'pokeinfo'],
  description: 'Search for a Pokémon and view its detailed information.',
  run: async (client, message, args) => {
    if (!args[0]) {
      return message.channel.send(
        new Discord.MessageEmbed()
          .setDescription("❌ *Please specify a Pokémon name or ID to search.*")
          .setColor("#E85D5D")
      );
    }

    const query = args[0].toLowerCase().trim();

    try {
      message.channel.startTyping();

      const res = await fetch(`https://pokeapi.co/api/v2/pokemon/${query}`);
      
      if (!res.ok) {
        message.channel.stopTyping();
        return message.channel.send(
          new Discord.MessageEmbed()
            .setDescription(`❌ *Could not find a Pokémon named **"${args[0]}"**.*`)
            .setColor("#E85D5D")
        );
      }

      const pokemon = await res.json();
      message.channel.stopTyping();

      const capitalize = (str) => str.split('-').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');

      const officialArtwork = pokemon.sprites.other && pokemon.sprites.other['official-artwork'] && pokemon.sprites.other['official-artwork'].front_default;
      const sprite = officialArtwork || pokemon.sprites.front_default;

      if (!sprite) {
        return message.channel.send(
          new Discord.MessageEmbed()
            .setDescription("❌ *Could not find artwork for this Pokémon!*")
            .setColor("#E85D5D")
        );
      }

      // Formatting details
      const idStr = `#${String(pokemon.id).padStart(3, '0')}`;
      const displayName = `${capitalize(pokemon.name)} ${idStr}`;

      // Types list
      const types = pokemon.types.map(t => capitalize(t.type.name)).join(', ');
      const primaryType = pokemon.types[0].type.name;
      const embedColor = typeColors[primaryType] || client.color;

      // Abilities
      const abilities = pokemon.abilities.map(a => {
        const name = capitalize(a.ability.name);
        return a.is_hidden ? `${name} *(Hidden)*` : name;
      }).join(', ');

      // Dimensions (height decimeters -> meters, weight hectograms -> kg)
      const height = `${(pokemon.height / 10).toFixed(1)} m`;
      const weight = `${(pokemon.weight / 10).toFixed(1)} kg`;

      // Stats
      let totalStats = 0;
      const statsMap = {};
      pokemon.stats.forEach(s => {
        const statName = s.stat.name;
        const baseStat = s.base_stat;
        totalStats += baseStat;

        let displayName = "";
        if (statName === 'hp') displayName = 'HP';
        else if (statName === 'attack') displayName = 'Attack';
        else if (statName === 'defense') displayName = 'Defense';
        else if (statName === 'special-attack') displayName = 'Sp. Atk';
        else if (statName === 'special-defense') displayName = 'Sp. Def';
        else if (statName === 'speed') displayName = 'Speed';
        else displayName = capitalize(statName);

        statsMap[displayName] = baseStat;
      });

      const statsString = Object.entries(statsMap)
        .map(([name, val]) => `**${name}:** \`${val}\``)
        .join('\n');

      const embed = new Discord.MessageEmbed()
        .setTitle(displayName)
        .setThumbnail(sprite)
        .addField("Type(s)", `\`${types}\``, true)
        .addField("Abilities", `\`${abilities}\``, true)
        .addField("Height / Weight", `\`${height} / ${weight}\``, true)
        .addField("Base Stats", `${statsString}\n**Total:** \`${totalStats}\``)
        .setColor(embedColor)
        .setFooter(`Search queries powered by PokeAPI`)
        .setTimestamp();

      message.channel.send(embed);
    } catch (err) {
      console.error("Error in pokesearch command:", err);
      message.channel.stopTyping();
      message.channel.send("❌ *An error occurred while fetching Pokémon info!*");
    }
  }
};
