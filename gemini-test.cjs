const { GoogleGenerativeAI } = require("@google/generative-ai");
const fs = require('fs');

async function test() {
    try {
        const apiKey = process.argv[2];
        if (!apiKey) throw new Error("API Key required");

        const genAI = new GoogleGenerativeAI(apiKey);
        const modelNames = ["imagen-3.0-generate-001", "imagen-3.0-fast-generate-001"];

        for (const name of modelNames) {
            console.log(`Testing model: ${name}`);
            const model = genAI.getGenerativeModel({
                model: name,
                generationConfig: {
                    responseModalities: ["image", "text"],
                }
            });

            try {
                const result = await model.generateContent("A simple red apple on a white background.");
                const response = result.response;
                if (response.candidates?.[0]?.content?.parts) {
                    console.log(`SUCCESS with ${name}! Found parts.`);
                    return;
                } else {
                    console.log(`Model ${name} returned no parts.`);
                }
            } catch (e) {
                console.error(`Error with ${name}:`, e.message);
            }
        }
    } catch (err) {
        console.error("Test failed:", err.message);
    }
}

test();
