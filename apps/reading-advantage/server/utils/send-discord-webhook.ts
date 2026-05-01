
// Send Discord webhook
// Send a Discord webhook with the provided title, embeds, and URL
interface SendWebhookParams {
    title: string;
    embeds: Embeds[];
    reqUrl: string;
    webhookUrl?: string;
    userAgent?: string;
    color?: number;
}

interface Embeds {
    description: Record<string, string>;
    color: number;
}

// Format details for Discord webhook
// Format the details object into a string
function formatDetails(details: Record<string, string>): string {
    return Object.entries(details)
        .map(([key, value]) => `**${key}:** ${value}`)
        .join("\n");
}

export async function sendDiscordWebhook({
    title,
    embeds,
    webhookUrl = process.env.DISCORD_WEBHOOK_URL as string,
    userAgent = "test-user-agent",
    reqUrl,
    color = 0x0099ff,
}: SendWebhookParams) {
    // Format the embeds
    const embedsFormatted = embeds.map((embed) => {
        return {
            title: "Details",
            description: formatDetails(embed.description),
            color: embed.color,
        };
    });

    // Prepare the request options
    const options: RequestInit = {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
        },
        body: JSON.stringify({
            embeds: [
                {
                    title: `${title} - ${process.env.NODE_ENV} mode`,
                    description: `**triggered at:** <t:${Math.floor(
                        Date.now() / 1000
                    )}:R> \n**user-agent:** ${userAgent} \n**url:** ${reqUrl}`,
                    color: color,
                },
                ...embedsFormatted,
            ],
        }),
    };

    try {
        await fetch(webhookUrl, options);
    } catch (error) {
        console.error("failed to send webhook", error);
        throw new Error(`failed to send webhook: ${error}`);
    }
}
