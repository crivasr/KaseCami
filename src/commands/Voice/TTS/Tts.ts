import { Polly, VoiceId } from "@aws-sdk/client-polly";
import { Readable } from "stream";
import {
    ChatInputCommandInteraction,
    InteractionContextType,
    Message,
    SlashCommandBuilder,
    SlashCommandOptionsOnlyBuilder,
} from "discord.js";
import { AudioPlayerStatus, createAudioResource } from "@discordjs/voice";
import Command, { Category } from "../../Command";
import PlayerManager from "../../../managers/PlayerManager";

export default class Tts extends Command {
    readonly onlySlash = false;

    public readonly category = Category.Voice;

    private readonly pollyClient = new Polly({});
    private readonly DEFAULT_VOICE = VoiceId.Miguel;
    private readonly playerManager = PlayerManager.getInstance();

    public async slashExecutor(
        interaction: ChatInputCommandInteraction
    ): Promise<void> {
        const message = interaction.options.getString("message", true);
        let voice =
            interaction.options.getString("voice", false) ?? this.DEFAULT_VOICE;
        if (!(voice in VoiceId)) voice = this.DEFAULT_VOICE;
        await this.executor(interaction, message, voice as VoiceId);
    }

    public async messageExecutor(
        message: Message,
        args: string[]
    ): Promise<void> {
        let voice: VoiceId = this.DEFAULT_VOICE;

        if (args[0] in VoiceId) {
            voice = args[0] as VoiceId;
            args.shift();
        }

        await this.executor(message, args.join(" "), voice);
    }

    private async executor(
        caller: Message | ChatInputCommandInteraction,
        content: string,
        voice: VoiceId
    ): Promise<any> {
        if (caller.channel!.isDMBased())
            return caller.reply(
                "No puedes usar este comando en mensaje directo."
            );

        const player = this.playerManager.getOrCreate(caller.guildId!);
        if (player.state.status == AudioPlayerStatus.Playing)
            return caller.reply("Ya hay un mensaje leyendose, espera.");

        const speech = await this.generateSpeech(content, voice);

        if (!speech) return caller.reply("Ocurrio un error");

        const resource = createAudioResource(speech);

        player.play(resource);
        const memberId = caller.member!.user.id!;
        const member = await caller.guild!.members.fetch(memberId);

        if (member.voice.channelId == undefined)
            return caller.reply("Tienes que estar en un canal de voz!");
        const voiceChannel = member.voice.channel!;

        player.connect(voiceChannel);

        // si se llama por mensaje no es necesario responderle
        if (caller instanceof Message) return;
        caller.reply("Leyendo mensaje...");
    }

    public commandBuilder(): Partial<SlashCommandOptionsOnlyBuilder> {
        return new SlashCommandBuilder()
            .setContexts(InteractionContextType.Guild)
            .setName("tts")
            .setDescription("text to speech")
            .addStringOption((option) =>
                option
                    .setName("message")
                    .setDescription("message to read")
                    .setRequired(true)
            )
            .addStringOption((option) =>
                option
                    .setName("voice")
                    .setDescription("Voice to read the message")
                    .setRequired(false)
            );
    }

    private async generateSpeech(
        message: String,
        voice: VoiceId = VoiceId.Miguel
    ): Promise<Readable | void> {
        const args = message.split(" ");

        const res = await this.pollyClient
            .synthesizeSpeech({
                OutputFormat: "mp3",
                SampleRate: "24000",
                Text: args.join(" "),
                TextType: "text",
                VoiceId: voice,
            })
            .catch((err) => {
                console.error(err);
            });

        if (!res) {
            return;
        }

        const { AudioStream } = res;

        if (!AudioStream) {
            return;
        }

        // I don't know why this works
        const array = await AudioStream.transformToByteArray();
        return Readable.from([array]);
    }
}
