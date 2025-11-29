import {
    ChatInputCommandInteraction,
    InteractionContextType,
    Message,
    SlashCommandBuilder,
} from "discord.js";
import { AudioPlayerStatus } from "@discordjs/voice";
import Command, { Category } from "../../Command";
import PlayerManager from "../../../managers/PlayerManager";

export default class TtsStop extends Command {
    readonly onlySlash = false;

    public readonly category = Category.Voice;
    private readonly playerManager = PlayerManager.getInstance();

    public async slashExecutor(
        interaction: ChatInputCommandInteraction
    ): Promise<void> {
        await this.executor(interaction);
    }

    public async messageExecutor(
        message: Message,
        _args: string[]
    ): Promise<void> {
        await this.executor(message);
    }

    private async executor(
        caller: Message | ChatInputCommandInteraction
    ): Promise<any> {
        if (caller.channel!.isDMBased())
            return caller.reply(
                "No puedes usar este comando en mensaje directo."
            );

        const player = this.playerManager.getOrCreate(caller.guildId!);
        if (player.state.status != AudioPlayerStatus.Playing)
            return caller.reply("No hay ningun un mensaje leyendose.");

        player.pause();
        caller.reply("Listo.");
    }

    public commandBuilder(): Partial<SlashCommandBuilder> {
        return new SlashCommandBuilder()
            .setContexts(InteractionContextType.Guild)
            .setName("tts-stop")
            .setDescription("stop current message");
    }
}
