import { ClientEvents, Events } from "discord.js";
import EventHandler from "./EventHandler";
import Ags from "../commands/Utility/Ags";
import { client } from "..";

export default class MessageHandler extends EventHandler<Events.MessageCreate> {
    public async handle(
        args: ClientEvents[Events.MessageCreate]
    ): Promise<void> {
        const [message] = args;

        try {
            if (message.author.id == client.user!.id) return;
            if (message.channelId == "1096544364777459742")
                Ags.findCode(message);
            if (message.author.bot) return;

            const prefix = this.client.prefix;
            if (!message.content.startsWith(prefix)) return;

            const msgArgs = message.content.split(" ");
            const commandName = msgArgs.shift()!.slice(prefix.length);
            const command = this.client.commands.get(commandName);

            if (command == undefined) return;
            if (command.onlySlash) return;
            if (!command.messageExecutor) return;

            await command.messageExecutor(message, msgArgs);
        } catch (err) {
            console.error(err);
            message
                .reply("Ocurrio un error el ejecutar ese comando.")
                .catch((err) => {
                    console.error(err);
                });
        }
    }
}
