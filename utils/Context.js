const { CommandInteraction } = require('discord.js');

/**
 * Wraps a CommandInteraction to mock a Message object.
 * This allows reusing prefix command logic (run: async (client, message, args))
 * directly with slash commands!
 */
class Context {
    constructor(interaction) {
        this.interaction = interaction;
        this.client = interaction.client;
        this.id = interaction.id;
        this.author = interaction.user;
        this.member = interaction.member;
        this.channel = interaction.channel;
        this.guild = interaction.guild;
        this.createdAt = interaction.createdAt;
        this.createdTimestamp = interaction.createdTimestamp;
        // Mock message content as empty for slash commands
        this.content = '';
        this.mentions = {
            users: interaction.options?.resolved?.users || new Map(),
            roles: interaction.options?.resolved?.roles || new Map(),
            channels: interaction.options?.resolved?.channels || new Map(),
            members: interaction.options?.resolved?.members || new Map()
        };
        
        // Add a fake channel send typing method since many commands use message.channel.sendTyping()
        this.channel.sendTyping = async () => {
            if (!this.interaction.deferred && !this.interaction.replied) {
                await this.interaction.deferReply().catch(() => {});
            }
        };
    }

    /**
     * Maps message.reply() to interaction.reply()
     * Automatically handles deferred and already replied states.
     */
    async reply(options) {
        if (typeof options === 'string') {
            options = { content: options };
        }
        options.fetchReply = true;
        
        if (this.interaction.deferred || this.interaction.replied) {
            return await this.interaction.followUp(options);
        } else {
            return await this.interaction.reply(options);
        }
    }

    // Mock deleting a message
    async delete() {
        if (this.interaction.replied) {
            return await this.interaction.deleteReply().catch(() => {});
        }
    }
}

module.exports = Context;
