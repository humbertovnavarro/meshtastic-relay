import { HttpConnection } from "@meshtastic/js";
import { Client, IntentsBitField, TextBasedChannel } from "discord.js";
import { configDotenv } from "dotenv";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
configDotenv();

const discordClient = new Client({
    intents: IntentsBitField.Flags.Guilds | IntentsBitField.Flags.GuildMessages | IntentsBitField.Flags.MessageContent
});

const meshtasticClient = new HttpConnection();

meshtasticClient.connect({
    address: process.env.MESHTASTIC_NODE_IP as string,
    fetchInterval: 100
});

discordClient.login(process.env.DISCORD_TOKEN);

meshtasticClient.events.onNodeInfoPacket.subscribe(async (meta) => {
    if(!meta["user"]) return;
    const exists = await prisma.node.findFirst({
        where: {
            id: meta.num,
        }
    });

    if(!exists) {
        const channel = await discordClient.channels.fetch(process.env.DISCORD_CHANNEL_ID as string) as TextBasedChannel || undefined;
        await channel.send("Found new node: " + meta.user.longName || meta.user.shortName || meta.user.id || meta.num);
    }

    await prisma.node.upsert({
        where: {
            id: meta.num
        },
        update: {
            id: meta.num,
            stringId: meta.user.id,
            longName: meta.user.longName,
            shortName: meta.user.shortName,
            hopsAway: meta.hopsAway,
            lastHeard: meta.lastHeard,
            latitude: meta.position?.latitudeI,
            longitude: meta.position?.longitudeI,
            altitude: meta.position?.altitude,
            batteryLevel: meta.deviceMetrics?.batteryLevel,
            voltage: meta.deviceMetrics?.voltage,
            channelUtilization: meta.deviceMetrics?.airUtilTx
        },
        create: {
            id: meta.num,
            stringId: meta.user.id,
            longName: meta.user.longName,
            shortName: meta.user.shortName,
            hopsAway: meta.hopsAway,
            lastHeard: meta.lastHeard,
            latitude: meta.position?.latitudeI,
            longitude: meta.position?.longitudeI,
            altitude: meta.position?.altitude,
            batteryLevel: meta.deviceMetrics?.batteryLevel,
            voltage: meta.deviceMetrics?.voltage,
            channelUtilization: meta.deviceMetrics?.airUtilTx
        }
    });
});

meshtasticClient.events.onMessagePacket.subscribe(async (meta) => {
    try {
        if(!meta) return;
        const nodeDB = await prisma.node.findUnique({
            where: {
                id: meta.from
            }
        });
        const name = nodeDB?.longName || nodeDB?.shortName;
        const channel = await discordClient.channels.fetch(process.env.DISCORD_CHANNEL_ID as string) as TextBasedChannel || undefined;
        await channel.send(`:satellite: [${meta.id}] ${name ? `(${name})` : ''}${meta.data}`);
    } catch(error) {
        console.log(error);
    }
});

discordClient.on("messageCreate", async (message) => {
    if(message.author.bot) {
        return;
    }
    if(message.channel.id != process.env.DISCORD_CHANNEL_ID as string) {
        return;
    }
    if(message.content.startsWith("!")) {
        return;
    }
    if(message.content.length > 512) {
        await message.reply("Meshtastic messages can only be up to 512 characters in length. Your message is " + message.content.length + " characters.");
        return;
    }
    await meshtasticClient.sendText(`[${message.author.displayName}@CrowClub]: ${message.content}`)
    await message.react('🛰️');
});

