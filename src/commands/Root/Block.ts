import {
    ChatInputCommandInteraction,
    SlashCommandBuilder,
    PermissionFlagsBits,
    SlashCommandOptionsOnlyBuilder,
    InteractionContextType,
} from "discord.js";
import { UserModel } from "../../database/models/UserModel";
import Command, { Category } from "../Command";

export default class Block extends Command {
    readonly category = Category.Root;

    public async slashExecutor(
        interaction: ChatInputCommandInteraction
    ): Promise<any> {
        const user = interaction.options.getUser("user", true);
        const reason = interaction.options.getString("reason", false);

        const query = { userId: user.id };
        const update = { blacklisted: true, reason };
        const options = { upsert: true, setDefaultsOnInsert: true };

        const blockedUser = await UserModel.findOne(query);
        if (blockedUser?.blacklisted)
            return interaction.reply("User already blocked.");

        UserModel.findOneAndUpdate(query, update, options);
        interaction.reply(
            `**${user.username}** blocked with reason: \n>>> ${reason}`
        );
    }

    public commandBuilder(): Partial<SlashCommandOptionsOnlyBuilder> {
        return new SlashCommandBuilder()
            .setContexts(InteractionContextType.Guild)
            .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
            .setName("block")
            .setDescription("Block user from using the bot")
            .addUserOption((option) =>
                option
                    .setName("user")
                    .setDescription("user to block")
                    .setRequired(true)
            )
            .addStringOption((option) =>
                option
                    .setName("reason")
                    .setDescription("reason of the block")
                    .setRequired(false)
            );
    }
}
