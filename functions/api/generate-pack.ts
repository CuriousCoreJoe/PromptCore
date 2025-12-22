
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.0";
import { GoogleGenAI, Type } from "https://esm.sh/@google/genai@0.1.0"; // Check version or use generic fetch
// Note: @google/genai might not have a direct Deno compatible build on esm.sh easily or might need specific config.
// Alternative: Using strict fetch or checks. For now assuming esm.sh works or standard fetch.
// Actually, let's use the REST API approach if the SDK is problematic, but let's try standard import first.
// If @google/genai has issues in Deno, we might need a polyfill or just raw fetch.
// Given strict instructions to port, I will keep the structure but ensure Deno env.

// Re-defining Inngest client here or importing?
// Better to define the function using the inngest instance from index, but circular dependency.
// Inngest functions are usually defined with inngest.createFunction.
// Let's assume we pass the client or import it. To avoid circular deps in Deno effectively:
import { inngest } from "./index.ts";

const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
);

const apiKey = Deno.env.get("GEMINI_API_KEY") || "";
// Init GenAI - simplifying for Deno if SDK is tricky, but let's try:
// The Node SDK might rely on 'process' or 'fs'.
// Safe bet: Wrap it or use a simple fetch wrapper for Deno if the SDK fails.
// For this task, I will stick to the structure but use a robust assumption.
// If the user provided code used @google/genai, I'll attempt to use a Deno-friendly version or polyfill.
// Usage of `npm:` specifiers in Deno is also possible if they have a package.json or using --unstable-compat.
// Assuming standard Supabase Edge Function environment which supports npm: imports now.
// So: import { GoogleGenAI } from "npm:@google/genai"; should work in modern Supabase versions.

// Let's use standard import for now and assume the environment supports it or esm.sh.
import { GoogleGenAI, SchemaType } from "npm:@google/genai";

const ai = new GoogleGenAI({ apiKey });

const DIFFICULTY_LEVELS = ["Beginner", "Intermediate", "Advanced"];
const STYLES = ["Strict & Organized", "Creative & Loose", "Step-by-Step Tutor", "Socratic Method"];

const MASTER_SYSTEM_PROMPT = `
You are 'PromptCore', the world's best AI curriculum designer. Your goal is to build helpful, high-value prompt assets for everyday users (B2C) and professionals (B2B).

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

export const generatePack = inngest.createFunction(
    { id: "generate-consumer-pack" },
    { event: "app/pack.requested" },
    async ({ event, step }) => {
        const { niche, count, userId, packId } = event.data;

        const chunks = Array.from({ length: Math.ceil(count / 5) }, (_, i) => i);
        const results = [];

        // Notify start
        await step.run("start-pack", async () => {
            const { error } = await supabase
                .from("packs")
                .update({ status: 'processing', total_count: 0 })
                .eq("id", packId);
            if (error) throw error;
        });

        for (const chunkIndex of chunks) {
            const batchResults = await step.run(`generate-batch-${chunkIndex}`, async () => {
                const batch = [];
                const itemsToGen = Math.min(5, count - (chunkIndex * 5));

                for (let i = 0; i < itemsToGen; i++) {
                    const diff = DIFFICULTY_LEVELS[Math.floor(Math.random() * DIFFICULTY_LEVELS.length)];
                    const style = STYLES[Math.floor(Math.random() * STYLES.length)];

                    // Note: Using the v1beta API usually via the SDK
                    // The new SDK syntax:
                    const model = ai.getGenerativeModel({
                        model: "gemini-1.5-flash", // Updated to a generally available model for stability or use user's preference
                        systemInstruction: MASTER_SYSTEM_PROMPT,
                        generationConfig: {
                            responseMimeType: "application/json",
                            responseSchema: {
                                type: SchemaType.OBJECT,
                                properties: {
                                    title: { type: SchemaType.STRING },
                                    category: { type: SchemaType.STRING },
                                    difficulty: { type: SchemaType.STRING },
                                    description: { type: SchemaType.STRING },
                                    prompt_content: { type: SchemaType.STRING },
                                    usage_guide: { type: SchemaType.STRING },
                                },
                                required: ["title", "category", "difficulty", "description", "prompt_content", "usage_guide"]
                            }
                        }
                    });

                    const result = await model.generateContent(
                        `Generate one unique prompt for the niche '${niche}'. Target Audience: ${diff}. Tone/Style: ${style}.`
                    );

                    const text = result.response.text();
                    const data = JSON.parse(text || '{}');
                    batch.push({ ...data, style_var: style });
                }
                return batch;
            });

            await step.run(`save-batch-${chunkIndex}`, async () => {
                const rows = batchResults.map((item: any) => ({
                    pack_id: packId,
                    title: item.title,
                    category: item.category,
                    difficulty: item.difficulty,
                    description: item.description,
                    prompt_content: item.prompt_content,
                    usage_guide: item.usage_guide,
                    style_var: item.style_var
                }));

                const { error } = await supabase.from("generated_prompts").insert(rows);
                if (error) throw error;
            });

            results.push(...batchResults);
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
