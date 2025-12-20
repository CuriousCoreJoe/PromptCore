
import { Inngest } from "inngest";
import { GoogleGenAI, Type } from "@google/genai";
import { createClient } from "@supabase/supabase-js";

const inngest = new Inngest({ id: "promptcore-app" });
// Always use const ai = new GoogleGenAI({apiKey: process.env.API_KEY});
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
const supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

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

    // We process in chunks of 5 to respect timeouts and show progress
    const chunks = Array.from({ length: Math.ceil(count / 5) }, (_, i) => i);
    const results = [];

    for (const chunkIndex of chunks) {
      const batchResults = await step.run(`generate-batch-${chunkIndex}`, async () => {
        const batch = [];
        const itemsToGen = Math.min(5, count - (chunkIndex * 5));

        for (let i = 0; i < itemsToGen; i++) {
          const diff = DIFFICULTY_LEVELS[Math.floor(Math.random() * DIFFICULTY_LEVELS.length)];
          const style = STYLES[Math.floor(Math.random() * STYLES.length)];

          const response = await ai.models.generateContent({
            model: "gemini-3-flash-preview",
            contents: `Generate one unique prompt for the niche '${niche}'. Target Audience: ${diff}. Tone/Style: ${style}.`,
            config: {
              systemInstruction: MASTER_SYSTEM_PROMPT,
              responseMimeType: "application/json",
              responseSchema: {
                type: Type.OBJECT,
                properties: {
                  title: { type: Type.STRING },
                  category: { type: Type.STRING },
                  difficulty: { type: Type.STRING },
                  description: { type: Type.STRING },
                  prompt_content: { type: Type.STRING },
                  usage_guide: { type: Type.STRING },
                },
                required: ["title", "category", "difficulty", "description", "prompt_content", "usage_guide"]
              }
            }
          });

          const data = JSON.parse(response.text || '{}');
          batch.push({ ...data, style_var: style });
        }
        return batch;
      });

      // Save to Supabase after each step
      await step.run(`save-batch-${chunkIndex}`, async () => {
        const rows = batchResults.map(item => ({
          pack_id: packId,
          title: item.title,
          category: item.category,
          difficulty: item.difficulty,
          description: item.description,
          prompt_content: item.prompt_content,
          usage_guide: item.usage_guide,
          style_var: item.style_var
        }));
        await supabase.from("generated_prompts").insert(rows);
      });

      results.push(...batchResults);
    }

    await step.run("finalize-pack", async () => {
      await supabase.from("packs").update({ status: 'completed', total_count: results.length }).eq("id", packId);
    });

    return { count: results.length };
  }
);
