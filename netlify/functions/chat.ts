import { Handler } from "@netlify/functions";
import { createClient } from "@supabase/supabase-js";

// Mode-specific system prompts
const getModeSystemPrompt = (mode: string, isIterative: boolean): string => {
    const baseOptions = `
QUICK REPLY BUTTONS (CRITICAL - ALWAYS DO THIS):
- For EVERY clarifying question you ask, you MUST append a special options block at the VERY END of your response (after all punctuation).
- Format: \`[OPTIONS: Option 1, Option 2, Option 3]\`
- Always provide 2-4 specific options that help guide the user, even if the question seems open-ended.
- Options must be short (1-3 words). Do NOT use newlines or detailed descriptions within the option text.
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
You are the "App Architect." Your user has an idea for an app.
Your goal is to help them flesh out that idea and eventually build a "Visual Prototype" (a working first version).

WORKFLOW:
1. IF THE IDEA IS VAGUE: Ask 1-2 simple questions to understand what they want to build.
2. IF THE IDEA IS CLEAR: Provide a summary of how the app will work.
3. OFFER OPTIONS:
   - "Build App": To see a working visual prototype.
   - "Describe Plan": To get a simple step-by-step list of features.
   - "Get Instructions": To get the instructions for building the real thing.

MODES:
1. IF USER CLICKS "BUILD APP" (or asks for visual proof/prototype):
   - Write a single, self-contained HTML file.
   - Use simple, clean formatting (Tailwind via CDN is excellent).
   - Focus on functionality. Make sure buttons work and logic is sound.
   - Wrap the HTML code in \`\`\`html\`\`\` blocks.
   - **IMPORTANT**: After the code block, include a section titled "### 💎 Final Prompt" containing a polished, comprehensive text prompt that could be used in ANY pro AI coding tool to recreate this app from scratch.

2. IF USER CLICKS "DESCRIBE PLAN" (or asks for a feature list):
   - Output a simple numbered list in Markdown.
   - Sections: How it works, Key Features, Simple Steps.
   - Do NOT write code. Write a simple PLAN.

3. IF USER CLICKS "GET INSTRUCTIONS" (or asks for technical instructions):
   - Generate a "System Prompt" block for an expert AI builder.
   - Start with: "You are a Senior Engineer. Your task is to build [AppName] using modern frameworks..."
   - List the requirements in a way that any powerful AI tool can follow.

DEFAULT BEHAVIOR:
Stay conversational. If the user is just starting, say: "That sounds like a great idea! Do you want to see a **Visual Prototype** of how it would work, or should I **Describe the Plan** for you first?"

${baseOptions}`;



        case 'Media Gen':
            return systemPromptContent(`
You are an Expert Creative Prompt Consultant specializing in AI media generation tools.

MEDIA GEN PROTOCOL:
            1. ** First Question Rule **: If the user's intent is identified but the target platform is not yet chosen, your VERY FIRST question MUST be about the AI platform they intend to use.
            2. ** Options based on Media Type **:
   - ** IMAGES **: Use buttons: \`[OPTIONS: Nano Banana, Flux, Gemini, Pollinations]\` (Default is Nano Banana).
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
            // NotebookLM-style conversational research assistant (no prompt generation)
            return `You are an intelligent research assistant, similar to NotebookLM. Your role is to help users understand, explore, and extract insights from their source materials.

TALK TO SOURCE PROTOCOL:
1. When the user shares content (PDF text, YouTube transcript, article, or any text), acknowledge it and provide a helpful summary.
2. Be conversational and helpful - this is a dialogue about the content, not a prompt generator.
3. Answer questions directly and thoroughly, always grounding your answers in the source material.
4. When citing or referencing the source, be specific about where the information comes from.

CAPABILITIES:
- Summarize documents, videos, and articles at various levels of detail
- Answer specific questions about the content
- Extract key quotes, statistics, and data points
- Identify themes, arguments, and main ideas
- Compare and contrast ideas within the source
- Explain complex concepts from the source in simpler terms
- Generate study guides, outlines, or notes based on the content
- Help brainstorm how to use or apply the information

RESPONSE STYLE:
- Be conversational and engaging, like a knowledgeable study partner
- Use clear formatting (headers, bullets, numbered lists) when helpful
- Quote directly from the source when relevant, using quotation marks
- If you're unsure about something, say so rather than guessing
- Offer follow-up suggestions to help the user explore further

DO NOT generate "FINAL PROMPT:" blocks. This is a research/conversation mode, not a prompt builder.

${baseOptions}`;

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
        const openRouterKey = (process.env.PROMPTCORE_NETLIFY_PROD || process.env.OPENROUTER_API_KEY || "").trim();

        if (!supabaseUrl || !supabaseKey || !openRouterKey) {
            return {
                statusCode: 500,
                headers,
                body: JSON.stringify({ error: "Configuration Error: Missing API Keys" })
            };
        }

        const supabase = createClient(supabaseUrl, supabaseKey);

        // 1. Model Selection - Map user's selected model to actual API model
        const modelName = "google/gemini-3-pro-preview";

        // 2. Check Credits & Handle Monthly Usage Reset
        const { data: profiles, error: profileError } = await supabase
            .from("profiles")
            .select("credits, monthly_usage, last_usage_reset, subscription_status, lifetime_prompts, vibe_code_uses_monthly, talk_to_source_uses_monthly, media_gen_uses_monthly")
            .eq("id", userId);

        const profile = profiles && profiles.length > 0 ? profiles[0] : null;

        if (profileError) {
            throw new Error(`Database Error: ${profileError.message}`);
        }

        let currentCredits = profile?.credits || 0;
        let monthlyUsage = profile?.monthly_usage || 0;
        const lastReset = new Date(profile?.last_usage_reset || 0);
        const now = new Date();

        // 1. Monthly Usage Reset & Allowance Renewal
        const isNewMonth = now.getMonth() !== lastReset.getMonth() || now.getFullYear() !== lastReset.getFullYear();
        if (isNewMonth) {
            monthlyUsage = 0;
            // Allowance: Free gets 50, Lite 1000, Pro 2500
            const allowances: Record<string, number> = { 'free': 50, 'lite': 1000, 'pro': 2500 };
            const allowance = allowances[profile?.subscription_status || 'free'] || 50;

            // For renewal, we ensure they have AT LEAST their allowance
            currentCredits = Math.max(currentCredits, allowance);

            // Reset premium mode usage counters for free users
            await supabase.from("profiles").update({
                monthly_usage: 0,
                credits: currentCredits,
                last_usage_reset: now.toISOString(),
                vibe_code_uses_monthly: 0,
                talk_to_source_uses_monthly: 0,
                media_gen_uses_monthly: 0
            }).eq("id", userId);
        }

        // Dev Bypass (check this FIRST before any restrictions)
        const isLocalDev = process.env.NETLIFY_DEV === 'true';
        let isDev = isLocalDev;

        if (!isDev) {
            const { data: devUser } = await supabase.auth.admin.getUserById(userId);
            isDev = devUser?.user?.email === 'dev@promptcore.com';
        }

        const status = profile?.subscription_status || 'free';
        const isFree = status === 'free';

        // 3. Check Trial Limits for Free Users on Premium Modes
        if (!isDev && isFree) {
            const trialLimits: Record<string, number> = {
                'Vibe Code': 5,
                'Talk to Source': 10,
                'Media Gen': 10
            };
            
            const currentUses: Record<string, number> = {
                'Vibe Code': profile?.vibe_code_uses_monthly || 0,
                'Talk to Source': profile?.talk_to_source_uses_monthly || 0,
                'Media Gen': profile?.media_gen_uses_monthly || 0
            };

            if (trialLimits[mode] && currentUses[mode] >= trialLimits[mode]) {
                return {
                    statusCode: 402,
                    headers,
                    body: JSON.stringify({
                        error: `You've used all ${trialLimits[mode]} free uses of ${mode} this month. Upgrade to Lite for unlimited access.`
                    })
                };
            }
        }

        if (!isDev && currentCredits <= 0) {
            return {
                statusCode: 402,
                headers,
                body: JSON.stringify({
                    error: "Insufficient credits. Top up your account or upgrade to a subscription plan for monthly credits."
                })
            };
        }

        // 3. Get Mode-Specific System Prompt
        const isIterative = wizardMode === 'iterative';
        const systemInstruction = getModeSystemPrompt(mode, isIterative);

        console.log(`Chat: Mode="${mode}", WizardMode="${wizardMode}"`);

        // Prepare messages for OpenRouter
        const openRouterMessages = [
            { role: 'system', content: systemInstruction },
            ...(messages || []).filter((m: any) => m.role !== 'system' && m.content && m.content.trim() !== "").map((m: any) => ({
                role: m.role === 'model' ? 'assistant' : 'user',
                content: m.content
            })),
            { role: 'user', content: input || "" }
        ];

        const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${openRouterKey}`,
                'Content-Type': 'application/json',
                'HTTP-Referer': 'https://promptcore.app',
                'X-Title': 'PromptCore'
            },
            body: JSON.stringify({
                model: modelName,
                messages: openRouterMessages,
                max_tokens: 4096,
                temperature: 0.7
            })
        });

        if (!response.ok) {
            throw new Error(`OpenRouter API error: ${response.status} ${await response.text()}`);
        }

        const data = await response.json();
        const responseText = data.choices?.[0]?.message?.content || "No response generated.";

        // 4. Calculate costs and track usage
        // Base costs for different modes
        let baseCost = 1; // chat_message: 1
        if (mode === 'Media Gen') baseCost = 5;
        if (mode === 'Talk to Source') baseCost = 2;
        if (mode === 'Vibe Code') {
            const lowerInput = input.toLowerCase();
            if (lowerInput.includes('build app')) baseCost = 30; // app_build_prototype: 30
            else if (lowerInput.includes('describe plan')) baseCost = 2;
            else baseCost = 1;
        }

        // Free users pay higher costs for premium modes (2x-3x)
        let finalCost = baseCost;
        if (!isDev && isFree) {
            if (mode === 'Vibe Code') finalCost = baseCost * 3; // 90 credits per use
            else if (mode === 'Talk to Source') finalCost = baseCost * 2; // 4 credits per use
            else if (mode === 'Media Gen') finalCost = baseCost * 2; // 10 credits per use
        }

        // Efficiency Logic (The "Usage Tax")
        // After threshold (100 credits), free users pay 3x on top of mode multiplier
        const isAboveThreshold = isFree && monthlyUsage > 100;
        if (isAboveThreshold) {
            finalCost = finalCost * 3;
        }

        // Threshold Warning: Show message when user just crossed the threshold
        const willCrossThreshold = isFree && monthlyUsage <= 100 && (monthlyUsage + finalCost) > 100;

        // Prepare update object for profile
        const updateData: any = {
            credits: Math.max(0, currentCredits - finalCost),
            monthly_usage: monthlyUsage + finalCost,
            lifetime_prompts: (profile?.lifetime_prompts || 0) + 1
        };

        // Track premium mode usage for free users
        if (!isDev && isFree) {
            if (mode === 'Vibe Code') {
                updateData.vibe_code_uses_monthly = (profile?.vibe_code_uses_monthly || 0) + 1;
            } else if (mode === 'Talk to Source') {
                updateData.talk_to_source_uses_monthly = (profile?.talk_to_source_uses_monthly || 0) + 1;
            } else if (mode === 'Media Gen') {
                updateData.media_gen_uses_monthly = (profile?.media_gen_uses_monthly || 0) + 1;
            }
        }

        // Decrement Credits (if not dev) & Track Usage
        if (!isDev) {
            await supabase
                .from("profiles")
                .update(updateData)
                .eq("id", userId);
        }

        // Build rate tier metadata for the response
        const rateTierInfo: any = {};
        if (!isDev && isFree) {
            if (isAboveThreshold) {
                rateTierInfo.message = `💡 You're on Standard Rate (3x cost). Upgrade to Creator for Preferred Rates and save credits.`;
                rateTierInfo.multiplier = 3;
            } else if (willCrossThreshold) {
                rateTierInfo.message = `⚠️ You've used ${monthlyUsage} credits this month. After 100, Standard Rate (3x) applies. Upgrade to Creator for consistent pricing.`;
                rateTierInfo.approaching = true;
            }
        }

        return {
            statusCode: 200,
            headers,
            body: JSON.stringify({
                text: responseText,
                msgType: 'meta_helper',
                rateTierInfo: Object.keys(rateTierInfo).length > 0 ? rateTierInfo : undefined
            }),
        };
    } catch (err: any) {
        console.error("Chat Error:", err);
        return { statusCode: 500, headers, body: JSON.stringify({ error: err.message }) };
    }
};

export { handler };
