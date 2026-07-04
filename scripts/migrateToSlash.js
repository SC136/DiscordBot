const fs = require('fs');
const path = require('path');

const commandsDir = path.join(__dirname, '..', 'commands');

function migrateCommands() {
    let patched = 0;
    const categories = fs.readdirSync(commandsDir);
    
    for (const category of categories) {
        const categoryPath = path.join(commandsDir, category);
        if (!fs.statSync(categoryPath).isDirectory()) continue;
        
        const files = fs.readdirSync(categoryPath).filter(f => f.endsWith('.js'));
        for (const file of files) {
            const filePath = path.join(categoryPath, file);
            let content = fs.readFileSync(filePath, 'utf8');
            
            // Skip if already migrated
            if (content.includes('SlashCommandBuilder')) {
                console.log(`Skipping ${file} (already migrated)`);
                continue;
            }

            try {
                const cmd = require(filePath);
                if (!cmd.name) {
                    console.log(`Skipping ${file} (no name exported)`);
                    continue;
                }

                const name = cmd.name.toLowerCase().replace(/[^a-z0-9_-]/g, '').substring(0, 32);
                let description = cmd.description || 'No description provided';
                if (description.length > 100) description = description.substring(0, 97) + '...';

                // Ensure discord.js is imported
                if (!content.includes(`require('discord.js')`) && !content.includes(`require("discord.js")`)) {
                    content = `const { SlashCommandBuilder } = require('discord.js');\n` + content;
                } else if (!content.includes('SlashCommandBuilder')) {
                    content = content.replace(/(const|let|var)\s+\{\s*([^}]+)\s*\}\s*=\s*require\(['"]discord\.js['"]\);?/, (match, p1, p2) => {
                        return `${p1} { ${p2}, SlashCommandBuilder } = require('discord.js');`;
                    });
                    
                    // Fallback if regex missed it
                    if (!content.includes('SlashCommandBuilder')) {
                        content = `const { SlashCommandBuilder } = require('discord.js');\n` + content;
                    }
                }

                // Inject data: new SlashCommandBuilder()
                const dataString = `data: new SlashCommandBuilder()\n    .setName('${name}')\n    .setDescription('${description.replace(/'/g, "\\'")}')`;
                
                // We'll replace module.exports = { with module.exports = {\n    data: ...
                if (content.includes('module.exports = {')) {
                    content = content.replace('module.exports = {', `module.exports = {\n  ${dataString},`);
                    fs.writeFileSync(filePath, content, 'utf8');
                    console.log(`Patched ${file}`);
                    patched++;
                } else {
                    console.log(`Could not find module.exports in ${file}`);
                }
            } catch (err) {
                console.error(`Error processing ${file}:`, err);
            }
        }
    }
    console.log(`Finished migrating ${patched} commands.`);
}

migrateCommands();
