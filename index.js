const { Client, GatewayIntentBits, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, PermissionsBitField } = require('discord.js');
const { token, logChannelId, guildId, specificRoleId, categoryId, transcriptChannelId, robuxCategoryId, robuxTranscriptChannelId, vbucksCategoryId, vbucksTranscriptChannelId, codCategoryId, codTranscriptChannelId, adminRoleId, welcomeChannelId } = require('./config.json');
const { REST, Routes } = require('discord.js');
const { SlashCommandBuilder } = require('@discordjs/builders');
const { createLogger, transports, format } = require('winston');

// Logger setup
const logger = createLogger({
    level: 'info',
    format: format.combine(
        format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
        format.printf(({ timestamp, level, message }) => `${timestamp} [${level.toUpperCase()}]: ${message}`)
    ),
    transports: [
        new transports.Console(),
        new transports.File({ filename: 'bot.log' })
    ]
});

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.GuildMessageReactions,
        GatewayIntentBits.GuildMembers
    ]
});

const commands = [
    new SlashCommandBuilder().setName('send-ticket-message').setDescription('Send a message with a button to create a ticket'),
    new SlashCommandBuilder().setName('robux-ticket-message').setDescription('Send a detailed message with a button to create a Robux ticket'),
    new SlashCommandBuilder().setName('vbucks-ticket-message').setDescription('Send a detailed message with a button to create a V-Bucks ticket'),
    new SlashCommandBuilder().setName('cod-ticket-message').setDescription('Send a detailed message with a button to create a COD-Points ticket'),
    new SlashCommandBuilder().setName('lock').setDescription('Locks a channel'),
    new SlashCommandBuilder()
        .setName('purge')
        .setDescription('Deletes a specified number of messages')
        .addIntegerOption(option =>
            option.setName('amount')
                .setDescription('The number of messages to delete')
                .setRequired(true)),
    new SlashCommandBuilder()
        .setName('stock')
        .setDescription('Displays the current Robux stock')
        .addIntegerOption(option =>
            option.setName('amount')
                .setDescription('The amount of Robux in stock')
                .setRequired(true)),
    new SlashCommandBuilder()
        .setName('stockupdate')
        .setDescription('Updates the current Robux stock')
        .addIntegerOption(option =>
            option.setName('amount')
                .setDescription('The new amount of Robux in stock')
                .setRequired(true))
].map(command => command.toJSON());

const rest = new REST({ version: '10' }).setToken(token);

const activeTickets = new Set();

client.once('ready', async () => {
    try {
        await rest.put(
            Routes.applicationGuildCommands(client.user.id, guildId),
            { body: commands },
        );
        logger.info('Successfully registered application commands.');
    } catch (error) {
        logger.error(`Error registering application commands: ${error}`);
    }
    logger.info(`Logged in as ${client.user.tag}!`);
});

client.on('interactionCreate', async interaction => {
    try {
        if (!interaction.isChatInputCommand() && !interaction.isButton()) return;

        if (interaction.isChatInputCommand()) {
            await handleChatInputCommand(interaction);
        } else if (interaction.isButton()) {
            await interaction.deferReply({ ephemeral: true }); // Ensure all button interactions are deferred
            await handleButtonInteraction(interaction);
        }
    } catch (error) {
        handleInteractionError(error, interaction);
    }
});

client.on('messageCreate', async message => {
    if (!message.guild) return;
    if (!message.content.startsWith('.')) return;

    const args = message.content.slice(1).trim().split(/ +/);
    const command = args.shift().toLowerCase();

    if (command === 'ban') {
        await handleBanCommand(message, args);
    } else if (command === 'unban') {
        await handleUnbanCommand(message, args);
    } else if (command === 'kick') {
        await handleKickCommand(message, args);
    } else if (command === 'timeout') {
        await handleTimeoutCommand(message, args);
    } else if (command === 'untimeout') {
        await handleUntimeoutCommand(message, args);
    } else if (command === 'ca' || command === 'cashapp') {
        await sendEmbedMessage(message, 'CashApp 💸', '🔗: https://cash.app/$mashybros', 'https://cdn.discordapp.com/attachments/1257038098320068752/1257430223172145192/IvNQx1G0jyNwAAAAASUVORK5CYII.png?ex=668460a7&is=66830f27&hm=d3109770eb969bc7fa636892aa67bd2e89edd28c9bd777f3c23a2f858694da5f&');
    } else if (command === 'pp' || command === 'paypal') {
        await sendEmbedMessage(message, 'PayPal 🅿️🅿️', '🔗: https://www.paypal.me/UrMomma315', 'https://cdn.discordapp.com/attachments/1257038098320068752/1257430821724487842/qGVZ0PLP3IuykHgWquekT0hyMNQLff5KqxtWdCO6au0nmVBeqIT1rUsCBv0UtqcsujRC02DyuIznbCWOwtG6FP6zVlKWyfH64TmrKQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAANrAtbYXHYB9448AAAAAElFTkSuQmCC.png?ex=66846135&is=66830fb5&hm=31105a33804a97155d65d3b368ab588040a04a626c74d7fcddc9b333a3950175&');
    } else if (command === 'ltc' || command === 'litecoin') {
        await sendEmbedMessage(message, 'Litecoin Ł', '🔗: ltc1q3etuf6dvquhct35k0v2e8d5hx8mheghasnuczj', 'https://cdn.discordapp.com/attachments/1257038098320068752/1257431859583909918/wOjL0UuBVsAxAAAAABJRU5ErkJggg.png?ex=6684622d&is=668310ad&hm=a1c9712ba7ff7eecf0b7f4494a8505a51497502a182d353375b0f9ef2403ae18&');
    } else if (command === 'ven' || command === 'venmo') {
        await sendEmbedMessage(message, 'Venmo 🥶', '🔗: https://venmo.com/u/mashybros', 'https://cdn.discordapp.com/attachments/1257038098320068752/1257432208898002944/9k.png?ex=66846280&is=66831100&hm=e0fd403468f717ee29c771b885c98b6a98c624974318cf4d8a1b0a6b43bc9339&');
    } else if (command === 'eth' || command === 'ethereum') {
        await sendEmbedMessage(message, 'Ethereum 💎', '🔗: 0x3C334A9407c39Dd705B595319EE1679e114E2e7e', 'https://cdn.discordapp.com/attachments/1257038098320068752/1257432598116831273/9k.png?ex=668462dd&is=6683115d&hm=ccb23a5676ab5c61fe8a415a019a8b2bdc3d1fa389250f5cae45a9aa2a9b87fb&');
    } else if (command === 'btc' || command === 'bitcoin') {
        await sendEmbedMessage(message, 'Bitcoin 🅱️', '🔗: bc1q6wyan773sqzvwe672qu6gghrgy4j0uvewvnlkc', 'https://cdn.discordapp.com/attachments/1257038098320068752/1257432983946793040/pfGTtftzJteb1Wqz5NPMwzDMAzDMAzDMAzDMAzDMAzDMAzDMAzDMAzDMAzDMAzDMAzDMAzDMAzDMAzDMAzDMAzDMMzfx39xiKFbzVWmJAAAAABJRU5ErkJggg.png?ex=66846339&is=668311b9&hm=a42f66d6f6b2800021bf6a0b19b320a95c56467dfb0cddd8bc2fade330b73e67&');
    }
});

