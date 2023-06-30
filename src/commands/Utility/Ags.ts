import { ChatInputCommandInteraction, SlashCommandBuilder } from "discord.js";
import Command from "../../structures/Command";
import { UserModel } from "../../database/models/UserModel";
import { User } from "../../database/interfaces/UserInterface";
import Tesseract from 'tesseract.js';

enum AgsResponses {
    INVALID_CODE = "El código no es válido.",
    MAX_USES = "Este código llegó a su límite de usos.",
    ALREADY_CLAIMED = "Este reward se puede usar solo 1 vez por entrada.",
    INVALID_TOKEN = "Tenes que estar logeado para poder canjear un código.",
}

const hasToken = { agsToken: { $ne: null } };

export default class Ags extends Command {
    // readonly category = Category.Test;
    readonly onlySlash = true;

    public async slashExecutor(interaction: ChatInputCommandInteraction): Promise<void> {
        const subcommand = interaction.options.getSubcommand(true);
        if (subcommand == "claim") return Ags.claimCommand(interaction);
        if (subcommand == "link") return Ags.linkCommand(interaction);
        if (subcommand == "check") {
            const user = (await UserModel.findOne({userId: interaction.user.id}))!;
            if (!user.agsToken) {interaction.reply("No esta linkeada la cuenta"); return};
            const valid = await Ags.checktoken(user.agsToken);
            interaction.reply(`El token ${valid ? '': 'no '}es valido`);
        }
    }

    public static async claimCommand(interaction: ChatInputCommandInteraction): Promise<void> {
        let code = interaction.options.getString("code", false);
        interaction.deferReply();
        if (!code) {
            const attachment = interaction.options.getAttachment("image", false)
            if (attachment) {
                const result = await Tesseract.recognize(attachment.url);
                code = result.data.text.replaceAll("\n","").replaceAll("'", "!").replaceAll(":", "");
                console.log(result.data.text);
            }
        }
        if (!code) {
            interaction.editReply("No pasaste ningun codigo master");
            return;
        }
        const msg = await Ags.claimForAll(code);
        interaction.editReply(`Code: **${code}**:\n${msg}`);
    }

    public static async claimForAll(code: string): Promise<string> {
        const users: User[] = await UserModel.find(hasToken);

        const promises: Promise<string>[] = users.map(async (user) => {
            const res = await Ags.claim(user.agsToken!, code);
            return `<@${user.userId}>: ${res}\n`
        });

        const results = await Promise.all(promises);
        return results.join("");
    }

    private static async claim(token: string, code: string): Promise<string> {
        try {
            const data = await fetch(`https://app.argentinagameshow.com/custom/ajax/reward2.php?action=code&code=${code}`, {
                headers: {
                    'Cookie': `PHPSESSID=${token}`
                }
            })
            const json: { text: string } = await data.json();
            return json.text;
        } catch (e) {
            console.log(e);
            return "Error interno";
        }
    }

    public static async linkCommand(interaction: ChatInputCommandInteraction): Promise<void> {
        const token = interaction.options.getString("token", true);
        const userid = interaction.user.id;

        const validToken = await Ags.checktoken(token);
        if (!validToken) {
            interaction.reply({content: "Token invalido", ephemeral: true});
            return;
        }

        await UserModel.findOneAndUpdate({ userId: userid }, { agsToken: token }, { upsert: true, setDefaultsOnInsert: true });
        interaction.reply({content: "Tu cuenta de AGS ha sido linkeada con exito!", ephemeral: true});
    }

    private static async checktoken(token: string): Promise<boolean> {
        const res = await Ags.claim(token, "asd");
        return res != AgsResponses.INVALID_TOKEN;
    }

    public static async checkCode(code: string): Promise<boolean> {
        const users = await UserModel.find(hasToken);

        const randomUserIndex = Math.floor(users.length * Math.random());
        const user = users[randomUserIndex];

        const token = user.agsToken!;
        const res = await Ags.claim(token, code);
        return res != AgsResponses.INVALID_CODE;
    }

    public commandBuilder(): Partial<SlashCommandBuilder> {
        return new SlashCommandBuilder()
            .setDMPermission(true)
            .setName("ags")
            .setDescription("reclama codigos de la ags")
            .addSubcommand(subcommand =>
                subcommand
                    .setName('claim')
                    .setDescription('reclama codigos de la ags')
                    .addAttachmentOption(option => 
                        option.setName('image')
                            .setRequired(false)
                            .setDescription('imagen con el codigo'))
                    .addStringOption(option => 
                        option.setName('code')
                            .setRequired(false)
                            .setDescription('codigo a reclamar')))
            
            .addSubcommand(subcommand =>
                subcommand
                    .setName('link')
                    .setDescription('linkea tu cuenta de AGS')
                    .addStringOption(option => 
                        option.setName('token')
                            .setRequired(true)
                            .setDescription('tu token de la pagina de la AGS')))
            .addSubcommand(subcommand =>
                subcommand
                    .setName('check')
                    .setDescription('checkea si esta linkeada tu cuenta de AGS'))
    }
}