const { AttachmentBuilder } = require('discord.js');
const { createCanvas, loadImage, GlobalFonts } = require('@napi-rs/canvas');
const { sendError } = require('../../utils/errorEmbed');
GlobalFonts.registerFromPath(process.cwd() + '/font/LEMONMILK-BoldItalic.otf', 'Sans-Serif');
const Levels = require('discord-xp');

module.exports = {
	name: 'canvas',
	aliases: ['can'],
	description: 'canvas',
	run: async (client, message, args) => {
		try {
			if (!process.env.MONGO_URI) {
				return message.channel.send("XP/Leveling system is currently disabled because the database is not configured.");
			}

			const canvas = createCanvas(400, 200);
			const ctx = canvas.getContext('2d');
			const target = message.mentions.users.first() || message.author;
			
			let avatar;
			try {
				avatar = await loadImage(
					target.displayAvatarURL({ extension: 'png', forceStatic: true })
				);
			} catch (err) {
				console.error("Failed to load user avatar in canvas.js:", err.message);
				try {
					avatar = await loadImage(target.defaultAvatarURL);
				} catch (e) {
					console.error("Failed to load default avatar in canvas.js:", e.message);
				}
			}

			let image;
			try {
				image = await loadImage(
					'https://media.discordapp.net/attachments/779005181760765985/809388797875847168/T3vlBLFLEJSHd6RkJU8R5InYJRyP_6fddL5v2WxzKCxAufkOFxNV-DRx9xgFV6P8t2_TmEZtZGSxzKCxAufkOFxNV-DRx9xgFV6P8t2_TmEZtZGSybv8bahG1JiMR8irnYYoLsePp.png?width=586&height=586'
				);
			} catch (err) {
				try {
					image = await loadImage(client.user.displayAvatarURL({ extension: 'png', forceStatic: true }));
				} catch (e) {
					console.error("Failed to load bot avatar fallback in canvas.js:", e.message);
				}
			}
			const flags = {
				Staff: 'Staff',
				Partner: 'Partner',
				BugHunterLevel1: 'Bug Hunter Lvl 1',
				BugHunterLevel2: 'Bug Hunter Lvl 2',
				Hypesquad: 'Hypesquad Events',
				HypeSquadOnlineHouse1: 'House Bravery',
				HypeSquadOnlineHouse2: 'House Brilliance',
				HypeSquadOnlineHouse3: 'House Balance',
				PremiumEarlySupporter: 'Early Supporter',
				VerifiedBot: 'Verified Bot',
				VerifiedDeveloper: 'Verified Developer',
				ActiveDeveloper: 'Active Developer'
			};
			const user = await Levels.fetch(target.id, message.guild.id, true);

			let invites = new Map();
			try {
				invites = await message.guild.invites.fetch();
			} catch (e) {
				console.error("Failed to fetch guild invites in canvas.js:", e.message);
			}

			let memberInvites = invites.filter(
				i => i.inviter && i.inviter.id === target.id
			);

			let index = 0;
			memberInvites.forEach(invite => (index += invite.uses));

			ctx.fillStyle = '#0059FF';
			ctx.fillRect(0, 0, 400, 200);

			if (avatar) {
				ctx.drawImage(avatar, 10, 10, 150, 150);
			}

			if (image) {
				ctx.drawImage(image, 348, 1, 50, 50);
			}

			ctx.font = 'bold 30px sans-serif';
			ctx.fillStyle = 'white';
			ctx.fillText('Profile |', 10, 190);

			//Details With A Gap Of 20

			ctx.font = 'italic 15px sans-serif';
			ctx.fillStyle = 'white';
			ctx.fillText(`Rank - ${user ? parseInt(user.position) : 'N/A'}`, 170, 26);

			ctx.font = 'italic 15px sans-serif';
			ctx.fillStyle = 'white';
			ctx.fillText(`Level - ${user ? user.level : '0'}`, 170, 46);

			ctx.font = 'italic 15px sans-serif';
			ctx.fillStyle = 'white';
			ctx.fillText(`Name - ${target.username}`, 170, 66);

			ctx.font = 'italic 15px sans-serif';
			ctx.fillStyle = 'white';
			ctx.fillText(`Tag --- ${target.discriminator}`, 170, 86);

			ctx.font = 'italic 15px sans-serif';
			ctx.fillStyle = 'white';
			ctx.fillText(`Bot --- ${target.bot}`, 170, 106);

			ctx.font = 'italic 15px sans-serif';
			ctx.fillStyle = 'white';
			ctx.fillText('ID -----', 170, 126);
			ctx.font = 'italic 14px sans-serif';
			ctx.fillStyle = 'white';
			ctx.fillText(`${target.id}`, 233, 126);

			ctx.font = 'italic 15px sans-serif';
			ctx.fillStyle = 'white';
			ctx.fillText(`Badges - `, 170, 146);
			
			const userFlags = target.flags ? target.flags.toArray() : [];
			const badgesList = userFlags.map(flag => flags[flag]).filter(Boolean).join(', ') || 'None';
			
			ctx.font = 'italic 14px sans-serif';
			ctx.fillStyle = 'white';
			ctx.fillText(badgesList, 250, 146);

			ctx.font = 'italic 15px sans-serif';
			ctx.fillStyle = 'white';
			ctx.fillText(`Balance - Coming Soon`, 170, 166);

			ctx.font = 'italic 15px sans-serif';
			ctx.fillStyle = 'white';
			ctx.fillText(`Invites - ${index}`, 170, 186);

			const attachment = new AttachmentBuilder(canvas.toBuffer(), { name: 'canvas.png' });
			message.channel.send({ files: [attachment] });
		} catch (err) {
			sendError(message, {
				title: 'Failed to generate profile canvas',
				description: 'An unexpected error occurred while generating the profile image.',
				command: 'canvas',
				error: err
			});
		}
	}
};