async function handleChatInputCommand(interaction) {
    if (interaction.commandName === 'send-ticket-message') {
        await sendTicketMessage(interaction);
    } else if (interaction.commandName === 'robux-ticket-message') {
        await sendRobuxTicketMessage(interaction);
    } else if (interaction.commandName === 'vbucks-ticket-message') {
        await sendVbucksTicketMessage(interaction);
    } else if (interaction.commandName === 'cod-ticket-message') {
        await sendCodTicketMessage(interaction);
    } else if (interaction.commandName === 'lock') {
        await lockChannel(interaction);
    } else if (interaction.commandName === 'purge') {
        await purgeMessages(interaction);
    } else if (interaction.commandName === 'stock') {
        await sendStockMessage(interaction);
    } else if (interaction.commandName === 'stockupdate') {
        await updateStockMessage(interaction);
    }
}

async function handleButtonInteraction(interaction) {
    const customId = interaction.customId;

    if (customId === 'create_ticket') {
        await createTicket(interaction, 'ticket', categoryId, transcriptChannelId);
    } else if (customId === 'create_robux_ticket') {
        await createTicket(interaction, 'robux_ticket', robuxCategoryId, robuxTranscriptChannelId);
    } else if (customId === 'create_vbucks_ticket') {
        await createTicket(interaction, 'vbucks_ticket', vbucksCategoryId, vbucksTranscriptChannelId);
    } else if (customId === 'create_cod_ticket') {
        await createTicket(interaction, 'cod_ticket', codCategoryId, codTranscriptChannelId);
    } else if (customId.startsWith('claim_')) {
        await claimTicket(interaction);
    } else if (customId.startsWith('close_')) {
        await initiateTicketClosure(interaction);
    } else if (customId.startsWith('resolve_issue_') || customId.startsWith('no_response_') || customId.startsWith('invalid_ticket_')) {
        await confirmTicketClosure(interaction);
    } else if (customId.startsWith('confirm_close_')) {
        await closeTicket(interaction);
    } else if (customId === 'cancel_close') {
        await cancelTicketClosure(interaction);
    }
}

async function sendTicketMessage(interaction) {
    if (!interaction.member.roles.cache.has(specificRoleId)) {
        await interaction.reply({
            embeds: [new EmbedBuilder().setDescription('❌ **You do not have permission to use this command.**').setColor('#FF0000')],
            ephemeral: true
        });
        return;
    }

    const embed = new EmbedBuilder()
        .setTitle('🎟️ **__Mashys Market Support__**')
        .setDescription('**__Welcome to this support panel!__**\n\nClick on the button below if you wish to talk to the support team. They will respond to your request.')
        .setColor('#00FF00')
        .setFooter({ text: 'Mashys Market Support' });

    const row = new ActionRowBuilder()
        .addComponents(
            new ButtonBuilder()
                .setCustomId('create_ticket')
                .setLabel('🎟️ Create Ticket')
                .setStyle(ButtonStyle.Primary),
        );

    await interaction.reply({
        embeds: [new EmbedBuilder().setDescription('✅ **Support panel created!**').setColor('#00FF00')],
        ephemeral: true
    });

    await interaction.channel.send({ embeds: [embed], components: [row] });
    logAction(interaction.guild, interaction.user, 'executed send-ticket-message command');
}

