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
        
        // Shallow copy channel to avoid mutating client cache
        this.channel = Object.create(interaction.channel);
        
        const originalSend = interaction.channel.send.bind(interaction.channel);
        this.channel.send = async (options) => {
            if (!this.interaction.deferred && !this.interaction.replied) {
                return await this.reply(options);
            } else {
                return await this.reply(options).catch(() => originalSend(options));
            }
        };

        this.channel.sendTyping = async () => {
            if (!this.interaction.deferred && !this.interaction.replied) {
                await this.interaction.deferReply().catch(() => {});
            }
        };
    }

    /**
     * Maps message.reply() to interaction.reply()/editReply()/followUp()
     * Automatically handles deferred and already replied states.
     */
    async reply(options) {
        if (typeof options === 'string') {
            options = { content: options };
        }
        options.fetchReply = true;
        
        if (this.interaction.replied) {
            return await this.interaction.followUp(options);
        } else if (this.interaction.deferred) {
            return await this.interaction.editReply(options);
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
