import { Handler } from "@netlify/functions";

const handler: Handler = async (event, context) => {
    const headers = {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Headers": "Content-Type, Authorization",
        "Access-Control-Allow-Methods": "POST, OPTIONS",
        "Content-Type": "application/json"
    };

    if (event.httpMethod === "OPTIONS") {
        return { statusCode: 200, headers, body: "OK" };
    }

    if (event.httpMethod !== "POST") {
        return { statusCode: 405, headers, body: JSON.stringify({ error: "Method Not Allowed" }) };
    }

    try {
        let parsedBody;
        try {
            parsedBody = JSON.parse(event.body || "{}");
        } catch (parseError) {
            console.error("Body parse error:", parseError);
            return {
                statusCode: 400,
                headers,
                body: JSON.stringify({ error: "Invalid JSON in request body" })
            };
        }

        const { prompt, userId, conversationHistory = [], model: requestedModel } = parsedBody;

        if (!prompt) {
            return {
                statusCode: 400,
                headers,
                body: JSON.stringify({ error: "Prompt is required" })
            };
        }

        const geminiKey = (process.env.LOCAL_GEMINI_KEY || process.env.GEMINI_API_KEY || process.env.API_KEY || "").trim();

        if (!geminiKey) {
            console.error("Missing Gemini API key - checked LOCAL_GEMINI_KEY, GEMINI_API_KEY, API_KEY");
            return {
                statusCode: 500,
                headers,
                body: JSON.stringify({ error: "No Gemini API key configured. Please add GEMINI_API_KEY to environment variables." })
            };
        }

        // Always use Gemini for execution - map user's selected model to actual Gemini model
        const { GoogleGenerativeAI } = require("@google/generative-ai");
        const genAI = new GoogleGenerativeAI(geminiKey);

        // Map frontend model names to actual Gemini API models
        // Available AIModel types: 'gpt-5' | 'gemini-3-pro' | 'claude-sonnet-4.5' | 'gemini-3-flash'
        const modelMapping: Record<string, string> = {
            'gemini-3-pro': 'gemini-2.0-flash',
            'gemini-3-flash': 'gemini-2.0-flash',
            'gpt-5': 'gemini-2.0-flash',
            'claude-sonnet-4.5': 'gemini-2.0-flash'
        };

        const requestedModelLower = requestedModel?.toLowerCase() || '';
        const geminiModel = modelMapping[requestedModelLower] || 'gemini-2.0-flash';

        console.log(`Execute: User selected "${requestedModel}", using Gemini model "${geminiModel}"`);

        const model = genAI.getGenerativeModel({
            model: geminiModel,
            systemInstruction: "You are a helpful AI assistant. Execute the user's prompt directly and provide a complete, useful response."
        });

        // Build conversation history - filter out invalid entries
        const history = (conversationHistory || [])
            .filter((msg: any) => msg && msg.content && typeof msg.content === 'string')
            .map((msg: any) => ({
                role: msg.role === 'model' ? 'model' : 'user',
                parts: [{ text: msg.content }]
            }));

        console.log(`Starting chat with ${history.length} history messages`);

        const chat = model.startChat({ history });
        const result = await chat.sendMessage(prompt);
        const responseText = result.response.text();

        console.log(`Execute successful, response length: ${responseText.length}`);

        return {
            statusCode: 200,
            headers,
            body: JSON.stringify({ text: responseText, model: geminiModel }),
        };

    } catch (err: any) {
        console.error("Execute Error:", err);
        console.error("Error stack:", err.stack);

        // Provide more specific error messages
        let errorMessage = "Execution failed";
        if (err.message?.includes("API key")) {
            errorMessage = "Invalid API key. Please check your Gemini API key configuration.";
        } else if (err.message?.includes("quota")) {
            errorMessage = "API quota exceeded. Please try again later or upgrade your plan.";
        } else if (err.message?.includes("model")) {
            errorMessage = "Model not available. Please try a different model.";
        } else if (err.message) {
            errorMessage = err.message;
        }

        return {
            statusCode: 500,
            headers,
            body: JSON.stringify({ error: errorMessage })
        };
    }
};

export { handler };