async function sendRobuxTicketMessage(interaction) {
    if (!interaction.member.roles.cache.has(specificRoleId)) {
        await interaction.reply({
            embeds: [new EmbedBuilder().setDescription('❌ **You do not have permission to use this command.**').setColor('#FF0000')],
            ephemeral: true
        });
        return;
    }

    const embed = new EmbedBuilder()
        .setTitle('🎟️ **__Mashys Market <:9073robux:1256479273410232390> Robux <:9073robux:1256479273410232390>__**')
        .setDescription(
            '**ALL ROBUX ARE 100% CLEAN & WARRANTY PROVIDED!**\n\n' +
            '**Cheapest rate in market.**\n\n' +
            '**Rate: $3.3/1k Robux <:9073robux:1256479273410232390>**\n\n' +
            '**IF THERE IS NO STOCK DO NOT OPEN A TICKET, YOU CAN CHECK STOCKS IN THE STOCK CHANNEL.**'
        )
        .setImage('https://miro.medium.com/v2/resize:fit:1400/1*cRSnjC1ZJKdf47rn0Tzt0w.png')
        .setColor('#FFD700')
        .setFooter({ text: 'Mashys Market Robux' });

    const row = new ActionRowBuilder()
        .addComponents(
            new ButtonBuilder()
                .setCustomId('create_robux_ticket')
                .setLabel('🎟️ Create Robux Ticket')
                .setStyle(ButtonStyle.Primary),
        );

    await interaction.reply({
        embeds: [new EmbedBuilder().setDescription('✅ **Robux panel created!**').setColor('#00FF00')],
        ephemeral: true
    });

    await interaction.channel.send({ embeds: [embed], components: [row] });
    logAction(interaction.guild, interaction.user, 'executed robux-ticket-message command');
}

async function sendVbucksTicketMessage(interaction) {
    if (!interaction.member.roles.cache.has(specificRoleId)) {
        await interaction.reply({
            embeds: [new EmbedBuilder().setDescription('❌ **You do not have permission to use this command.**').setColor('#FF0000')],
            ephemeral: true
        });
        return;
    }

    const embed = new EmbedBuilder()
        .setTitle('🎟️ **__Mashys Market V-Bucks__**')
        .setDescription(
            '<:VBuck:1256452183776559145> V-Bucks Prices <:VBuck:1256452183776559145>\n' +
            '**Discount Market**\n\n' +
            '2,800 <:VBuck:1256452183776559145> - $13\n' +
            '5,000 <:VBuck:1256452183776559145> - $25\n' +
            '13,500 <:VBuck:1256452183776559145> - $50\n' +
            '27,000 <:VBuck:1256452183776559145> - $100\n\n' +
            'Note: By purchasing our product, you acknowledge that we won\'t offer a refund unless you haven\'t received them.\n' +
            'All purchases are final. Instructions on how to claim your V-Bucks will be provided after the purchase.'
        )
        .setImage('https://fbi.cults3d.com/uploaders/13295431/illustration-file/2217d3ae-f61f-4c66-86d4-b86bfb05061b/V-Bucks.png')
        .setColor('#1E90FF')
        .setFooter({ text: 'Mashys Market V-Bucks' });

    const row = new ActionRowBuilder()
        .addComponents(
            new ButtonBuilder()
                .setCustomId('create_vbucks_ticket')
                .setLabel('🎟️ Create V-Bucks Ticket')
                .setStyle(ButtonStyle.Primary),
        );

    await interaction.reply({
        embeds: [new EmbedBuilder().setDescription('✅ **V-Bucks panel created!**').setColor('#00FF00')],
        ephemeral: true
    });

    await interaction.channel.send({ embeds: [embed], components: [row] });
    logAction(interaction.guild, interaction.user, 'executed vbucks-ticket-message command');
}

async function sendCodTicketMessage(interaction) {
    if (!interaction.member.roles.cache.has(specificRoleId)) {
        await interaction.reply({
            embeds: [new EmbedBuilder().setDescription('❌ **You do not have permission to use this command.**').setColor('#FF0000')],
            ephemeral: true
        });
        return;
    }

    const embed = new EmbedBuilder()
        .setTitle('🎟️ **__Mashys Market <:9188cp:1256484167244582954> COD-Points <:9188cp:1256484167244582954>__**')
        .setDescription(
            '<:9188cp:1256484167244582954> COD-Points <:9188cp:1256484167244582954> Prices\n' +
            '[Discount Market ]\n\n' +
            '1,100 <:9188cp:1256484167244582954> - $4\n' +
            '2,400 <:9188cp:1256484167244582954> - $8\n' +
            '5,000 <:9188cp:1256484167244582954> - $16\n' +
            '13,000 <:9188cp:1256484167244582954> - $30\n' +
            '21,000 <:9188cp:1256484167244582954> - $55\n\n' +
            'Note: By purchasing our product, you acknowledge that we won\'t offer a refund unless you haven\'t received them.\n' +
            'All purchases are final. Instructions on how to claim your COD-Points will be provided after payment.'
        )
        .setImage('https://cdn.startselect.com/media-uploads/COD_Points_Info_Blog_Banner-20240223152853.jpg')
        .setColor('#1E90FF')
        .setFooter({ text: 'Mashys Market COD-Points' });

    const row = new ActionRowBuilder()
        .addComponents(
            new ButtonBuilder()
                .setCustomId('create_cod_ticket')
                .setLabel('🎟️ Create COD-Points Ticket')
                .setStyle(ButtonStyle.Primary),
        );

    await interaction.reply({
        embeds: [new EmbedBuilder().setDescription('✅ **COD-Points panel created!**').setColor('#00FF00')],
        ephemeral: true
    });

    await interaction.channel.send({ embeds: [embed], components: [row] });
    logAction(interaction.guild, interaction.user, 'executed cod-ticket-message command');
}

