import z from "zod";
export const config = z.object({
    DISCORD_TOKEN: z.string(),
    MESHTASTIC_NODE_IP: z.string(),
    DISCORD_CHANNEL_ID: z.string(),
    DATABASE_URL: z.string()  
});

