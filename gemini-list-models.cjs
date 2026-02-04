const { GoogleGenerativeAI } = require("@google/generative-ai");

async function test() {
    try {
        const apiKey = process.argv[2];
        if (!apiKey) throw new Error("API Key required");

        const genAI = new GoogleGenerativeAI(apiKey);
        // The SDK doesn't have a direct listModels, we have to use fetch or the underlying client if available
        // But we can try to use the REST API directly
        const fetch = require('node-fetch');
        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`);
        const data = await response.json();

        console.log(JSON.stringify(data, null, 2));
    } catch (err) {
        console.error("Test failed:", err.message);
    }
}

test();