async function createTicket(interaction, ticketType, categoryId, transcriptChannelId) {
    const userId = interaction.user.id;

    if (activeTickets.has(userId)) {
        await interaction.editReply({
            embeds: [new EmbedBuilder().setDescription('❌ **You already have an active ticket! Please close your existing ticket before creating a new one.**').setColor('#FF0000')]
        });
        return;
    }

    try {
        const ticketChannel = await interaction.guild.channels.create({
            name: `${ticketType}-${interaction.user.username}`,
            type: 0, // GuildText
            parent: categoryId,
            permissionOverwrites: [
                {
                    id: interaction.guild.roles.everyone,
                    deny: [PermissionsBitField.Flags.ViewChannel],
                },
                {
                    id: userId,
                    allow: [PermissionsBitField.Flags.ViewChannel, PermissionsBitField.Flags.SendMessages, PermissionsBitField.Flags.ReadMessageHistory],
                },
                {
                    id: specificRoleId,
                    allow: [PermissionsBitField.Flags.ViewChannel, PermissionsBitField.Flags.SendMessages, PermissionsBitField.Flags.ReadMessageHistory],
                }
            ],
        });

        const embed = new EmbedBuilder()
            .setDescription(`Hello ${interaction.user}, please describe your issue in detail.`)
            .setColor('#00FF00');

        const row = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId(`claim_${ticketChannel.id}`)
                    .setLabel('🛠️ Claim Ticket')
                    .setStyle(ButtonStyle.Success),
                new ButtonBuilder()
                    .setCustomId(`close_${ticketChannel.id}`)
                    .setLabel('🔒 Close Ticket')
                    .setStyle(ButtonStyle.Danger),
            );

        await ticketChannel.send({ content: `${interaction.user}`, embeds: [embed], components: [row] });
        await interaction.editReply({
            embeds: [new EmbedBuilder().setDescription(`✅ **Ticket created! Please go to ${ticketChannel}**`).setColor('#00FF00')]
        });

        activeTickets.add(userId);
        logAction(interaction.guild, interaction.user, `created a ${ticketType}`);
    } catch (error) {
        logger.error(`Error creating ticket: ${error}`);
        await interaction.editReply({
            embeds: [new EmbedBuilder().setDescription('❌ **There was an error creating the ticket. Please try again later.**').setColor('#FF0000')]
        });
    }
}

async function claimTicket(interaction) {
    if (!interaction.member.roles.cache.has(specificRoleId)) {
        await interaction.editReply({
            embeds: [new EmbedBuilder().setDescription('❌ **You do not have permission to use this command.**').setColor('#FF0000')]
        });
        return;
    }

    const ticketChannel = interaction.guild.channels.cache.get(interaction.customId.split('_')[1]);

    if (!ticketChannel) {
        await interaction.editReply({
            embeds: [new EmbedBuilder().setDescription('❌ **Ticket channel not found.**').setColor('#FF0000')]
        });
        return;
    }

    await ticketChannel.permissionOverwrites.edit(interaction.user.id, {
        ViewChannel: true,
        SendMessages: true,
        ReadMessageHistory: true
    });

    await ticketChannel.send({ embeds: [new EmbedBuilder().setDescription(`🛠️ **${interaction.user} has claimed this ticket.**`).setColor('#00FF00')] });
    await interaction.editReply({
        embeds: [new EmbedBuilder().setDescription('🛠️ **Ticket claimed!**').setColor('#00FF00')]
    });
}

async function initiateTicketClosure(interaction) {
    if (!interaction.member.roles.cache.has(specificRoleId)) {
        await interaction.editReply({
            embeds: [new EmbedBuilder().setDescription('❌ **You do not have permission to use this command.**').setColor('#FF0000')]
        });
        return;
    }

    const ticketChannel = interaction.guild.channels.cache.get(interaction.customId.split('_')[1]);

    if (!ticketChannel) {
        await interaction.editReply({
            embeds: [new EmbedBuilder().setDescription('❌ **Ticket channel not found.**').setColor('#FF0000')]
        });
        return;
    }

    const row = new ActionRowBuilder()
        .addComponents(
            new ButtonBuilder()
                .setCustomId(`resolve_issue_${ticketChannel.id}`)
                .setLabel('✅ Resolve Issue')
                .setStyle(ButtonStyle.Success),
            new ButtonBuilder()
                .setCustomId(`no_response_${ticketChannel.id}`)
                .setLabel('🚫 No Response')
                .setStyle(ButtonStyle.Secondary),
            new ButtonBuilder()
                .setCustomId(`invalid_ticket_${ticketChannel.id}`)
                .setLabel('❌ Invalid Ticket')
                .setStyle(ButtonStyle.Danger),
            new ButtonBuilder()
                .setCustomId('cancel_close')
                .setLabel('❌ Cancel')
                .setStyle(ButtonStyle.Secondary)
        );

    await interaction.editReply({
        embeds: [new EmbedBuilder().setDescription('⚠️ **Are you sure you want to close this ticket?**').setColor('#FFA500')],
        components: [row]
    });
}

async function confirmTicketClosure(interaction) {
    if (!interaction.member.roles.cache.has(specificRoleId)) {
        await interaction.editReply({
            embeds: [new EmbedBuilder().setDescription('❌ **You do not have permission to use this command.**').setColor('#FF0000')]
        });
        return;
    }

    const ticketChannel = interaction.guild.channels.cache.get(interaction.customId.split('_')[2]);

    if (!ticketChannel) {
        await interaction.editReply({
            embeds: [new EmbedBuilder().setDescription('❌ **Ticket channel not found.**').setColor('#FF0000')]
        });
        return;
    }

    const reason = interaction.customId.startsWith('resolve_issue_') ? 'Issue resolved' :
        interaction.customId.startsWith('no_response_') ? 'No response from user' : 'Invalid ticket';

    const row = new ActionRowBuilder()
        .addComponents(
            new ButtonBuilder()
                .setCustomId(`confirm_close_${ticketChannel.id}`)
                .setLabel('✅ Confirm Close')
                .setStyle(ButtonStyle.Danger),
            new ButtonBuilder()
                .setCustomId('cancel_close')
                .setLabel('❌ Cancel')
                .setStyle(ButtonStyle.Secondary)
        );

    await interaction.editReply({
        embeds: [new EmbedBuilder().setDescription(`⚠️ **Are you sure you want to close this ticket? Reason: ${reason}**`).setColor('#FFA500')],
        components: [row]
    });
}

