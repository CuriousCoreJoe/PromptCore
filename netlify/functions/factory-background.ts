import { Handler } from "@netlify/functions";

// Constants
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

export const handler: Handler = async (event, context) => {
    // Background functions only support POST
    if (event.httpMethod !== "POST") {
        return { statusCode: 405, body: "Method Not Allowed" };
    }

    try {
        const { niche, count, userId, packId } = JSON.parse(event.body || "{}");
        console.log(`[Factory Background] Starting generation for pack: ${packId}, niche: ${niche}`);

        const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
        const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
        const openRouterKey = process.env.OPENROUTER_API_KEY;

        if (!supabaseUrl || !supabaseKey || !openRouterKey) {
            console.error("Missing Env Vars in Factory Background");
            return { statusCode: 500, body: "Missing Env Vars" };
        }

        // Dynamic import for Supabase
        const { createClient } = await import("@supabase/supabase-js");
        const supabase = createClient(supabaseUrl, supabaseKey);

        // Update status to processing
        await supabase
            .from("packs")
            .update({ status: 'processing', total_count: 0 })
            .eq("id", packId);

        const results = [];
        const totalToGenerate = count;

        for (let i = 0; i < totalToGenerate; i++) {
            try {
                const isMock = process.env.MOCK_AI === 'true';
                let item;

                if (isMock) {
                    item = {
                        title: `Mock Prompt #${i + 1}`,
                        category: "Mocking",
                        difficulty: "Beginner",
                        description: "This is a fast mock for local testing.",
                        prompt_content: `MOCK PROMPT: How to ${niche} - Step ${i + 1}`,
                        usage_guide: "No guide for mock data.",
                        style_var: "Mock"
                    };
                } else {
                    const diff = DIFFICULTY_LEVELS[Math.floor(Math.random() * DIFFICULTY_LEVELS.length)];
                    const style = STYLES[Math.floor(Math.random() * STYLES.length)];

                    // Use Gemini 2.0 Flash via OpenRouter for speed and cost
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
                        throw new Error(`OpenRouter API Error: ${response.status}`);
                    }

                    const json = await response.json();
                    const content = json.choices[0]?.message?.content || "{}";
                    
                    // Clean content if it has markdown code blocks
                    const cleanContent = content.replace(/```json\n?|\n?```/g, '');
                    
                    const data = JSON.parse(cleanContent);
                    item = { ...data, style_var: style };
                }

                // Save item
                await supabase.from("generated_prompts").insert({
                    pack_id: packId,
                    title: item.title,
                    category: item.category,
                    difficulty: item.difficulty,
                    description: item.description,
                    prompt_content: item.prompt_content,
                    usage_guide: item.usage_guide,
                    style_var: item.style_var
                });

                results.push(item);

            } catch (err) {
                console.error(`Error generating item ${i}:`, err);
                // Continue to next item
            }
        }

        // Finalize
        await supabase
            .from("packs")
            .update({ status: 'completed', total_count: results.length })
            .eq("id", packId);

        console.log(`[Factory Background] Completed pack ${packId} with ${results.length} items`);
        return { statusCode: 200, body: "Done" };

    } catch (error: any) {
        console.error("Factory Background Error:", error);
        return { statusCode: 500, body: error.message };
    }
};
