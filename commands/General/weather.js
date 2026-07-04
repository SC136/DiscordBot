const { EmbedBuilder } = require('discord.js');
const { sendError } = require('../../utils/errorEmbed');

const WMO = {
  0: ['☀️', 'Clear sky'],
  1: ['🌤️', 'Mostly clear'],
  2: ['⛅', 'Partly cloudy'],
  3: ['☁️', 'Overcast'],
  45: ['🌫️', 'Foggy'],
  48: ['🌫️', 'Rime fog'],
  51: ['🌦️', 'Light drizzle'],
  53: ['🌦️', 'Drizzle'],
  55: ['🌧️', 'Heavy drizzle'],
  61: ['🌧️', 'Light rain'],
  63: ['🌧️', 'Rain'],
  65: ['🌧️', 'Heavy rain'],
  71: ['🌨️', 'Light snow'],
  73: ['🌨️', 'Snow'],
  75: ['❄️', 'Heavy snow'],
  80: ['🌦️', 'Rain showers'],
  81: ['🌧️', 'Heavy showers'],
  82: ['⛈️', 'Violent rain'],
  95: ['⛈️', 'Thunderstorm'],
  96: ['⛈️', 'T-storm w/ hail'],
  99: ['⛈️', 'Severe t-storm'],
};

module.exports = {
  name: 'weather',
  aliases: ['temp', 'forecast', 'wxtemp'],
  description: 'View current weather for a city or default location.',
  run: async (client, message, args) => {
    try {
      message.channel.sendTyping().catch(() => {});

      let lat = 19.4654;
      let lon = 72.8086;
      let locationName = "Virar, India";
      let timezone = "Asia/Kolkata";

      // If city name is specified, lookup coordinates using Geocoding API
      if (args.length > 0) {
        const query = args.join(' ');
        const geocodeRes = await fetch(`https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(query)}&count=1&language=en&format=json`);
        
        if (!geocodeRes.ok) {
          return message.channel.send({
            embeds: [
              new EmbedBuilder()
                .setDescription("❌ *Failed to connect to the geocoding service.*")
                .setColor("#E85D5D")
            ]
          });
        }

        const geoData = await geocodeRes.json();
        
        if (!geoData.results || geoData.results.length === 0) {
          return message.channel.send({
            embeds: [
              new EmbedBuilder()
                .setDescription(`❌ *Could not find any location matching **"${query}"**.*`)
                .setColor("#E85D5D")
            ]
          });
        }

        const loc = geoData.results[0];
        lat = loc.latitude;
        lon = loc.longitude;
        locationName = `${loc.name}, ${loc.country || loc.country_code}`;
        timezone = loc.timezone || "auto";
      }

      // Fetch weather details
      const weatherUrl = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,apparent_temperature,weathercode,windspeed_10m,relative_humidity_2m,is_day&timezone=${encodeURIComponent(timezone)}`;
      const response = await fetch(weatherUrl);

      if (!response.ok) {
        return message.channel.send({
          embeds: [
            new EmbedBuilder()
              .setDescription("❌ *Failed to fetch weather forecast.*")
              .setColor("#E85D5D")
          ]
        });
      }

      const data = await response.json();

      if (!data || !data.current) {
        return message.channel.send({
          embeds: [
            new EmbedBuilder()
              .setDescription("❌ *Weather data unavailable for this location.*")
              .setColor("#E85D5D")
          ]
        });
      }

      const c = data.current;
      const code = c.weathercode;
      const [emoji, desc] = WMO[code] || ['🌡️', 'Unknown'];

      const temp = Math.round(c.temperature_2m);
      const feels = Math.round(c.apparent_temperature);
      const humidity = c.relative_humidity_2m;
      const wind = Math.round(c.windspeed_10m);

      // Choose a color based on day/night status
      const embedColor = c.is_day === 1 ? '#3498db' : '#2c3e50';

      const embed = new EmbedBuilder()
        .setTitle(`🌤️ Weather in ${locationName}`)
        .setDescription(`${emoji} **${desc}**`)
        .addFields([
          { name: "Temperature", value: `\`${temp}°C\``, inline: true },
          { name: "Feels Like", value: `\`${feels}°C\``, inline: true },
          { name: "Humidity", value: `\`${humidity}%\``, inline: true },
          { name: "Wind Speed", value: `\`${wind} km/h\``, inline: true }
        ])
        .setColor(embedColor)
        .setFooter({ text: `Coordinates: ${lat.toFixed(4)}, ${lon.toFixed(4)} • Open-Meteo` })
        .setTimestamp();

      message.channel.send({ embeds: [embed] });
    } catch (err) {
      sendError(message, {
        title: 'Failed to fetch weather',
        description: 'An error occurred while fetching the weather forecast. Please check your query or try again later.',
        command: 'weather',
        error: err
      });
    }
  }
};
