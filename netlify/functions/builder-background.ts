
import { Handler } from "@netlify/functions";
import { createClient } from '@supabase/supabase-js';

const handler: Handler = async (event, context) => {
    // Background functions don't return a conventional response to the client
    // They just run until completion (up to 15m)

    if (event.httpMethod !== "POST") {
        return { statusCode: 405, body: "Method Not Allowed" };
    }

    try {
        const payload = JSON.parse(event.body || "{}");
        const { prompt, chatId, userId, conversationHistory = [], model: requestedModel } = payload;

        if (!prompt || !chatId || !userId) {
            console.error("Missing required fields");
            return { statusCode: 400, body: "Missing required fields" };
        }

        console.log(`[Background Builder] Starting job for chat ${chatId}`);

        const startTime = Date.now();

        // Initialize Supabase Admin Client
        const supabaseUrl = process.env.VITE_SUPABASE_URL!;
        const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
        const supabase = createClient(supabaseUrl, supabaseServiceKey);

        // 1. Check Credits, Subscription & Monthly Usage
        const { data: profile } = await supabase.from('profiles').select('credits, monthly_usage, last_usage_reset, subscription_status, vibe_code_uses_monthly').eq('id', userId).single();
        const { data: userData } = await supabase.auth.admin.getUserById(userId);
        const isDev = userData?.user?.email === 'dev@promptcore.com';

        const status = profile?.subscription_status || 'free';
        const isFree = status === 'free';

        // Check Trial Limits for Free Users on Vibe Code
        if (!isDev && isFree) {
            const trialLimit = 5;
            const currentUses = profile?.vibe_code_uses_monthly || 0;

            if (currentUses >= trialLimit) {
                console.log(`[Background Builder] Blocking free user ${userId} - trial limit reached for Vibe Code`);
                return { statusCode: 402, body: `You've used all ${trialLimit} free uses of Vibe Code this month. Upgrade to Lite for unlimited access.` };
            }
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
                last_usage_reset: now.toISOString(),
                vibe_code_uses_monthly: 0
            }).eq("id", userId);
        }

        // Free users pay 3x for Vibe Code (90 credits per use)
        const baseCost = 30;
        let finalCost = baseCost;
        if (!isDev && isFree) {
            finalCost = baseCost * 3;
        }

        // Efficiency Logic (The "Usage Tax")
        const isAboveThreshold = isFree && monthlyUsage > 100;
        if (isAboveThreshold) {
            finalCost = finalCost * 3;
        }

        if (!isDev && currentCredits < finalCost) {
            console.log(`[Background Builder] User ${userId} has insufficient credits (${currentCredits} < ${finalCost})`);
            return { statusCode: 402, body: "Insufficient credits" };
        }

        const openRouterKey = (process.env.PROMPTCORE_NETLIFY_PROD || process.env.OPENROUTER_API_KEY || "").trim();

        // Use Gemini 3 Pro Preview as requested for powerful building
        // Map common model names to the specific OpenRouter ID
        const modelMapping: Record<string, string> = {
            'google/gemini-3-pro-preview': 'google/gemini-3-pro-preview',
            'gpt-5': 'openai/gpt-5', // Fallback if user selected this
            'claude-sonnet-4.5': 'anthropic/claude-sonnet-4.5'
        };
        const modelId = modelMapping[requestedModel] || 'google/gemini-3-pro-preview';

        // 1. Insert Initial "Processing" Message
        // We do this immediately so the UI shows something
        const messageId = crypto.randomUUID();
        const { error: insertError } = await supabase.from('messages').insert({
            id: messageId,
            chat_id: chatId,
            role: 'model',
            content: '🏗️ **Architecting Solution...**\n\nI am drafting the complete code structure based on your specifications. This complex process may take up to a minute.\n\n*Please wait while I build your app...*',
            status: 'processing',
            msg_type: 'execution_result',
            execution_model: modelId,
            metadata: {
                startTime: Date.now(),
                jobType: 'builder-background'
            }
        });

        if (insertError) {
            console.error("Failed to insert initial message:", insertError);
            return { statusCode: 500, body: "Database error" };
        }

        console.log(`[Background Builder] Initial message inserted: ${messageId}`);

        // 2. Perform the Heavy AI Task
        try {
            const systemPrompt = `You are the "App Architect." Your user has an idea for an app.
Your goal is to build a "Visual Prototype" (a working first version) so the user can verify the logic.

IF THE USER ASKS TO "BUILD APP":
- Write a single, self-contained HTML file.
- Use simple, clean formatting (Tailwind via CDN).
- Focus on logic and functionality.
- Wrap the HTML code in \`\`\`html\`\`\` blocks.
- **IMPORTANT**: After the code block, include a section titled "### 💎 Final Prompt".
- **CRITICAL**: Inside this section, you MUST start the prompt with the exact text "FINAL PROMPT:" followed by the prompt content. This triggers the "Run Prompt" button in the UI.

IF THE USER ASKS TO "DESCRIBE PLAN":
- Output simple numbered list requirements (simple plan).

IF THE USER ASKS TO "GET INSTRUCTIONS":
- Generate a comprehensive System Prompt for pro AI coding tools.
- **CRITICAL**: You MUST include a section titled "### 💎 Final Prompt" at the end.
- Inside this section, start with "FINAL PROMPT:" followed by the system prompt content.`;

            const messages = [
                { role: 'system', content: systemPrompt },
                ...conversationHistory.map((msg: any) => ({
                    role: msg.role === 'model' ? 'assistant' : 'user',
                    content: msg.content
                })),
                { role: 'user', content: prompt }
            ];

            const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${openRouterKey}`,
                    'Content-Type': 'application/json',
                    'HTTP-Referer': 'https://promptorigin.app',
                    'X-Title': 'PromptOrigin'
                },
                body: JSON.stringify({
                    model: modelId,
                    messages: messages,
                    max_tokens: 8192, // High limit for code
                    temperature: 0.1  // Deterministic
                })
            });

            if (!response.ok) {
                throw new Error(`OpenRouter API error: ${response.status} ${await response.text()}`);
            }

            const data = await response.json();
            const generatedText = data.choices?.[0]?.message?.content || "No generated code returned.";

            // 3. Update the Message with Result
            const { error: updateError } = await supabase
                .from('messages')
                .update({
                    content: generatedText,
                    status: 'completed',
                    metadata: {
                        duration: Date.now() - (payload.startTime || startTime),
                        tokens: data.usage?.total_tokens
                    }
                })
                .eq('id', messageId);

            if (updateError) {
                console.error("Failed to update message with result:", updateError);
            } else {
                console.log(`[Background Builder] Job completed successfully for ${messageId}`);

                // 4. Decrement Credits & Update Monthly Usage
                // REFUND/PROTECTION LOGIC: Only charge if the response contains substantial code or plan
                const isResponseValid = generatedText.length > 100 &&
                    !generatedText.toLowerCase().includes('### ❌ build failed') &&
                    (generatedText.includes('```html') || generatedText.includes('### 💎 Final Prompt') || generatedText.includes('1.'));

                if (!isDev && isResponseValid) {
                    const updateData: any = {
                        credits: Math.max(0, currentCredits - finalCost),
                        monthly_usage: monthlyUsage + finalCost
                    };

                    // Track Vibe Code usage for free users
                    if (isFree) {
                        updateData.vibe_code_uses_monthly = (profile?.vibe_code_uses_monthly || 0) + 1;
                    }

                    await supabase
                        .from('profiles')
                        .update(updateData)
                        .eq('id', userId);
                } else if (!isDev && !isResponseValid) {
                    console.log(`[Background Builder] Skipping credit deduction for low-quality or failed build. Text length: ${generatedText.length}`);
                    // We don't deduct credits, but we already updated the message status to 'failed' in the catch block if it crashed,
                    // or it might just be a very short/poor response here.
                }
            }

        } catch (executionError: any) {
            console.error("AI Execution Failed:", executionError);

            // Update message to show failure
            await supabase
                .from('messages')
                .update({
                    content: `### ❌ Build Failed\n\nI encountered an error while building your application: ${executionError.message}. Please try again.`,
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
