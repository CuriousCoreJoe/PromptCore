import { Handler } from "@netlify/functions";

export const handler: Handler = async (event, context) => {
    console.log(`[Factory] Request received: ${event.httpMethod} ${event.path}`);
    
    const headers = {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Headers": "Content-Type, Authorization",
        "Access-Control-Allow-Methods": "POST, OPTIONS",
        "Content-Type": "application/json"
    };

    if (event.httpMethod === "OPTIONS") {
        return { statusCode: 200, headers, body: "OK" };
    }

    return {
        statusCode: 200,
        headers,
        body: JSON.stringify({ message: "Factory is alive", packId: "test-pack-id" }),
    };
};
