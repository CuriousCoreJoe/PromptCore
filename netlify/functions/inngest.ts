// @ts-nocheck
// import { Inngest } from "inngest";
// import { serve } from "inngest/lambda";
// import { createClient } from "@supabase/supabase-js";

// Use require to avoid build-time bundling issues
const { Inngest } = require("inngest");
const { serve } = require("inngest/lambda");

// Force production mode for Inngest SDK only if not in local dev
if (!process.env.NETLIFY_DEV) {
    if (!process.env.NODE_ENV || process.env.NODE_ENV === 'undefined') {
        process.env.NODE_ENV = 'production';
    }
    process.env.INNGEST_ENV = 'production';
    process.env.INNGEST_DEV = 'false';
} else {
    console.log("✅ Inngest running in DEV mode (NETLIFY_DEV is set)");
    process.env.INNGEST_DEV = '1';
}

// 1. Setup Inngest Client
if (!process.env.INNGEST_SIGNING_KEY) {
    console.warn("INNGEST_SIGNING_KEY is missing from environment. Sync will fail.");
}

if (process.env.NETLIFY_DEV) {
    // Force HTTP for local dev to avoid "server gave HTTP response to HTTPS client"
    process.env.URL = "http://127.0.0.1:8888";
    process.env.HTTPS = "false";
}

const inngest = new Inngest({
    id: "promptorigin-app-http",
    signingKey: process.env.INNGEST_SIGNING_KEY
});

// 2. Constants
const DIFFICULTY_LEVELS = ["Beginner", "Intermediate", "Advanced"];
const STYLES = ["Strict & Organized", "Creative & Loose", "Step-by-Step Tutor", "Socratic Method"];

const MASTER_SYSTEM_PROMPT = `
You are 'PromptOrigin', the world's best AI curriculum designer. Your goal is to build helpful, high-value prompt assets for everyday users (B2C) and professionals (B2B).

THE OBJECTIVE:
You must generate a structured AI Prompt Pack based on the User's Request.

THE 4 "MODES" YOU MUST ADAPT TO:
1. "Curriculum Mode" (e.g., Learn Spanish): Break the goal into steps. The prompt should act as a tutor.
2. "Task Mode" (e.g., Meal Prep): The prompt should act as a logistics manager (lists, schedules).
3. "Creative Mode" (e.g., Write a Novel): The prompt should act as a muse or editor.
4. "Expert Mode" (e.g., Python Coding): The prompt should be technical, precise, and code-heavy.

QUALITY RULES:
- No "AI fluff" (e.g., "Unleash your potential", "Dive deep").
- Prompts must be actionable immediately.
- If the difficulty is "Beginner", use simple language.
- If the difficulty is "Advanced", use technical jargon appropriate for the niche.
`;

