import {
    Client,
    Collection,
    Partials,
    Routes,
    RESTPostAPIChatInputApplicationCommandsJSONBody,
    ClientEvents,
    GatewayIntentBits,
} from "discord.js";
import { REST } from "@discordjs/rest";

import Command, { Category } from "./commands/Command";
import EventHandler from "./handlers/EventHandler";

export default class DiscordClient extends Client {
    public readonly commands = new Collection<string, Command>();
    public readonly prefix: string;
    public readonly commandIds = new Map<string, string>();
    public readonly whitelist = ["285417245667229697"];

    constructor(
        prefix: string,
        intents: GatewayIntentBits[],
        partials: Partials[]
    ) {
        super({ intents, partials });

        this.prefix = prefix;
    }

    public isOwner(userId: string): boolean {
        return this.whitelist.includes(userId);
    }

    public addCommand(command: Command): void {
        const name = command.commandBuilder().name;
        if (name == undefined) throw new Error("Missing name on command");
        this.commands.set(name, command);
    }

    public registerEventHandler<T extends keyof ClientEvents>(
        event: T,
        handler: EventHandler<T>
    ) {
        this.on(event, (...args) => handler.handle(args));
    }

    public async deployCommands(testServers: string[]): Promise<void> {
        console.log(testServers);
        const user = this.user;
        if (user == null || this.token == null)
            throw new Error("Not logged in");

        const userCommands: RESTPostAPIChatInputApplicationCommandsJSONBody[] =
            [];
        const rootCommands: RESTPostAPIChatInputApplicationCommandsJSONBody[] =
            [];

        this.commands.forEach((command) => {
            const json = command.commandBuilder().toJSON!();
            if (
                command.category == Category.Root ||
                command.category == Category.Test
            ) {
                rootCommands.push(json);
            } else {
                userCommands.push(json);
            }
        });

        const rest = new REST({ version: "10" }).setToken(this.token);

        testServers.forEach(async (testServer) => {
            if (testServer == "") return;

            await rest.put(
                Routes.applicationGuildCommands(user.id, testServer),
                {
                    body: rootCommands,
                }
            );
        });

        await rest.put(Routes.applicationCommands(user.id), {
            body: userCommands,
        });

        console.log("Commands successfully deployed");
    }

    public async fetchCommands(): Promise<void> {
        const user = this.user;
        if (user == null || this.token == null)
            throw new Error("Not logged in");
        const rest = new REST({ version: "10" }).setToken(this.token);

        const res = (await rest.get(Routes.applicationCommands(user.id))) as {
            id: string;
            name: string;
        }[];

        this.commandIds.clear();

        res.forEach((command) => {
            this.commandIds.set(command.name, command.id);
        });
        console.log(this.commandIds);
    }
}