async function closeTicket(interaction) {
    if (!interaction.member.roles.cache.has(specificRoleId)) {
        await interaction.editReply({
            embeds: [new EmbedBuilder().setDescription('❌ **You do not have permission to use this command.**').setColor('#FF0000')]
        });
        return;
    }

    const ticketChannel = interaction.guild.channels.cache.get(interaction.customId.split('_')[2]);

    if (!ticketChannel) {
        await interaction.editReply({
            embeds: [new EmbedBuilder().setDescription('❌ **Ticket channel not found.**').setColor('#FF0000')]
        });
        return;
    }

    const messages = await ticketChannel.messages.fetch();
    const isRobux = ticketChannel.name.includes('robux_ticket');
    const isVbucks = ticketChannel.name.includes('vbucks_ticket');
    const isCod = ticketChannel.name.includes('cod_ticket');
    const transcriptChannel = isRobux ? interaction.guild.channels.cache.get(robuxTranscriptChannelId) :
                            isVbucks ? interaction.guild.channels.cache.get(vbucksTranscriptChannelId) :
                            isCod ? interaction.guild.channels.cache.get(codTranscriptChannelId) :
                            interaction.guild.channels.cache.get(transcriptChannelId);

    if (!transcriptChannel) {
        await interaction.editReply({
            embeds: [new EmbedBuilder().setDescription('❌ **Transcript channel not found.**').setColor('#FF0000')]
        });
        return;
    }

    let transcript = `Transcript of ${ticketChannel.name}:\n\n`;
    messages.reverse().forEach(message => {
        transcript += `${message.author.tag}: ${message.content}\n`;
    });

    const transcriptEmbed = new EmbedBuilder()
        .setTitle(`📄 Transcript of ${ticketChannel.name}`)
        .addFields(
            { name: 'User Mention', value: `${interaction.user}`, inline: true },
            { name: 'Username', value: `${interaction.user.tag}`, inline: true },
            { name: 'User ID', value: `${interaction.user.id}`, inline: true },
            { name: 'Reason', value: 'Issue resolved' }
        )
        .setColor('#00FF00');

    await transcriptChannel.send({
        embeds: [transcriptEmbed],
        files: [{ attachment: Buffer.from(transcript), name: `${ticketChannel.name}-transcript.txt` }]
    });

    await ticketChannel.send({ embeds: [new EmbedBuilder().setDescription('🔒 **This ticket has been closed.**').setColor('#FF0000')] });

    activeTickets.delete(interaction.user.id);

    setTimeout(async () => {
        await ticketChannel.delete();
    }, 5000);

    await interaction.editReply({
        embeds: [new EmbedBuilder().setDescription('✅ **Ticket closed and transcript saved!**').setColor('#00FF00')],
        components: []
    });
}

async function cancelTicketClosure(interaction) {
    await interaction.editReply({
        embeds: [new EmbedBuilder().setDescription('❌ **Ticket closure canceled.**').setColor('#FF0000')],
        components: []
    });
}

async function lockChannel(interaction) {
    if (!interaction.member.roles.cache.has(specificRoleId)) {
        await interaction.reply({
            embeds: [new EmbedBuilder().setDescription('❌ **You do not have permission to use this command.**').setColor('#FF0000')],
            ephemeral: true
        });
        return;
    }

    const channel = interaction.channel;

    await channel.permissionOverwrites.edit(interaction.guild.roles.everyone, {
        SendMessages: false,
        AddReactions: false
    });

    await interaction.reply({
        embeds: [new EmbedBuilder().setDescription('🔒 **Channel locked!**').setColor('#00FF00')]
    });

    logAction(interaction.guild, interaction.user, `locked the channel ${channel.name}`);
}

async function purgeMessages(interaction) {
    if (!interaction.member.roles.cache.has(specificRoleId)) {
        await interaction.reply({
            embeds: [new EmbedBuilder().setDescription('❌ **You do not have permission to use this command.**').setColor('#FF0000')],
            ephemeral: true
        });
        return;
    }

    const amount = interaction.options.getInteger('amount');

    if (amount < 1 || amount > 100) {
        await interaction.reply({
            embeds: [new EmbedBuilder().setDescription('❌ **You need to input a number between 1 and 100.**').setColor('#FF0000')],
            ephemeral: true
        });
        return;
    }

    await interaction.channel.bulkDelete(amount, true)
        .catch(error => {
            logger.error(`Error purging messages: ${error}`);
            interaction.reply({
                embeds: [new EmbedBuilder().setDescription('❌ **There was an error trying to purge messages in this channel.**').setColor('#FF0000')],
                ephemeral: true
            });
        });

    await interaction.reply({
        embeds: [new EmbedBuilder().setDescription(`✅ **Successfully deleted ${amount} messages.**`).setColor('#00FF00')],
        ephemeral: true
    });

    logAction(interaction.guild, interaction.user, `purged ${amount} messages in ${interaction.channel.name}`);
}

function parseDuration(duration) {
    const match = duration.match(/(\d+)([smhd])/);
    if (!match) return null;

    const value = parseInt(match[1]);
    const unit = match[2];

    switch (unit) {
        case 's': return value * 1000;
        case 'm': return value * 60 * 1000;
        case 'h': return value * 60 * 60 * 1000;
        case 'd': return value * 24 * 60 * 60 * 1000;
        default: return null;
    }
}

