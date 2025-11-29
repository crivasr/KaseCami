import {
    AutocompleteInteraction,
    ChatInputCommandInteraction,
    Message,
    SlashCommandBuilder,
    SlashCommandOptionsOnlyBuilder,
    SlashCommandSubcommandsOnlyBuilder,
} from "discord.js";
import DiscordClient from "../Client";

export enum Category {
    Voice = "Voice",
    Moderation = "Moderation",
    Utility = "Utility",
    Fun = "Fun",
    Config = "Config",
    Games = "Games",
    Root = "Root",
    Test = "Test",
}

export default abstract class Command {
    readonly category: Category | undefined;
    readonly client: DiscordClient;
    readonly onlySlash: boolean = true;

    constructor(client: DiscordClient) {
        this.client = client;
    }

    public getCategory() {
        return this.category;
    }

    public abstract slashExecutor(
        interaction: ChatInputCommandInteraction
    ): Promise<void> | void;
    public messageExecutor?(
        message: Message,
        args: string[]
    ): Promise<void> | void;
    public abstract commandBuilder(): Partial<
        | SlashCommandBuilder
        | SlashCommandOptionsOnlyBuilder
        | SlashCommandSubcommandsOnlyBuilder
    >;
    public autocomplete(
        interaction: AutocompleteInteraction
    ): Promise<void> | void {
        throw new Error(
            `Autocomplete not implemented for ${interaction.commandName}`
        );
    }
}
