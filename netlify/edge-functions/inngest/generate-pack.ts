// @ts-ignore
declare const Deno: any;
// @ts-ignore
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.0";
// @ts-ignore
import { GoogleGenAI, SchemaType } from "https://esm.sh/@google/generative-ai@0.1.3";
import { inngest } from "./client.ts";

// CONSTANTS must be outside to be available
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
    async ({ event, step }: { event: any, step: any }) => {
        const { niche, count, userId, packId } = event.data;

        // Initialize Clients INSIDE the step/handler
        const supabase = createClient(
            // @ts-ignore
            Deno.env.get("SUPABASE_URL")!,
            // @ts-ignore
            Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
        );

        // @ts-ignore
        const apiKey = Deno.env.get("GEMINI_API_KEY") || "";
        const ai = new GoogleGenAI(apiKey);

        const chunks = Array.from({ length: Math.ceil(count / 5) }, (_, i) => i);
        const results: any[] = [];

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

                    const model = ai.getGenerativeModel({
                        model: "gemini-1.5-flash",
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
