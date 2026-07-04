const { AttachmentBuilder , SlashCommandBuilder } = require('discord.js');
const { createCanvas, loadImage } = require('@napi-rs/canvas')

module.exports = {
  data: new SlashCommandBuilder()
    .setName('welcome')
    .setDescription('welcome'),
  name: 'welcome',
  aliases: ['wel'],
  description: 'welcome',
  run: async (client, message, args) => {
    const canvas = createCanvas(500, 227)
    const ctx = canvas.getContext('2d')
    const target = message.mentions.users.first() || message.author
    
    let avatar;
    try {
      avatar = await loadImage(target.displayAvatarURL({ extension: 'png', forceStatic: true }));
    } catch (err) {
      console.error("Failed to load welcome command avatar:", err.message);
      try {
        avatar = await loadImage(target.defaultAvatarURL);
      } catch (e) {
        console.error("Failed to load default avatar in welcome.js:", e.message);
      }
    }

    // Create a premium multi-stop gradient background
    const gradient = ctx.createLinearGradient(0, 0, 500, 227);
    gradient.addColorStop(0, '#0f0c1b'); // very dark purple/black
    gradient.addColorStop(0.5, '#201a30');
    gradient.addColorStop(1, '#2c1930');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, 500, 227);

    // Draw modern abstract ambient highlights
    ctx.fillStyle = 'rgba(114, 137, 218, 0.05)';
    ctx.beginPath();
    ctx.arc(500, 0, 250, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = 'rgba(0, 89, 255, 0.08)';
    ctx.beginPath();
    ctx.arc(0, 227, 180, 0, Math.PI * 2);
    ctx.fill();

    // Clean diagonal background pattern stripes
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.03)';
    ctx.lineWidth = 2;
    for (let i = -100; i < 600; i += 40) {
      ctx.beginPath();
      ctx.moveTo(i, 0);
      ctx.lineTo(i + 150, 227);
      ctx.stroke();
    }

    // Draw elegant Welcome text
    ctx.font = 'bold 36px sans-serif';
    ctx.fillStyle = '#0059FF';
    ctx.fillText('WELCOME', 30, 75);

    ctx.font = 'italic 16px sans-serif';
    ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
    ctx.fillText('to the official server!', 30, 110);

    ctx.beginPath();
    ctx.arc(406, 90, 70, 0, Math.PI * 2);
    ctx.lineWidth = 5;
    ctx.strokeStyle = 'white'
    ctx.stroke();
    ctx.closePath();
    ctx.save();
    ctx.clip();
    if (avatar) {
      ctx.drawImage(avatar, 336, 21, 140, 140);
    }
    ctx.restore();
    ctx.font = "italic 30px sans-serif";
    ctx.fillStyle = "white";
    ctx.fillText(`${target.username}`, 280, 204);

    const attachment = new AttachmentBuilder(canvas.toBuffer(), { name: 'sc-welcome.png' });
    message.channel.send({ files: [attachment] });
  }
}