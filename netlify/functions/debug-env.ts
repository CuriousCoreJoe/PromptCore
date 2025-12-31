import { Handler } from "@netlify/functions";

const handler: Handler = async (event, context) => {
    // 1. Read Raw Values (No Trim yet)
    const rawGemini = process.env.GEMINI_API_KEY;
    const rawApi = process.env.API_KEY;

    // 2. Process
    const candidates = [
        { name: "GEMINI_API_KEY", val: rawGemini },
        { name: "API_KEY", val: rawApi }
    ];

    const report = candidates.map(c => {
        if (!c.val) return { name: c.name, status: "MISSING" };

        const val = c.val;
        const trimmed = val.trim();

        return {
            name: c.name,
            status: "PRESENT",
            length: val.length,
            trimmedLength: trimmed.length,
            firstChar: val.charAt(0),
            firstCharArgs: val.charCodeAt(0),
            lastChar: val.charAt(val.length - 1),
            lastCharArgs: val.charCodeAt(val.length - 1),
            // Check for quotes
            startsWithQuote: val.startsWith('"') || val.startsWith("'"),
            endsWithQuote: val.endsWith('"') || val.endsWith("'"),
            // Safe mask
            mask: `${val.substring(0, 3)}...${val.substring(val.length - 3)}`
        };
    });

    return {
        statusCode: 200,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
            message: "Environment Variable Debug Report",
            environment: process.env.NODE_ENV,
            keys: report
        }, null, 2)
    };
};

export { handler };
