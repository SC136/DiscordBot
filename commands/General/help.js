const { EmbedBuilder, ActionRowBuilder, StringSelectMenuBuilder, ComponentType } = require("discord.js");
const { readdirSync } = require("fs");
const prefix = require("../../config.json").prefix;

module.exports = {
  name: "help",
  aliases: ['h'],
  description: "Shows all available bot commands with interactive navigation.",
  run: async (client, message, args) => {
    const roleColor =
      message.guild.members.me.displayHexColor === "#000000"
        ? "#ffffff"
        : message.guild.members.me.displayHexColor;

    // ── If a specific command is requested ──
    if (args[0]) {
      const command =
        client.commands.get(args[0].toLowerCase()) ||
        client.commands.find(
          (c) => c.aliases && c.aliases.includes(args[0].toLowerCase())
        );

      if (!command) {
        const embed = new EmbedBuilder()
          .setTitle(`Invalid command! Use \`${prefix}help\` for all of my commands!`)
          .setColor("FF0000");
        return message.channel.send({ embeds: [embed] });
      }

      const embed = new EmbedBuilder()
        .setTitle("Command Details:")
        .addFields([
          { name: "PREFIX:", value: `\`${prefix}\`` },
          { name: "COMMAND:", value: command.name ? `\`${command.name}\`` : "No name for this command." },
          { name: "ALIASES:", value: command.aliases ? `\`${command.aliases.join("` `")}\`` : "No aliases for this command." },
          { name: "USAGE:", value: command.usage ? `\`${prefix}${command.name} ${command.usage}\`` : `\`${prefix}${command.name}\`` },
          { name: "DESCRIPTION:", value: command.description ? command.description : "No description for this command." }
        ])
        .setFooter({
          text: `Requested by ${message.author.tag}`,
          iconURL: message.author.displayAvatarURL({ forceStatic: false })
        })
        .setTimestamp()
        .setColor(roleColor);
      return message.channel.send({ embeds: [embed] });
    }

    // ── Load all categories and commands ──
    const categories = {};
    const dirList = readdirSync("./commands/");

    dirList.forEach((dir) => {
      const commands = readdirSync(`./commands/${dir}/`).filter((file) =>
        file.endsWith(".js")
      );
      const categoryName = dir.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
      categories[categoryName] = [];
      
      commands.forEach((commandFile) => {
        let file = require(`../../commands/${dir}/${commandFile}`);
        if (file.name) {
          categories[categoryName].push({
            name: file.name,
            description: file.description || "No description.",
            aliases: file.aliases || []
          });
        }
      });
    });

    // ── Build Main Home Embed ──
    const buildHomeEmbed = () => {
      const homeEmbed = new EmbedBuilder()
        .setTitle("📬 SC SmartTech — Command Directory")
        .setDescription(
          "Welcome to the help menu! Use the dropdown menu below to browse commands by category.\n\n" +
          "**📁 Categories available:**\n" +
          Object.keys(categories).map(cat => `• **${cat}** (${categories[cat].length} commands)`).join("\n")
        )
        .setColor(roleColor)
        .setThumbnail(client.user.displayAvatarURL())
        .setFooter({
          text: `Requested by ${message.author.tag}`,
          iconURL: message.author.displayAvatarURL({ forceStatic: false })
        })
        .setTimestamp();
      return homeEmbed;
    };

    // ── Create Select Menu Options ──
    const menuOptions = [
      {
        label: 'Home Directory',
        description: 'Show category list',
        value: 'home_dir',
        emoji: '🏠'
      }
    ];

    Object.keys(categories).forEach(cat => {
      menuOptions.push({
        label: cat,
        description: `Show all commands in ${cat}`,
        value: `cat_${cat.toLowerCase().replace(/\s+/g, '')}`,
        emoji: '📁'
      });
    });

    const selectMenu = new StringSelectMenuBuilder()
      .setCustomId('help_select')
      .setPlaceholder('Select a category...')
      .addOptions(menuOptions);

    const row = new ActionRowBuilder().addComponents(selectMenu);

    const helpMsg = await message.channel.send({
      embeds: [buildHomeEmbed()],
      components: [row]
    });

    const collector = helpMsg.createMessageComponentCollector({
      componentType: ComponentType.StringSelect,
      time: 60000
    });

    collector.on('collect', async (interaction) => {
      if (interaction.user.id !== message.author.id) {
        return interaction.reply({ content: "Only the user who requested this help menu can interact with it!", ephemeral: true });
      }

      await interaction.deferUpdate();

      const selectedValue = interaction.values[0];

      if (selectedValue === 'home_dir') {
        await helpMsg.edit({
          embeds: [buildHomeEmbed()],
          components: [row]
        });
      } else {
        // Find the matched category
        const matchedCategoryName = Object.keys(categories).find(
          cat => `cat_${cat.toLowerCase().replace(/\s+/g, '')}` === selectedValue
        );

        if (matchedCategoryName) {
          const cmds = categories[matchedCategoryName];
          const catEmbed = new EmbedBuilder()
            .setTitle(`📁 Category: ${matchedCategoryName}`)
            .setDescription(
              cmds.map(cmd => `• \`${prefix}${cmd.name}\` — *${cmd.description}*` + 
                (cmd.aliases.length ? ` (aliases: \`${cmd.aliases.join(', ')}\`)` : '')
              ).join('\n') || 'No commands found.'
            )
            .setColor(roleColor)
            .setFooter({
              text: `Category: ${matchedCategoryName}  •  Requested by ${message.author.tag}`,
              iconURL: message.author.displayAvatarURL({ forceStatic: false })
            })
            .setTimestamp();

          await helpMsg.edit({
            embeds: [catEmbed],
            components: [row]
          });
        }
      }
    });

    collector.on('end', () => {
      // Disable the select menu component when timed out
      const disabledRow = new ActionRowBuilder().addComponents(
        StringSelectMenuBuilder.from(selectMenu).setDisabled(true)
      );
      helpMsg.edit({ components: [disabledRow] }).catch(() => {});
    });
  }
};
