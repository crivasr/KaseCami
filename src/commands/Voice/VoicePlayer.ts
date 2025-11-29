import {
    AudioPlayer,
    AudioPlayerStatus,
    CreateAudioPlayerOptions,
    joinVoiceChannel,
    getVoiceConnection,
    VoiceConnection,
    entersState,
    VoiceConnectionStatus,
} from "@discordjs/voice";
import { VoiceBasedChannel } from "discord.js";

export default class VoicePlayer extends AudioPlayer {
    readonly guildId: string;
    private stoped: boolean;

    private idleTimer = 60_000;
    private timeout: NodeJS.Timeout | null = null;

    constructor(guildId: string, options?: CreateAudioPlayerOptions) {
        super(options);

        this.guildId = guildId;
        this.stoped = false;

        this.setTimeout();

        this.on(AudioPlayerStatus.Playing, () => this.onPlay());
        this.on(AudioPlayerStatus.Idle, () => this.onIdle());

        this.on("error", (error) => {
            console.error("Error:", error.message, "with track", error);
        });
    }

    public connect(voiceChannel: VoiceBasedChannel): VoiceConnection {
        const existingConnection = getVoiceConnection(this.guildId);
        if (existingConnection?.joinConfig.channelId == voiceChannel.id)
            return existingConnection;

        const connection = joinVoiceChannel({
            channelId: voiceChannel.id,
            guildId: this.guildId,
            adapterCreator: voiceChannel.guild.voiceAdapterCreator,
        });

        connection.subscribe(this);

        connection.on(
            VoiceConnectionStatus.Disconnected,
            async (_oldState, _newState) => {
                try {
                    await Promise.race([
                        entersState(
                            connection,
                            VoiceConnectionStatus.Signalling,
                            5_000
                        ),
                        entersState(
                            connection,
                            VoiceConnectionStatus.Connecting,
                            5_000
                        ),
                    ]);
                    // Seems to be reconnecting to a new channel - ignore disconnect
                } catch (error) {
                    // Seems to be a real disconnect which SHOULDN'T be recovered from
                    connection.destroy();
                }
            }
        );

        return connection;
    }

    public disconnect(): void {
        getVoiceConnection(this.guildId)?.destroy();
        this.stop();
        this.clearTimeout();
    }

    public setTimeout(): void {
        if (!this.timeout) {
            this.timeout = setTimeout(() => {
                this.disconnect();
            }, this.idleTimer);
        }
    }

    stop(force?: boolean): boolean {
        this.stoped = true;
        return super.stop(force);
    }

    public clearTimeout(): void {
        if (this.timeout) {
            clearTimeout(this.timeout);
            this.timeout = null;
        }
    }

    private onPlay(): void {
        this.clearTimeout();
    }

    private onIdle(): void {
        this.setTimeout();
    }

    public isStoped(): boolean {
        return this.stoped;
    }
}
