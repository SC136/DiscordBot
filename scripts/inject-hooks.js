const fs = require('fs');
const path = require('path');

const indexFile = path.join(__dirname, '..', 'index.js');
let content = fs.readFileSync(indexFile, 'utf8');

// 1. Hook messageCreate for live feed
if (!content.includes('client.dashEvents?.emit(\'dashboard_event\', { type: \'message\'')) {
    content = content.replace("client.on('messageCreate', async message => {", 
`client.on('messageCreate', async message => {
  if (!message.author.bot && client.dashEvents) {
    client.dashEvents.emit('dashboard_event', {
      type: 'message',
      author: message.author.username,
      content: message.content,
      channel: message.channel.name || 'DM'
    });
  }`);
}

// 2. Hook guildMemberAdd for live feed and config.welcome
if (!content.includes('client.dashEvents?.emit(\'dashboard_event\', { type: \'join\'')) {
    content = content.replace("client.on('guildMemberAdd', async member => {", 
`client.on('guildMemberAdd', async member => {
  if (client.dashEvents) {
    client.dashEvents.emit('dashboard_event', {
      type: 'join',
      user: member.user.username
    });
  }`);
}

// 3. Update interactionCreate for disabledCommands
if (content.includes("client.on('interactionCreate', async interaction => {")) {
    if (!content.includes("if (config.disabledCommands && config.disabledCommands.includes(")) {
        content = content.replace("const command = client.slashCommands.get(interaction.commandName);",
`const command = client.slashCommands.get(interaction.commandName);
    if (command && config.disabledCommands && config.disabledCommands.includes(command.name)) {
        return interaction.reply({ content: '❌ This command is currently disabled by administrators.', ephemeral: true });
    }`);
    }
}

// 4. Hook Voice State Update for live feed
if (!content.includes("client.dashEvents?.emit('dashboard_event', { type: 'voice'")) {
    content = content.replace("client.on('voiceStateUpdate', async (oldState, newState) => {",
`client.on('voiceStateUpdate', async (oldState, newState) => {
  if (client.dashEvents && oldState.channelId !== newState.channelId) {
    if (newState.channelId) {
        client.dashEvents.emit('dashboard_event', { type: 'voice', action: 'joined', user: newState.member.user.username, channel: newState.channel.name });
    } else {
        client.dashEvents.emit('dashboard_event', { type: 'voice', action: 'left', user: oldState.member.user.username, channel: oldState.channel.name });
    }
  }`);
}

// 5. Hook guildMemberRemove for live feed
if (!content.includes("client.on('guildMemberRemove', async member => {")) {
    content = content + `\nclient.on('guildMemberRemove', async member => {
  if (client.dashEvents) {
    client.dashEvents.emit('dashboard_event', { type: 'leave', user: member.user.username });
  }
});\n`;
} else if (!content.includes("client.dashEvents?.emit('dashboard_event', { type: 'leave'")) {
     content = content.replace("client.on('guildMemberRemove', async member => {", 
`client.on('guildMemberRemove', async member => {
  if (client.dashEvents) {
    client.dashEvents.emit('dashboard_event', {
      type: 'leave',
      user: member.user.username
    });
  }`);
}

// 6. Rewrite the Welcome logic to respect config.welcome
// This requires finding the welcome embed code and replacing it, but that's messy via regex.
// Instead we'll just prepend a check inside `client.on('guildMemberAdd')` that returns early if disabled,
// and override the hardcoded channel with the configured one.
if (!content.includes("if (config.welcome && !config.welcome.enabled) return;")) {
    content = content.replace("client.on('guildMemberAdd', async member => {\n  if (member.user.bot) return;",
`client.on('guildMemberAdd', async member => {
  if (member.user.bot) return;
  if (config.welcome && !config.welcome.enabled) return; // Hooked via dashboard config`);
  
    // Replace hardcoded channel ID in welcome logic
    // We'll replace all '714858330295631965' with (config.welcome ? config.welcome.channel : '714858330295631965')
    content = content.replace(/'714858330295631965'/g, "(config.welcome ? config.welcome.channel : '714858330295631965')");
    
    // Also patch the welcome message if possible. For simplicity we'll just leave the image intact but maybe patch the text if needed.
}

fs.writeFileSync(indexFile, content, 'utf8');
console.log('Hooks injected successfully.');
