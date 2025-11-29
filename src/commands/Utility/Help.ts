import {
    chatInputApplicationCommandMention,
    ChatInputCommandInteraction,
    InteractionContextType,
    Message,
    SlashCommandBuilder,
    SlashCommandOptionsOnlyBuilder,
    SlashCommandSubcommandBuilder,
    SlashCommandSubcommandGroupBuilder,
    SlashCommandSubcommandsOnlyBuilder,
} from "discord.js";
import Command, { Category } from "../Command";

export default class Help extends Command {
    readonly category = Category.Utility;
    readonly onlySlash = false;

    public async slashExecutor(
        interaction: ChatInputCommandInteraction
    ): Promise<void> {
        this.executor(interaction);
    }

    public async messageExecutor(
        message: Message,
        _args: string[]
    ): Promise<void> {
        this.executor(message);
    }

    private executor(caller: Message | ChatInputCommandInteraction) {
        const commands = this.client.commands;
        const commandIds = this.client.commandIds;

        const options = commands
            .filter((command) => command.category != Category.Root)
            .map((command) => {
                const commandName = command.commandBuilder().name!;
                const commandId = commandIds.get(commandName)!;
                return this.generateHelpMessage(
                    command.commandBuilder(),
                    commandName,
                    commandId
                );
            });

        caller.reply(options.join("\n"));
    }

    private generateHelpMessage(
        command: Partial<
            | SlashCommandSubcommandBuilder
            | SlashCommandBuilder
            | SlashCommandSubcommandGroupBuilder
            | SlashCommandSubcommandsOnlyBuilder
            | SlashCommandOptionsOnlyBuilder
        >,
        name: string,
        id: string
    ): string {
        const options = command.options;
        const emptyOptions = options?.length == 0;
        if (!options || emptyOptions) {
            return chatInputApplicationCommandMention(name, id);
        }

        // es suficiente checkear el primero porque si no es subcommand ni subgroup
        // entonces todos son opciones base
        const isSubCommand =
            options[0] instanceof SlashCommandSubcommandBuilder;
        const isSubCommandGroup =
            options[0] instanceof SlashCommandSubcommandGroupBuilder;
        if (!isSubCommand && !isSubCommandGroup) {
            const usage = options.map((option) => {
                const optionJSON = option.toJSON();
                return optionJSON.required
                    ? `<${optionJSON.name}>`
                    : `[${optionJSON.name}]`;
            });

            const commandMention = chatInputApplicationCommandMention(name, id);
            return `${commandMention} ${usage.join(" ")}`;
        }

        return options
            .map((option) => {
                const isSubCommand =
                    option instanceof SlashCommandSubcommandBuilder;
                const isSubCommandGroup =
                    option instanceof SlashCommandSubcommandGroupBuilder;
                if (!isSubCommand && !isSubCommandGroup) return "";

                const optionJSON = option.toJSON();
                return this.generateHelpMessage(
                    option,
                    `${name} ${optionJSON.name}`,
                    id
                );
            })
            .filter((str) => str != "")
            .join("\n");
    }

    public commandBuilder(): SlashCommandBuilder {
        return new SlashCommandBuilder()
            .setContexts([
                InteractionContextType.BotDM,
                InteractionContextType.Guild,
                InteractionContextType.PrivateChannel,
            ])
            .setName("help")
            .setDescription("get help");
    }
}
