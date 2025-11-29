import { Events, IntentsBitField, Partials } from "discord.js";

import DiscordClient from "./Client";

import Ags from "./commands/Utility/Ags";
import Help from "./commands/Utility/Help";
import Ping from "./commands/Utility/Ping";
import Tts from "./commands/Voice/TTS/Tts";
import TtsStop from "./commands/Voice/TTS/TtsStop";

import InteractionHandler from "./handlers/InteractionHandler";
import MessageHandler from "./handlers/MessageHandler";
import { connectToDatabase } from "./database/connectToDatabase";
import Block from "./commands/Root/Block";
import Eval from "./commands/Root/Eval";
import Dolar from "./commands/Utility/Dolar";

import dotenv from "dotenv";
dotenv.config();

import { generateDependencyReport } from "@discordjs/voice";

const intents = [
    IntentsBitField.Flags.Guilds,
    IntentsBitField.Flags.GuildMessages,
    IntentsBitField.Flags.MessageContent,
    IntentsBitField.Flags.GuildMessageReactions,
    IntentsBitField.Flags.GuildMembers,
    IntentsBitField.Flags.GuildVoiceStates,
];

const partials = [Partials.Message, Partials.Channel, Partials.Reaction];

export const client = new DiscordClient(
    process.env.PREFIX ?? "¿",
    intents,
    partials
);

connectToDatabase();

client.addCommand(new Ags(client));
client.addCommand(new Ping(client));
client.addCommand(new Help(client));

client.addCommand(new Tts(client));
client.addCommand(new TtsStop(client));

client.addCommand(new Block(client));
client.addCommand(new Eval(client));

client.addCommand(new Dolar(client));

client.registerEventHandler(
    Events.InteractionCreate,
    new InteractionHandler(client)
);
client.registerEventHandler(Events.MessageCreate, new MessageHandler(client));

client.login(process.env.CLIENT_TOKEN ?? "");

client.once(Events.ClientReady, async (client) => {
    console.log(generateDependencyReport());
    console.log(`Bot ${client.user.username} is ready.`);
    await (client as DiscordClient).deployCommands(
        process.env.TEST_SERVERS?.split("/") ?? []
    );
    await (client as DiscordClient).fetchCommands();
});
