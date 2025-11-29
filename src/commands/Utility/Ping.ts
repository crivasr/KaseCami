import { getVoiceConnection, VoiceConnection } from "@discordjs/voice";
import {
    ChatInputCommandInteraction,
    InteractionContextType,
    Message,
    SlashCommandBuilder,
} from "discord.js";
import Command, { Category } from "../Command";

export default class Ping extends Command {
    readonly category = Category.Utility;
    readonly onlySlash = false;

    public async slashExecutor(
        interaction: ChatInputCommandInteraction
    ): Promise<void> {
        let connection: VoiceConnection | undefined;
        if (interaction.guildId)
            connection = getVoiceConnection(interaction.guildId);

        const sent = await interaction.reply({
            content: "Pinging...",
            fetchReply: true,
        });
        let resp =
            `Roundtrip latency: **${
                sent.createdTimestamp - interaction.createdTimestamp
            }ms**\n` + `Websocket heartbeat: **${this.client.ws.ping}ms.**\n`;

        if (connection) {
            const ping = connection.ping;
            console.log(ping);
            ping.udp && (resp += `Voice UDP: ${ping.udp}\n`);
            ping.ws && (resp += `Voice WS: ${ping.ws}\n`);
        }

        interaction.editReply(resp);
    }

    public async messageExecutor(
        message: Message,
        _args: string[]
    ): Promise<void> {
        const msg = await message.reply("Pinging...");

        let connection: VoiceConnection | undefined;
        if (message.guildId) connection = getVoiceConnection(message.guildId);

        let resp =
            `Roundtrip latency: **${
                msg.createdTimestamp - message.createdTimestamp
            }ms**\n` + `Websocket heartbeat: **${this.client.ws.ping}ms.**\n`;

        if (connection) {
            const ping = connection.ping;

            ping.udp && (resp += `Voice UDP: ${ping.udp}\n`);
            ping.ws && (resp += `Voice WS: ${ping.ws}\n`);
        }

        msg.edit(resp);
    }

    public commandBuilder(): Partial<SlashCommandBuilder> {
        return new SlashCommandBuilder()
            .setContexts(
                InteractionContextType.Guild,
                InteractionContextType.BotDM,
                InteractionContextType.PrivateChannel
            )
            .setName("ping")
            .setDescription("get connection ping");
    }
}
