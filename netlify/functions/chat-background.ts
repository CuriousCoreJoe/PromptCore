import { Handler } from "@netlify/functions";
import { createClient } from '@supabase/supabase-js';

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
4. Break it into sections like Atmosphere, Lighting, Composition, and Technical.`;

    const systemPromptContent = (specificProtocol: string) => `
${finalOutputStructure}

${specificProtocol}

${baseOptions}

Be precise, descriptive, and always follow the multi-line output structure.`;

    switch (mode) {
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

        case 'Media Gen':
            return systemPromptContent(`
You are an Expert Creative Prompt Consultant specializing in AI media generation tools.

MEDIA GEN PROTOCOL:
1. ** First Question Rule **: If the user's intent is identified but the target platform is not yet chosen, your VERY FIRST question MUST be about the AI platform they intend to use.
2. ** Options based on Media Type **:
   - ** IMAGES **: Use buttons: \`[OPTIONS: Default, Nano Banana, DALL-E 3, Midjourney v6, Stable Diffusion XL, Leonardo.Ai]\` (Default is Nano Banana).
   - **VIDEO**: Use buttons: \`[OPTIONS: Default, Sora, Runway Gen-3, Luma Dream Machine, Kling AI, Pika 2.0]\`.
   - **SONG/AUDIO**: Use buttons: \`[OPTIONS: Default, Suno v3.5, Udio, Stable Audio, ElevenLabs]\`.
3. ${isIterative
                    ? "After the platform is selected, ask exactly ONE clarifying question at a time about style, composition, lighting, etc."
                    : "After the platform is selected, ask 2-4 clarifying questions at once to fully flesh out the vision."}
4. Understand the target platform deeply as each has different syntax.

Be creative, descriptive, and knowledgeable about each platform's unique syntax and capabilities.`);

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
    // Background functions don't return a conventional response to the client
    // They just run until completion (up to 15m)

    if (event.httpMethod !== "POST") {
        return { statusCode: 405, body: "Method Not Allowed" };
    }

    try {
        const payload = JSON.parse(event.body || "{}");
        const { input, chatId, userId, conversationHistory = [], mode = 'Talk to Source', wizardMode = 'iterative' } = payload;

        if (!input || !chatId || !userId) {
            console.error("Missing required fields");
            return { statusCode: 400, body: "Missing required fields" };
        }

        console.log(`[Chat Background] Starting job for chat ${chatId}, mode=${mode}`);

        // Initialize Supabase Admin Client
        const supabaseUrl = process.env.VITE_SUPABASE_URL!;
        const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
        const supabase = createClient(supabaseUrl, supabaseServiceKey);

        // 1. Check Credits, Subscription & Dev Status
        const { data: profile } = await supabase.from('profiles').select('credits, monthly_usage, last_usage_reset, subscription_status').eq('id', userId).single();
        const { data: userData } = await supabase.auth.admin.getUserById(userId);
        const isDev = userData?.user?.email === 'dev@promptcore.com';

        const status = profile?.subscription_status || 'free';
        const isFree = status === 'free';

        // PAYWALL: Block free users from Talk to Source
        if (!isDev && isFree && (mode === 'Talk to Source' || mode === 'Vibe Code')) {
            console.log(`[Chat Background] Blocking free user ${userId} from ${mode}`);
            return { statusCode: 403, body: `${mode} is restricted to Lite and Pro subscribers.` };
        }

        let currentCredits = profile?.credits || 0;
        let monthlyUsage = profile?.monthly_usage || 0;
        const lastReset = new Date(profile?.last_usage_reset || 0);
        const now = new Date();

        // Monthly Reset logic
        const isNewMonth = now.getMonth() !== lastReset.getMonth() || now.getFullYear() !== lastReset.getFullYear();
        if (isNewMonth) {
            monthlyUsage = 0;
            const allowances: Record<string, number> = { 'free': 50, 'lite': 1000, 'pro': 2500 };
            const allowance = allowances[status] || 50;
            currentCredits = Math.max(currentCredits, allowance);

            await supabase.from("profiles").update({
                monthly_usage: 0,
                credits: currentCredits,
                last_usage_reset: now.toISOString()
            }).eq("id", userId);
        }

        // Cost for Talk to Source is higher due to content analysis
        const COST = mode === 'Talk to Source' ? 5 : 1;
        const multiplier = (isFree && monthlyUsage > 100) ? 3 : 1;
        const finalCost = COST * multiplier;

        if (!isDev && currentCredits < finalCost) {
            console.log(`[Chat Background] User ${userId} has insufficient credits (${currentCredits} < ${finalCost})`);
            return { statusCode: 402, body: "Insufficient credits" };
        }

        const openRouterKey = process.env.OPENROUTER_API_KEY;

        // Use Gemini 3 Pro for Talk to Source (good at analysis)
        const modelId = 'google/gemini-3-pro-preview';

        // 1. Insert Initial "Processing" Message
        const messageId = crypto.randomUUID();
        const { error: insertError } = await supabase.from('messages').insert({
            id: messageId,
            chat_id: chatId,
            role: 'model',
            content: '📚 **Analyzing Content...**\n\nI am processing your source material and preparing a comprehensive response. This may take a moment for longer documents.\n\n*Please wait while I analyze...*',
            status: 'processing',
            msg_type: 'meta_helper',
            metadata: {
                startTime: Date.now(),
                jobType: 'chat-background',
                mode: mode
            }
        });

        if (insertError) {
            console.error("Failed to insert initial message:", insertError);
            return { statusCode: 500, body: "Database error" };
        }

        console.log(`[Chat Background] Initial message inserted: ${messageId}`);

        // 2. Perform the Heavy AI Task
        try {
            const isIterative = wizardMode === 'iterative';
            const systemPrompt = getModeSystemPrompt(mode, isIterative);

            const messages = [
                { role: 'system', content: systemPrompt },
                ...conversationHistory.map((msg: any) => ({
                    role: msg.role === 'model' ? 'assistant' : 'user',
                    content: msg.content
                })),
                { role: 'user', content: input }
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
                    model: modelId,
                    messages: messages,
                    max_tokens: 4096,
                    temperature: 0.7
                })
            });

            if (!response.ok) {
                throw new Error(`OpenRouter API error: ${response.status} ${await response.text()}`);
            }

            const data = await response.json();
            const generatedText = data.choices?.[0]?.message?.content || "No response generated.";

            // 3. Update the Message with Result
            const { error: updateError } = await supabase
                .from('messages')
                .update({
                    content: generatedText,
                    status: 'completed',
                    metadata: {
                        duration: Date.now() - (payload.startTime || Date.now()),
                        tokens: data.usage?.total_tokens,
                        model: modelId
                    }
                })
                .eq('id', messageId);

            if (updateError) {
                console.error("Failed to update message with result:", updateError);
            } else {
                console.log(`[Chat Background] Job completed successfully for ${messageId}`);

                // 4. Decrement Credits & Update Monthly Usage
                if (!isDev) {
                    await supabase
                        .from('profiles')
                        .update({
                            credits: Math.max(0, currentCredits - finalCost),
                            monthly_usage: monthlyUsage + finalCost
                        })
                        .eq('id', userId);
                }
            }

        } catch (executionError: any) {
            console.error("AI Execution Failed:", executionError);

            // Update message to show failure
            await supabase
                .from('messages')
                .update({
                    content: `### ❌ Analysis Failed\n\nI encountered an error while analyzing your content: ${executionError.message}. Please try again.`,
                    status: 'failed'
                })
                .eq('id', messageId);
        }

    } catch (err) {
        console.error("Background Handler Error:", err);
        return { statusCode: 500, body: "Internal Server Error" };
    }

    return { statusCode: 202 };
};

export { handler };
