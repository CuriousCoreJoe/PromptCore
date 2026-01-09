
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

        // Initialize Supabase Admin Client
        const supabaseUrl = process.env.VITE_SUPABASE_URL!;
        const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
        const supabase = createClient(supabaseUrl, supabaseServiceKey);

        const openRouterKey = process.env.OPENROUTER_API_KEY;

        // Use Gemini 3 Pro Preview as requested for powerful building
        // Map common model names to the specific OpenRouter ID
        const modelMapping: Record<string, string> = {
            'gemini-3-pro': 'google/gemini-3-pro-preview',
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
            const messages = [
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
                    'HTTP-Referer': 'https://promptcore.app',
                    'X-Title': 'PromptCore'
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
                        duration: Date.now() - (payload.startTime || Date.now()),
                        tokens: data.usage?.total_tokens
                    }
                })
                .eq('id', messageId);

            if (updateError) {
                console.error("Failed to update message with result:", updateError);
            } else {
                console.log(`[Background Builder] Job completed successfully for ${messageId}`);
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
