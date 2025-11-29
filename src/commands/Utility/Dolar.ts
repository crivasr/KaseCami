import {
    ChatInputCommandInteraction,
    EmbedBuilder,
    InteractionContextType,
    Message,
    SlashCommandBuilder,
} from "discord.js";
import Command, { Category } from "../Command";

const DOLARHOY = "https://www.dolarhoy.com";

export default class Dolar extends Command {
    readonly category = Category.Utility;
    readonly onlySlash = false;

    public async slashExecutor(
        interaction: ChatInputCommandInteraction
    ): Promise<void> {
        await interaction.deferReply();
        Dolar.executor(interaction);
    }

    public async messageExecutor(
        message: Message,
        _args: string[]
    ): Promise<void> {
        Dolar.executor(message);
    }

    private static async executor(
        caller: Message | ChatInputCommandInteraction
    ) {
        const [blue, oficial, tarjeta] = await Promise.all([
            Dolar.getDolarBlue(),
            Dolar.getDolarOficial(),
            Dolar.getDolarTarjeta(),
        ]);

        const embed = new EmbedBuilder()
            .setTitle("Cotización del dolar")
            .setColor("#278664")
            .addFields(
                {
                    inline: false,
                    name: "Dolar Blue",
                    value: `Compra: ${blue.compra}\nVenta: ${blue.venta}`,
                },
                {
                    inline: false,
                    name: "Dolar Oficial",
                    value: `Compra: ${oficial.compra}\nVenta: ${oficial.venta}`,
                },
                {
                    inline: false,
                    name: "Dolar Tarjeta",
                    value: `Venta: ${tarjeta.venta}`,
                }
            );

        if (caller instanceof Message) await caller.reply({ embeds: [embed] });
        else await caller.editReply({ embeds: [embed] });
    }

    private static async getDolarBlue(): Promise<{
        compra: string;
        venta: string;
    }> {
        const data = await fetch(`${DOLARHOY}/cotizaciondolarblue`);
        const html = await data.text();

        return this.getPrice(html);
    }

    private static async getDolarOficial(): Promise<{
        compra: string;
        venta: string;
    }> {
        const data = await fetch(`${DOLARHOY}/cotizaciondolaroficial`);
        const html = await data.text();

        return this.getPrice(html);
    }

    private static async getDolarTarjeta(): Promise<{
        compra: string;
        venta: string;
    }> {
        const data = await fetch(`${DOLARHOY}/cotizacion-dolar-tarjeta`);
        const html = await data.text();

        return this.getPrice(html);
    }

    private static async getPrice(
        html: string
    ): Promise<{ compra: string; venta: string }> {
        const compraSeparator = 'Compra</div><div class="value">$';
        const ventaSeparator = 'Venta</div><div class="value">$';

        const compraData = html.split(compraSeparator);
        const compra =
            compraData.length > 1
                ? compraData[1].split("<")[0]
                : "No disponible";

        const ventaData = html.split(ventaSeparator);
        const venta =
            ventaData.length > 1 ? ventaData[1].split("<")[0] : "No disponible";

        return { compra, venta };
    }

    public commandBuilder(): SlashCommandBuilder {
        return new SlashCommandBuilder()
            .setContexts(
                InteractionContextType.Guild,
                InteractionContextType.BotDM,
                InteractionContextType.PrivateChannel
            )
            .setName("dolar")
            .setDescription("Valor del dolar");
    }
}
