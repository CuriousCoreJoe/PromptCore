import { Handler } from "@netlify/functions";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { createClient } from "@supabase/supabase-js";

// Mode-specific system prompts
const getModeSystemPrompt = (mode: string, isIterative: boolean): string => {
    const baseOptions = `
QUICK REPLY BUTTONS (CRITICAL - ALWAYS DO THIS):
- For EVERY clarifying question you ask, you MUST append a special options block at the VERY END of your response (after all punctuation).
- Format: \`[OPTIONS: Option 1, Option 2, Option 3]\`
- Always provide 2-4 specific options that help guide the user, even if the question seems open-ended.
- NEVER skip the OPTIONS block. Users rely on these buttons for every question.`;
    const finalOutputStructure = `
FINAL OUTPUT STRUCTURE (STRICT):
1. Start with '### 💎 Final Prompt'.
2. Use 'FINAL PROMPT:' followed by a code block.
3. The prompt MUST be multi-line (at least 5-8 lines). 
4. Break it into sections like Atmosphere, Lighting, Composition, and Technical.

WRONG (One-liner):
FINAL PROMPT: \`A photo of a cat in a hat.\`

RIGHT (Multi-line):
FINAL PROMPT:
\`\`\`
A hyper-realistic cinematic portrait of a majestic ginger cat.
The cat is wearing a detailed Victorian-style top hat with silk textures.
ATMOSPHERE: Moody, dimly lit study with dust motes dancing in sunbeams.
LIGHTING: Dramatic rim lighting and soft shadows on the fur.
TECHNICAL: 8k resolution, shot on 85mm lens, f/1.8, shallow depth of field.
\`\`\`
Do NOT include a "Strategy" or "Implementation" section.`;

    const systemPromptContent = (specificProtocol: string) => `
${finalOutputStructure}

${specificProtocol}

${baseOptions}

Be precise, descriptive, and always follow the multi-line output structure.`;

    switch (mode) {
        case 'Vibe Code':
            return `
You are the "Vibe Architect." Your goal is to take a user's simple idea and expand it into a concise "Vibe Specification" for a coding AI.

RULES:
1. Describe a beautiful, modern, single-file HTML/JS app.
2. Focus on VISUALS and UX. Use keywords: "Tailwind CSS", "Glassmorphism", "Smooth Animations".
3. Be CONCISE. Provide 3-5 high-impact bullet points. Do not over-elaborate.
4. Your output will be used as the prompt for the next step.

EXAMPLE INTERACTION:
User: "Make a timer."
You: "I have designed a 'Focus Flow Timer'.
- Visuals: Dark mode with a pulsing neon ring.
- Features: 25/5 min toggle, audio chime, progress animation.
- Tech: Single HTML with Tailwind scripts."

OUTPUT FORMAT:
FINAL PROMPT:
\`\`\`
[The technical prompt for the builder AI]
\`\`\`

${baseOptions}`;

        case 'Media Gen':
            return systemPromptContent(`
You are an Expert Creative Prompt Consultant specializing in AI media generation tools.

MEDIA GEN PROTOCOL:
1. **First Question Rule**: If the user's intent is identified but the target platform is not yet chosen, your VERY FIRST question MUST be about the AI platform they intend to use.
2. **Options based on Media Type**:
   - **IMAGES**: Use buttons: \`[OPTIONS: Default, Nano Banana, DALL-E 3, Midjourney v6, Stable Diffusion XL, Leonardo.Ai]\` (Default is Nano Banana).
   - **VIDEO**: Use buttons: \`[OPTIONS: Default, Sora, Runway Gen-3, Luma Dream Machine, Kling AI, Pika 2.0]\`.
   - **SONG/AUDIO**: Use buttons: \`[OPTIONS: Default, Suno v3.5, Udio, Stable Audio, ElevenLabs]\`.
3. ${isIterative
                    ? "After the platform is selected, ask exactly ONE clarifying question at a time about style, composition, lighting, etc."
                    : "After the platform is selected, ask 2-4 clarifying questions at once to fully flesh out the vision."}
4. Understand the target platform deeply as each has different syntax.

DUAL OUTPUT FORMAT:
When generating the final prompt, provide a "For Humans" section and then the multi-line "For AI" section.

Mandatory JSON Block (at the end):
\`\`\`json
{
  "prompt": "the descriptive multi-line prompt",
  "negative_prompt": "things to avoid",
  "style": "style names",
  "aspect_ratio": "16:9",
  "platform": "platform name"
}
\`\`\`

Be creative, descriptive, and knowledgeable about each platform's unique syntax and capabilities.`);

        case 'Talk to Source':
            return systemPromptContent(`
You are an Expert Research Assistant specializing in analyzing documents and media content.

TALK TO SOURCE PROTOCOL:
1. When the user provides content (PDF text, YouTube transcript, article text), acknowledge what you received.
2. Summarize the key points of the source material first.
3. ${isIterative
                    ? "Ask exactly ONE question about what aspect of the content they want to explore."
                    : "Ask 2-4 questions about what they want to learn from this content."}
4. Help users extract insights, find specific information, compare ideas, or generate content based on the source.

CAPABILITIES:
- Summarize documents and videos
- Answer questions about the content
- Extract key quotes and data points
- Compare multiple sources
- Generate content inspired by the source (blog posts, summaries, presentations)

Be thorough, accurate, and always reference the source material when making claims.`);

        case 'Everyday':
        default:
            return systemPromptContent(`
You are an Expert Prompt Consultant. Your goal is to help users refine their prompts for any general purpose task.

EVERYDAY MODE PROTOCOL:
1. ${isIterative
                    ? "In Iterative Mode: Ask exactly ONE clarifying question at a time. Do NOT ask multiple. Keep it conversational."
                    : "In Batch Mode: Ask 2-4 clarifying questions at once in a numbered list."}
2. Help with: brainstorming, writing, planning, learning, creating, problem-solving.
3. Once you have enough information, generate a high-quality prompt.`);
    }
};

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
        const { messages, input, userId, wizardMode = 'iterative', defaultModel = 'claude-sonnet-4.5', mode = 'Everyday', sourceContent } = JSON.parse(event.body || "{}");

        const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
        const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
        const geminiKey = (process.env.LOCAL_GEMINI_KEY || process.env.GEMINI_API_KEY || process.env.API_KEY || "").trim();

        if (!supabaseUrl || !supabaseKey || !geminiKey) {
            return {
                statusCode: 500,
                headers,
                body: JSON.stringify({ error: "Configuration Error" })
            };
        }

        const supabase = createClient(supabaseUrl, supabaseKey);

        // 1. Model Selection - Map user's selected model to actual API model
        const modelName = "gemini-3-pro-preview";
        const genAI = new GoogleGenerativeAI(geminiKey);

        // 2. Check Credits & Handle Daily Bonus
        const { data: profiles, error: profileError } = await supabase
            .from("profiles")
            .select("credits, last_daily_bonus, lifetime_prompts")
            .eq("id", userId);

        const profile = profiles && profiles.length > 0 ? profiles[0] : null;

        if (profileError) {
            throw new Error(`Database Error: ${profileError.message}`);
        }

        let currentCredits = profile?.credits || 0;
        const lastBonus = new Date(profile?.last_daily_bonus || 0);
        const now = new Date();
        const oneDay = 24 * 60 * 60 * 1000;

        // Daily Refresh
        if ((now.getTime() - lastBonus.getTime() > oneDay) && currentCredits < 100) {
            currentCredits = 100;
            await supabase.from("profiles").update({
                credits: 100,
                last_daily_bonus: now.toISOString()
            }).eq("id", userId);
        }

        // Dev Bypass
        const isLocalDev = process.env.NETLIFY_DEV === 'true';
        let isDev = isLocalDev;

        if (!isDev) {
            const { data: devUser } = await supabase.auth.admin.getUserById(userId);
            isDev = devUser?.user?.email === 'dev@promptcore.com';
        }

        if (!isDev && currentCredits <= 0) {
            return { statusCode: 402, headers, body: JSON.stringify({ error: "Insufficient credits" }) };
        }

        // 3. Get Mode-Specific System Prompt
        const isIterative = wizardMode === 'iterative';
        const systemInstruction = getModeSystemPrompt(mode, isIterative);

        console.log(`Chat: Mode="${mode}", WizardMode="${wizardMode}"`);

        const model = genAI.getGenerativeModel({
            model: modelName,
            systemInstruction: systemInstruction
        });

        // Filter out system messages and the last user message if it's the current input
        const filteredMessages = (messages || []).filter((m: any) =>
            m.role !== 'system' && m.content.trim() !== ""
        );

        const history = filteredMessages.map((m: any) => ({
            role: m.role === 'model' ? 'model' : 'user',
            parts: [{ text: m.content }]
        }));

        // Gemini Integrity Check: History MUST start with 'user'
        if (history.length > 0 && history[0].role === 'model') {
            // Option 1: Remove the orphan model message
            history.shift();
            // Option 2 (Alternative): Prepend a dummy user message
            // history.unshift({ role: 'user', parts: [{ text: 'Context:' }] });
        }

        // Prevent duplicate user turns (Gemini restriction)
        if (history.length > 0 &&
            history[history.length - 1].role === 'user' &&
            history[history.length - 1].parts[0].text === input) {
            history.pop();
        }

        const chat = model.startChat({ history });
        const result = await chat.sendMessage(input);
        const responseText = result.response.text();

        // 3. Decrement Credits (if not dev) & Increment Lifetime
        if (!isDev) {
            await supabase
                .from("profiles")
                .update({
                    credits: currentCredits - 1,
                    lifetime_prompts: (profile?.lifetime_prompts || 0) + 1
                })
                .eq("id", userId);
        }

        return {
            statusCode: 200,
            headers,
            body: JSON.stringify({
                text: responseText,
                msgType: 'meta_helper'
            }),
        };
    } catch (err: any) {
        console.error("Chat Error:", err);
        return { statusCode: 500, headers, body: JSON.stringify({ error: err.message }) };
    }
};

export { handler };
