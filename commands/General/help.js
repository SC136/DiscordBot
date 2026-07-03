const { EmbedBuilder } = require("discord.js");
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
          .setTitle(`Invalid command! Use \`${prefix} help\` for all of my commands!`)
          .setColor("FF0000");
        return message.channel.send({ embeds: [embed] });
      }

      const embed = new EmbedBuilder()
        .setTitle("Command Details:")
        .addFields([
          { name: "PREFIX:", value: `\`${prefix}\`` },
          { name: "COMMAND:", value: command.name ? `\`${command.name}\`` : "No name for this command." },
          { name: "ALIASES:", value: command.aliases ? `\`${command.aliases.join("` `")}\`` : "No aliases for this command." },
          { name: "USAGE:", value: command.usage ? `\`${prefix} ${command.name} ${command.usage}\`` : `\`${prefix} ${command.name}\`` },
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

    // ── Build all commands list ──
    const allCommands = [];
    readdirSync("./commands/").forEach((dir) => {
      const commands = readdirSync(`./commands/${dir}/`).filter((file) =>
        file.endsWith(".js")
      );
      commands.forEach((command) => {
        let file = require(`../../commands/${dir}/${command}`);
        if (file.name) {
          allCommands.push({
            name: file.name,
            description: file.description || "No description.",
            category: dir
          });
        }
      });
    });

    // Group commands by category
    const categories = {};
    allCommands.forEach(cmd => {
      const catName = cmd.category.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
      if (!categories[catName]) {
        categories[catName] = [];
      }
      categories[catName].push(cmd);
    });

    let descriptionText = `Use \`${prefix}help <command>\` for details on a specific command.\n\n`;
    for (const [catName, cmds] of Object.entries(categories)) {
      descriptionText += `**📁 Category: ${catName}**\n`;
      descriptionText += cmds.map(cmd => `• \`${prefix}${cmd.name}\` — *${cmd.description}*`).join("\n") + "\n\n";
    }

    const embed = new EmbedBuilder()
      .setTitle("📬 SC SmartTech — Command List")
      .setColor(roleColor)
      .setDescription(descriptionText.trim())
      .setThumbnail(client.user.displayAvatarURL())
      .setFooter({
        text: `Total Commands: ${allCommands.length}  •  Requested by ${message.author.tag}`,
        iconURL: message.author.displayAvatarURL({ forceStatic: false })
      })
      .setTimestamp();

    return message.channel.send({ embeds: [embed] });
  },
};