// 3. Define Function
const generatePack = inngest.createFunction(
    { id: "generate-consumer-pack" },
    { event: "app/pack.requested" },
    async ({ event, step }) => {
        const { niche, count, userId, packId } = event.data;

        // Init clients inside handler
        const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
        const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
        const openRouterKey = process.env.OPENROUTER_API_KEY;

        if (!supabaseUrl || !supabaseKey || !openRouterKey) {
            console.error("Missing Env Vars in Inngest Function:", {
                supabaseUrl: !!supabaseUrl,
                supabaseKey: !!supabaseKey,
                openRouterKey: !!openRouterKey
            });
            throw new Error(`Missing Env Vars: ${[
                !supabaseUrl && "SUPABASE_URL",
                !supabaseKey && "SUPABASE_SERVICE_ROLE_KEY",
                !openRouterKey && "OPENROUTER_API_KEY"
            ].filter(Boolean).join(", ")}`);
        }

        // Dynamic import for Supabase
        const { createClient } = require("@supabase/supabase-js");
        const supabase = createClient(supabaseUrl, supabaseKey);

        // Initial update to 'processing'
        await step.run("start-pack", async () => {
            const { error } = await supabase
                .from("packs")
                .update({ status: 'processing', total_count: 0 })
                .eq("id", packId);
            if (error) throw error;
        });

        const results = [];
        const totalToGenerate = count;

        for (let i = 0; i < totalToGenerate; i++) {
            const item = await step.run(`generate-item-${i}`, async () => {
                const isMock = process.env.MOCK_AI === 'true';

                if (isMock) {
                    console.log(`🤖 MOCK_AI Active (Item #${i + 1})`);
                    return {
                        title: `Mock Prompt #${i + 1}`,
                        category: "Mocking",
                        difficulty: "Beginner",
                        description: "This is a fast mock for local testing.",
                        prompt_content: `MOCK PROMPT: How to ${niche} - Step ${i + 1}`,
                        usage_guide: "No guide for mock data.",
                        style_var: "Mock"
                    };
                }

                const diff = DIFFICULTY_LEVELS[Math.floor(Math.random() * DIFFICULTY_LEVELS.length)];
                const style = STYLES[Math.floor(Math.random() * STYLES.length)];

                const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
                    method: "POST",
                    headers: {
                        "Authorization": `Bearer ${openRouterKey}`,
                        "Content-Type": "application/json",
                        "HTTP-Referer": "https://promptorigin.com",
                        "X-Title": "PromptOrigin"
                    },
                    body: JSON.stringify({
                        model: "google/gemini-2.0-flash-001",
                        messages: [
                            {
                                role: "system",
                                content: MASTER_SYSTEM_PROMPT + "\n\nIMPORTANT: Return ONLY a valid JSON object with the following fields: title, category, difficulty, description, prompt_content, usage_guide. Do not include markdown formatting like ```json."
                            },
                            {
                                role: "user",
                                content: `Generate one unique prompt for the niche '${niche}'. Item #${i + 1} of ${totalToGenerate}. Target Audience: ${diff}. Tone/Style: ${style}.`
                            }
                        ],
                        response_format: { type: "json_object" }
                    })
                });

                if (!response.ok) {
                    const errText = await response.text();
                    throw new Error(`OpenRouter API Error: ${response.status} - ${errText}`);
                }

                const json = await response.json();
                const content = json.choices[0]?.message?.content || "{}";
                const data = JSON.parse(content);
                
                return { ...data, style_var: style };
            });

            await step.run(`save-item-${i}`, async () => {
                const { error } = await supabase.from("generated_prompts").insert({
                    pack_id: packId,
                    title: item.title,
                    category: item.category,
                    difficulty: item.difficulty,
                    description: item.description,
                    prompt_content: item.prompt_content,
                    usage_guide: item.usage_guide,
                    style_var: item.style_var
                });
                if (error) throw error;
            });

            results.push(item);
        }

        await step.run("finalize-pack", async () => {
            await supabase
                .from("packs")
                .update({ status: 'completed', total_count: results.length })
                .eq("id", packId);
        });

        return { count: results.length };
    }
);

// 4. Export Handler
const serveOptions = {
    client: inngest,
    functions: [generatePack],
    signingKey: process.env.INNGEST_SIGNING_KEY,
};

if (process.env.NETLIFY_DEV) {
    serveOptions.serveUrl = "http://127.0.0.1:8888/.netlify/functions/inngest";
}

const inngestHandler = serve(serveOptions);

export const handler = async (event, context) => {
    if (process.env.NETLIFY_DEV) {
        // Force headers to look like HTTP to trick Inngest SDK
        event.headers = event.headers || {};
        event.headers['x-forwarded-proto'] = 'http';
        event.headers['host'] = '127.0.0.1:8888';
        
        // Also for multiValueHeaders if present
        if (event.multiValueHeaders) {
             event.multiValueHeaders['x-forwarded-proto'] = ['http'];
             event.multiValueHeaders['host'] = ['127.0.0.1:8888'];
        }
    }
    
    const response = await inngestHandler(event, context);
    
    // Log body to verify what URL we are advertising
    if (response.statusCode === 200 && event.httpMethod === 'PUT') {
         console.log("✅ Registration Body:", response.body ? response.body.substring(0, 500) : "No Body");
    }
    
    return response;
};