async function handleBanCommand(message, args) {
    if (!message.member.roles.cache.has(adminRoleId)) {
        await message.reply({
            embeds: [new EmbedBuilder().setDescription('❌ **You do not have permission to use this command.**').setColor('#FF0000')]
        });
        return;
    }

    if (args.length < 2) {
        await message.reply({
            embeds: [new EmbedBuilder().setDescription('❌ **Incorrect usage. The correct usage is `.ban @user reason`**').setColor('#FF0000')]
        });
        return;
    }

    const user = message.mentions.users.first();
    const reason = args.slice(1).join(' ');

    if (!user) {
        await message.reply({
            embeds: [new EmbedBuilder().setDescription('❌ **User not found. Please mention a valid user.**').setColor('#FF0000')]
        });
        return;
    }

    const member = message.guild.members.cache.get(user.id);
    if (!member) {
        await message.reply({
            embeds: [new EmbedBuilder().setDescription('❌ **Member not found in the guild.**').setColor('#FF0000')]
        });
        return;
    }

    try {
        await member.ban({ reason });
        await message.reply({
            embeds: [new EmbedBuilder().setDescription(`✅ **${user} (UserID: ${user.id}) has been banned for the following reason: \`${reason}\`**`).setColor('#00FF00')]
        });
        logAction(message.guild, message.author, `banned ${user.tag} (UserID: ${user.id}) for: \`${reason}\``);
    } catch (error) {
        logger.error(`Error banning user: ${error}`);
        await message.reply({
            embeds: [new EmbedBuilder().setDescription('❌ **There was an error banning the user. Please try again later.**').setColor('#FF0000')]
        });
    }
}

async function handleUnbanCommand(message, args) {
    if (!message.member.roles.cache.has(adminRoleId)) {
        await message.reply({
            embeds: [new EmbedBuilder().setDescription('❌ **You do not have permission to use this command.**').setColor('#FF0000')]
        });
        return;
    }

    if (args.length < 1) {
        await message.reply({
            embeds: [new EmbedBuilder().setDescription('❌ **Incorrect usage. The correct usage is `.unban userId`**').setColor('#FF0000')]
        });
        return;
    }

    const userId = args[0];

    try {
        await message.guild.bans.remove(userId);
        await message.reply({
            embeds: [new EmbedBuilder().setDescription(`✅ **User with ID ${userId} has been unbanned.**`).setColor('#00FF00')]
        });
        logAction(message.guild, message.author, `unbanned user with ID: ${userId}`);
    } catch (error) {
        logger.error(`Error unbanning user: ${error}`);
        await message.reply({
            embeds: [new EmbedBuilder().setDescription('❌ **There was an error unbanning the user. Please try again later.**').setColor('#FF0000')]
        });
    }
}

async function handleKickCommand(message, args) {
    if (!message.member.roles.cache.has(adminRoleId)) {
        await message.reply({
            embeds: [new EmbedBuilder().setDescription('❌ **You do not have permission to use this command.**').setColor('#FF0000')]
        });
        return;
    }

    if (args.length < 2) {
        await message.reply({
            embeds: [new EmbedBuilder().setDescription('❌ **Incorrect usage. The correct usage is `.kick @user reason`**').setColor('#FF0000')]
        });
        return;
    }

    const user = message.mentions.users.first();
    const reason = args.slice(1).join(' ');

    if (!user) {
        await message.reply({
            embeds: [new EmbedBuilder().setDescription('❌ **User not found. Please mention a valid user.**').setColor('#FF0000')]
        });
        return;
    }

    const member = message.guild.members.cache.get(user.id);
    if (!member) {
        await message.reply({
            embeds: [new EmbedBuilder().setDescription('❌ **Member not found in the guild.**').setColor('#FF0000')]
        });
        return;
    }

    try {
        await member.kick(reason);
        await message.reply({
            embeds: [new EmbedBuilder().setDescription(`✅ **${user} has been kicked for the following reason: \`${reason}\`**`).setColor('#00FF00')]
        });
        logAction(message.guild, message.author, `kicked ${user.tag} for: \`${reason}\``);
    } catch (error) {
        logger.error(`Error kicking user: ${error}`);
        await message.reply({
            embeds: [new EmbedBuilder().setDescription('❌ **There was an error kicking the user. Please try again later.**').setColor('#FF0000')]
        });
    }
}

async function handleTimeoutCommand(message, args) {
    if (!message.member.roles.cache.has(adminRoleId)) {
        await message.reply({
            embeds: [new EmbedBuilder().setDescription('❌ **You do not have permission to use this command.**').setColor('#FF0000')]
        });
        return;
    }

    if (args.length < 3) {
        await message.reply({
            embeds: [new EmbedBuilder().setDescription('❌ **Incorrect usage. The correct usage is `.timeout @user duration reason`**').setColor('#FF0000')]
        });
        return;
    }

    const user = message.mentions.users.first();
    const duration = parseDuration(args[1]);
    const reason = args.slice(2).join(' ');

    if (!user) {
        await message.reply({
            embeds: [new EmbedBuilder().setDescription('❌ **User not found. Please mention a valid user.**').setColor('#FF0000')]
        });
        return;
    }

    if (!duration) {
        await message.reply({
            embeds: [new EmbedBuilder().setDescription('❌ **Invalid duration. Please provide a valid duration (e.g., 10s, 10m, 10h, 10d).**').setColor('#FF0000')]
        });
        return;
    }

    const member = message.guild.members.cache.get(user.id);
    if (!member) {
        await message.reply({
            embeds: [new EmbedBuilder().setDescription('❌ **Member not found in the guild.**').setColor('#FF0000')]
        });
        return;
    }

    try {
        await member.timeout(duration, reason);
        await message.reply({
            embeds: [new EmbedBuilder().setDescription(`✅ **${user} has been timed out for ${args[1]} for the following reason: \`${reason}\`**`).setColor('#00FF00')]
        });
        logAction(message.guild, message.author, `timed out ${user.tag} for ${args[1]} for: \`${reason}\``);
    } catch (error) {
        logger.error(`Error timing out user: ${error}`);
        await message.reply({
            embeds: [new EmbedBuilder().setDescription('❌ **There was an error timing out the user. Please try again later.**').setColor('#FF0000')]
        });
    }
}

