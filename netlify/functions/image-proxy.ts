import { Handler } from "@netlify/functions";

export const handler: Handler = async (event, context) => {
    const { prompt, seed } = event.queryStringParameters || {};

    if (!prompt) {
        return { statusCode: 400, body: "Prompt is required" };
    }

    try {
        const encoded = encodeURIComponent(prompt).replace(/\(/g, '%28').replace(/\)/g, '%29');
        const seedParam = seed || Math.floor(Math.random() * 1000000);
        const url = `https://image.pollinations.ai/prompt/${encoded}?width=1024&height=1024&nologo=true&seed=${seedParam}&model=flux`;

        console.log(`[ImageProxy] Fetching: ${url}`);
        const response = await fetch(url);

        if (!response.ok) {
            return { statusCode: response.status, body: "Failed to fetch image" };
        }

        const arrayBuffer = await response.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);

        return {
            statusCode: 200,
            headers: {
                "Content-Type": "image/jpeg",
                "Cache-Control": "public, max-age=31536000"
            },
            body: buffer.toString('base64'),
            isBase64Encoded: true
        };
    } catch (error: any) {
        console.error(`[ImageProxy] Error:`, error);
        return { statusCode: 500, body: error.message };
    }
};
