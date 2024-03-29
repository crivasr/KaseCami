import { ClientEvents } from "discord.js";
import DiscordClient from "../Client";

export default abstract class EventHandler<T extends keyof ClientEvents> {
    readonly client;

    constructor(client: DiscordClient) {
        this.client = client;
    }

    public abstract handle(a: ClientEvents[T]): void | Promise<void>;
}