async function handleUntimeoutCommand(message, args) {
    if (!message.member.roles.cache.has(adminRoleId)) {
        await message.reply({
            embeds: [new EmbedBuilder().setDescription('❌ **You do not have permission to use this command.**').setColor('#FF0000')]
        });
        return;
    }

    if (args.length < 1) {
        await message.reply({
            embeds: [new EmbedBuilder().setDescription('❌ **Incorrect usage. The correct usage is `.untimeout @user reason`**').setColor('#FF0000')]
        });
        return;
    }

    const user = message.mentions.users.first();
    const reason = args.slice(1).join(' ');

    if (!user) {
        await message.reply({
            embeds: [new EmbedBuilder().setDescription('❌ **User not found. Please mention a valid user.**').setColor('#FF0000')]
        });
        return;
    }

    const member = message.guild.members.cache.get(user.id);
    if (!member) {
        await message.reply({
            embeds: [new EmbedBuilder().setDescription('❌ **Member not found in the guild.**').setColor('#FF0000')]
        });
        return;
    }

    try {
        await member.timeout(null, reason); // Remove the timeout
        await message.reply({
            embeds: [new EmbedBuilder().setDescription(`✅ **${user} has been un-timed out for the following reason: \`${reason}\`**`).setColor('#00FF00')]
        });
        logAction(message.guild, message.author, `un-timed out ${user.tag} for: \`${reason}\``);
    } catch (error) {
        logger.error(`Error un-timing out user: ${error}`);
        await message.reply({
            embeds: [new EmbedBuilder().setDescription('❌ **There was an error un-timing out the user. Please try again later.**').setColor('#FF0000')]
        });
    }
}

async function sendEmbedMessage(message, title, description, imageUrl) {
    const embed = new EmbedBuilder()
        .setTitle(title)
        .setDescription(description)
        .setImage(imageUrl)
        .setColor('#00FF00');

    await message.reply({ embeds: [embed] });
}

function logAction(guild, user, action) {
    const logChannel = guild.channels.cache.get(logChannelId);
    if (!logChannel) {
        logger.error('Log channel not found.');
        return;
    }

    logChannel.send({
        embeds: [
            new EmbedBuilder()
                .setTitle('📝 Action Logged')
                .addFields(
                    { name: 'User', value: `${user} (${user.id})` },
                    { name: 'Action', value: action },
                    { name: 'Time', value: new Date().toISOString() }
                )
                .setColor('#00FF00')
        ]
    });
}

function handleInteractionError(error, interaction) {
    logger.error(`Interaction error: ${error}`);

    if (interaction.deferred) {
        interaction.editReply({
            embeds: [new EmbedBuilder().setDescription('❌ **An error occurred while processing your request. Please try again later.**').setColor('#FF0000')]
        });
    } else {
        interaction.reply({
            embeds: [new EmbedBuilder().setDescription('❌ **An error occurred while processing your request. Please try again later.**').setColor('#FF0000')],
            ephemeral: true
        });
    }
}

client.on('messageDelete', async message => {
    if (message.partial) {
        await message.fetch();
    }
    
    const embed = new EmbedBuilder()
        .setTitle('🗑️ Message Deleted')
        .addFields(
            { name: 'User', value: `${message.author.tag} (${message.author.id})`, inline: true },
            { name: 'Message', value: message.content || '*(no content)*' },
            { name: 'Channel', value: `${message.channel.name}` },
        )
        .setColor('#FF0000')
        .setThumbnail(message.author.displayAvatarURL({ dynamic: true }))
        .setTimestamp();

    const logChannel = message.guild.channels.cache.get(logChannelId);
    if (logChannel) {
        logChannel.send({ embeds: [embed] });
    }
});

client.on('messageUpdate', async (oldMessage, newMessage) => {
    if (oldMessage.partial) {
        await oldMessage.fetch();
    }
    if (newMessage.partial) {
        await newMessage.fetch();
    }

    if (oldMessage.content === newMessage.content) return;

    const embed = new EmbedBuilder()
        .setTitle('✏️ Message Edited')
        .addFields(
            { name: 'User', value: `${oldMessage.author.tag} (${oldMessage.author.id})`, inline: true },
            { name: 'Before', value: oldMessage.content || '*(no content)*' },
            { name: 'After', value: newMessage.content || '*(no content)*' },
            { name: 'Channel', value: `${oldMessage.channel.name}` },
        )
        .setColor('#FFA500')
        .setThumbnail(oldMessage.author.displayAvatarURL({ dynamic: true }))
        .setTimestamp();

    const logChannel = oldMessage.guild.channels.cache.get(logChannelId);
    if (logChannel) {
        logChannel.send({ embeds: [embed] });
    }
});

