import {
    ChatInputCommandInteraction,
    InteractionContextType,
    Message,
    SlashCommandBuilder,
    SlashCommandSubcommandsOnlyBuilder,
} from "discord.js";
import Command, { Category } from "../Command";
import { UserModel } from "../../database/models/UserModel";
import { User } from "../../database/interfaces/UserInterface";
import Tesseract from "tesseract.js";

enum AgsResponses {
    INVALID_CODE = "El código no es válido.",
    MAX_USES = "Este código llegó a su límite de usos.",
    ALREADY_CLAIMED = "Este reward se puede usar solo 1 vez por entrada.",
    INVALID_TOKEN = "Tenes que estar logeado para poder canjear un código.",
}

const HAS_TOKEN_QUERY = { agsToken: { $ne: null } };

export default class Ags extends Command {
    readonly category = Category.Utility;
    readonly onlySlash = true;

    public async slashExecutor(
        interaction: ChatInputCommandInteraction
    ): Promise<void> {
        const subcommand = interaction.options.getSubcommand(true);
        if (subcommand == "claim") return Ags.claimCommand(interaction);
        if (subcommand == "link") return Ags.linkCommand(interaction);
        if (subcommand == "check") {
            const user = await UserModel.findOne({
                userId: interaction.user.id,
            });
            if (!user || !user.agsToken) {
                interaction.reply("No esta linkeada la cuenta");
                return;
            }
            const valid = await Ags.checktoken(user.agsToken);
            interaction.reply(`El token ${valid ? "es" : "no es"} valido`);
        }
    }

    public static async claimCommand(
        interaction: ChatInputCommandInteraction
    ): Promise<void> {
        let code = interaction.options.getString("code", false);
        await interaction.deferReply();
        if (!code) {
            const attachment = interaction.options.getAttachment(
                "image",
                false
            );
            if (attachment) {
                const result = await Tesseract.recognize(attachment.url);
                code = result.data.text
                    .replaceAll("\n", "")
                    .replaceAll("'", "!")
                    .replaceAll(":", "");
            }
        }
        if (!code) {
            interaction.editReply("No pasaste ningun codigo master");
            return;
        }
        const msg = await this.claimForAll(code);
        interaction.editReply(`Code: **${code}**:\n${msg}`);
    }

    public static async claimForAll(code: string): Promise<string> {
        const users: User[] = await UserModel.find(HAS_TOKEN_QUERY);

        const promises: Promise<string>[] = users.map(async (user) => {
            const res = await this.claim(user.agsToken!, code);
            return `<@${user.userId}>: ${res}`;
        });

        const results = await Promise.all(promises);
        return results.join("\n");
    }

    private static async claim(token: string, code: string): Promise<string> {
        try {
            const data = await fetch(
                `https://app.argentinagameshow.com/custom/ags/ajax/rew.php?action=code&code=${code}`,
                {
                    headers: {
                        Cookie: `PHPSESSID=${token}`,
                    },
                }
            );
            const json: { text: string } = await data.json();
            return this.extractText(json.text).split("\n")[0];
        } catch (err) {
            console.error(err);
            return "Error interno";
        }
    }

    private static extractText(html: string): string {
        const regex = new RegExp(/([<][a-z][^<]*>)|([<][\/][a-z]*>)/g);
        return html
            .replaceAll("\n", "")
            .replaceAll("</", " </") // esto puede agregar doble espacio si ya tenia uno de antes
            .replaceAll("<br> ", "\n")
            .replaceAll(regex, "")
            .replaceAll("  ", " ") // sacar los espacios dobles
            .replaceAll("\n ", "\n") // evitar que una linea arranque con un espacio
            .replaceAll("\r", "")
            .replaceAll(/^\s*/g, "");
    }

    public static async linkCommand(
        interaction: ChatInputCommandInteraction
    ): Promise<void> {
        const token = interaction.options.getString("token", true);
        const userid = interaction.user.id;

        const validToken = await Ags.checktoken(token);
        if (!validToken) {
            interaction.reply({ content: "Token invalido", ephemeral: true });
            return;
        }

        await UserModel.findOneAndUpdate(
            { userId: userid },
            { agsToken: token },
            { upsert: true, setDefaultsOnInsert: true }
        );
        interaction.reply({
            content: "Tu cuenta de AGS ha sido linkeada con exito!",
            ephemeral: true,
        });
    }

    private static async checktoken(token: string): Promise<boolean> {
        const res = await Ags.claim(token, "asd");
        return res != AgsResponses.INVALID_TOKEN;
    }

    public static async checkCode(code: string): Promise<boolean> {
        const users = await UserModel.find(HAS_TOKEN_QUERY);

        const randomUserIndex = Math.floor(users.length * Math.random());
        const user = users[randomUserIndex];

        const token = user.agsToken!;
        const res = await Ags.claim(token, code);
        return res != AgsResponses.INVALID_CODE;
    }

    public static async findCode(message: Message<boolean>) {
        const words = message.content
            .split("\n")
            .map((line) =>
                line
                    .replaceAll(":", " ")
                    .replaceAll(">", " ")
                    .replaceAll("*", "")
                    .replaceAll("<", " ")
                    .split(" ")
            )
            .flat();
        const regex = new RegExp(/[A-Z]+[a-z]+[A-Z]/);
        const filteredWords = words.filter((word) => regex.test(word));

        const promises: Promise<string>[] = filteredWords.map(async (word) => {
            const validCode = await Ags.checkCode(word);
            if (!validCode) return "";
            let res = `Code **${word}**:\n`;
            res += await Ags.claimForAll(word);
            return res;
        });

        const results = await Promise.all(promises);
        const replyMessage = results.filter((res) => res !== "").join("\n");
        if (replyMessage !== "") {
            message.reply(replyMessage);
        }
    }

    public commandBuilder(): Partial<SlashCommandSubcommandsOnlyBuilder> {
        return new SlashCommandBuilder()
            .setContexts(
                InteractionContextType.Guild,
                InteractionContextType.BotDM,
                InteractionContextType.PrivateChannel
            )
            .setName("ags")
            .setDescription("reclama codigos de la ags")
            .addSubcommand((subcommand) =>
                subcommand
                    .setName("claim")
                    .setDescription("reclama codigos de la ags")
                    .addAttachmentOption((option) =>
                        option
                            .setName("image")
                            .setRequired(false)
                            .setDescription("imagen con el codigo")
                    )
                    .addStringOption((option) =>
                        option
                            .setName("code")
                            .setRequired(false)
                            .setDescription("codigo a reclamar")
                    )
            )

            .addSubcommand((subcommand) =>
                subcommand
                    .setName("link")
                    .setDescription("linkea tu cuenta de AGS")
                    .addStringOption((option) =>
                        option
                            .setName("token")
                            .setRequired(true)
                            .setDescription("tu token de la pagina de la AGS")
                    )
            )
            .addSubcommand((subcommand) =>
                subcommand
                    .setName("check")
                    .setDescription("checkea si esta linkeada tu cuenta de AGS")
            );
    }
}
