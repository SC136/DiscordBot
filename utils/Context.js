const { CommandInteraction, Collection } = require('discord.js');

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

        // Helper to ensure Collection instance with .first() support
        const toCollection = (val) => {
            if (val instanceof Collection) return val;
            if (val && typeof val === 'object') {
                return new Collection(val instanceof Map ? val.entries() : Object.entries(val));
            }
            return new Collection();
        };

        this.mentions = {
            users: toCollection(interaction.options?.resolved?.users),
            roles: toCollection(interaction.options?.resolved?.roles),
            channels: toCollection(interaction.options?.resolved?.channels),
            members: toCollection(interaction.options?.resolved?.members)
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
            return await this.interaction.followUp(options).catch(() => this.interaction.editReply(options));
        } else if (this.interaction.deferred) {
            return await this.interaction.editReply(options).catch(() => this.interaction.followUp(options));
        } else {
            return await this.interaction.reply(options).catch(async (err) => {
                if (err.code === 40060 || err.code === 'InteractionAlreadyReplied') {
                    return await this.interaction.followUp(options).catch(() => this.interaction.editReply(options));
                }
                throw err;
            });
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