client.on('guildMemberAdd', async member => {
    const embed = new EmbedBuilder()
        .setTitle('👋 Welcome!')
        .setDescription(`Welcome ${member.user} to the server!`)
        .addFields(
            { name: 'Username', value: `${member.user.tag}` },
            { name: 'User ID', value: `${member.user.id}` },
            { name: 'Joined Discord', value: `<t:${Math.floor(member.user.createdTimestamp / 1000)}:F>` },
            { name: 'Joined Server', value: `<t:${Math.floor(member.joinedTimestamp / 1000)}:F>` },
        )
        .setColor('#00FF00')
        .setThumbnail(member.user.displayAvatarURL({ dynamic: true }))
        .setTimestamp();

    const welcomeChannel = member.guild.channels.cache.get(welcomeChannelId);
    if (welcomeChannel) {
        welcomeChannel.send({ embeds: [embed] });
    } else {
        logger.error('Welcome channel not found.');
    }
});

client.on('guildMemberRemove', async member => {
    const embed = new EmbedBuilder()
        .setTitle('👋 Goodbye!')
        .setDescription(`Goodbye ${member.user}, we hope to see you again!`)
        .addFields(
            { name: 'Username', value: `${member.user.tag}` },
            { name: 'User ID', value: `${member.user.id}` },
            { name: 'Joined Discord', value: `<t:${Math.floor(member.user.createdTimestamp / 1000)}:F>` },
            { name: 'Joined Server', value: `<t:${Math.floor(member.joinedTimestamp / 1000)}:F>` },
        )
        .setColor('#FF0000')
        .setThumbnail(member.user.displayAvatarURL({ dynamic: true }))
        .setTimestamp();

    const welcomeChannel = member.guild.channels.cache.get(welcomeChannelId);
    if (welcomeChannel) {
        welcomeChannel.send({ embeds: [embed] });
    } else {
        logger.error('Welcome channel not found.');
    }
});

client.login(token);

// /stock command handler
async function sendStockMessage(interaction) {
    if (!interaction.member.roles.cache.has(adminRoleId)) {
        await interaction.reply({
            embeds: [new EmbedBuilder().setDescription('❌ **You do not have permission to use this command.**').setColor('#FF0000')],
            ephemeral: true
        });
        return;
    }

    const amount = interaction.options.getInteger('amount');

    const embed = new EmbedBuilder()
        .setTitle('📦 Current Robux Stock <:9073robux:1256479273410232390>')
        .setDescription(
            `💎 Robux stock <:9073robux:1256479273410232390>: ${amount}\n\n` +
            '**Stock Details**\n' +
            'Detailed stock information goes here. 📊\n\n' +
            '**Additional Info**\n' +
            'Some more information. ℹ️\n\n' +
            '**Contact**\n' +
            'Contact support for more details. 📞\n\n' +
            '**Availability**\n' +
            'Stock available 24/7. 🕒\n\n' +
            '**Updates**\n' +
            'Check back for regular updates. 🔄\n\n' 
        )
        .setImage('https://miro.medium.com/v2/resize:fit:1400/1*cRSnjC1ZJKdf47rn0Tzt0w.png')
        .setFooter({ text: 'Stock information 🗃️' })
        .setColor('#00FF00');

    await interaction.reply({
        embeds: [embed]
    });

    logAction(interaction.guild, interaction.user, 'executed stock command');
}

// /stockupdate command handler
async function updateStockMessage(interaction) {
    if (!interaction.member.roles.cache.has(adminRoleId)) {
        await interaction.reply({
            embeds: [new EmbedBuilder().setDescription('❌ **You do not have permission to use this command.**').setColor('#FF0000')],
            ephemeral: true
        });
        return;
    }

    const amount = interaction.options.getInteger('amount');

    const embed = new EmbedBuilder()
        .setTitle('📦 Current Robux Stock')
        .setDescription(
            `💎 Robux stock <:9073robux:1256479273410232390>: ${amount}\n\n` +
            '**Stock Details**\n' +
            'Detailed stock information goes here. 📊\n\n' +
            '**Additional Info**\n' +
            'Some more information. ℹ️\n\n' +
            '**Contact**\n' +
            'Contact support for more details. 📞\n\n' +
            '**Availability**\n' +
            'Stock available 24/7. 🕒\n\n' +
            '**Updates**\n' +
            'Check back for regular updates. 🔄\n\n' 
        )
        .setImage('https://miro.medium.com/v2/resize:fit:1400/1*cRSnjC1ZJKdf47rn0Tzt0w.png')
        .setFooter({ text: 'Stock information 🗃️' })
        .setColor('#00FF00');

    // Update the stock message (assuming it's the last message sent in a specific channel)
    const stockChannel = interaction.channel; // Change this to your specific stock channel if needed
    const messages = await stockChannel.messages.fetch({ limit: 10 }); // Adjust the limit as needed
    const stockMessage = messages.find(msg => msg.embeds.length > 0 && msg.embeds[0].title && msg.embeds[0].title.includes('📦 Current Robux Stock'));

    if (stockMessage) {
        console.log('Stock message found:', stockMessage.embeds[0].title);
        await stockMessage.edit({ embeds: [embed] });
        await interaction.reply({
            embeds: [new EmbedBuilder().setDescription('✅ **Stock updated successfully!**').setColor('#00FF00')],
            ephemeral: true
        });
        logAction(interaction.guild, interaction.user, 'executed stockupdate command');
    } else {
        console.log('No stock message found to update.');
        await interaction.reply({
            embeds: [new EmbedBuilder().setDescription('❌ **No stock message found to update.**').setColor('#FF0000')],
            ephemeral: true
        });
    }
}

process.on("unhandledRejection", (reason, promise) => {
    console.log("Unhandled Rejection Error");
    console.log(reason, promise)
}); // Handles Unhandled Rejection Errors

process.on("uncaughtException", (err, origin) => {
    console.log("Uncaught Exeception Error");
    console.log(err, origin);
}); // Handles Uncaught Excpetion Errors

client.login(token);
