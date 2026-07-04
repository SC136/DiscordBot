const { EmbedBuilder } = require('discord.js');

/**
 * Sends a consistent, themed error embed to a Discord channel.
 *
 * @param {import('discord.js').Message} message  — the triggering message (used for channel + author context)
 * @param {object}  opts
 * @param {string}  opts.title       — short error headline (default: "Something went wrong")
 * @param {string}  [opts.description] — optional extra context shown to the user
 * @param {string}  [opts.command]   — the command name, shown in the footer
 * @param {Error}   [opts.error]     — the raw Error object (logged to console, never shown to users)
 */
function sendError(message, { title = 'Something went wrong', description, command, error } = {}) {
  // Always log the real error server-side
  if (error) {
    console.error(`[${command || 'unknown'}] Error:`, error);
  }

  const embed = new EmbedBuilder()
    .setColor(0xED4245) // Discord's standard red
    .setTitle(`❌  ${title}`)
    .setTimestamp();

  if (description) {
    embed.setDescription(description);
  }

  if (command) {
    embed.setFooter({ text: `Command: ${command}` });
  }

  return message.channel.send({ embeds: [embed] }).catch(() => {
    // Last resort — if even the embed fails (e.g. missing channel perms), silently give up
  });
}

/**
 * Convenience: sends a "missing argument" error.
 */
function sendMissingArgs(message, { command, usage, example } = {}) {
  const lines = [];
  if (usage)   lines.push(`**Usage:** \`${usage}\``);
  if (example) lines.push(`**Example:** \`${example}\``);

  return sendError(message, {
    title: 'Missing Arguments',
    description: lines.length ? lines.join('\n') : 'Please provide the required arguments.',
    command
  });
}

/**
 * Convenience: sends a "no permission" error.
 */
function sendNoPermission(message, { command, permission } = {}) {
  return sendError(message, {
    title: 'Permission Denied',
    description: permission
      ? `You need the **${permission}** permission to use this command.`
      : 'You do not have permission to use this command.',
    command
  });
}

module.exports = { sendError, sendMissingArgs, sendNoPermission };
