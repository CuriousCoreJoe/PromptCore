import { Handler } from "@netlify/functions";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { createClient } from "@supabase/supabase-js";

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
        const { messages, input, userId, wizardMode = 'iterative', defaultModel = 'claude-sonnet-4.5' } = JSON.parse(event.body || "{}");

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
        // For now, we'll use Gemini for all since other APIs aren't configured yet
        // In the future, you can add logic to route to different APIs based on defaultModel
        const modelName = "gemini-2.0-flash-exp";
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

        // 2. Call Gemini
        const isIterative = wizardMode === 'iterative';
        const systemInstruction = `You are an Expert Prompt Consultant. Your goal is to refine user prompts.

PROTOCOL:
1. If you receive a message starting with 'User Goal:', interpret it as a specific instruction to IMPROVE the 'Draft Input'.
2. ${isIterative
                ? "In Iterative Mode: Ask exactly ONE clarifying question at a time. Do NOT ask multiple. Keep it conversational."
                : "In Batch Mode: Ask 2-4 clarifying questions at once in a numbered list."}
3. Once you have enough information (after 1 or more questions), use that context to GENERATE the final, high-quality prompt output.
4. FINAL OUTPUT STRUCTURE:
   a. Start with a section: '### 🧠 Strategy & Implementation'. Hand-hold the user: explain the strategy behind this prompt and what they should expect from the LLM.
   b. Follow with a section: '### 💎 Final Prompt'. 
   c. Below that header, use exactly 'FINAL PROMPT:' followed by the prompt wrapped in a markdown code block (triple backticks).
5. QUICK REPLY BUTTONS (CRITICAL - ALWAYS DO THIS):
   - For EVERY clarifying question you ask, you MUST append a special options block at the VERY END of your response (after all punctuation).
   - Format: \`[OPTIONS: Option 1, Option 2, Option 3]\`
   - Always provide 2-4 specific options that help guide the user, even if the question seems open-ended.
   - Example 1: "Do you want to include emojis?" -> "...include emojis? [OPTIONS: Yes, No, Surprise Me]"
   - Example 2: "Is this for a blog or a tweet?" -> "...blog or a tweet? [OPTIONS: Blog Post, Tweet, LinkedIn]"
   - Example 3: "What type of business?" -> "...type of business? [OPTIONS: Retail, Service, Online, Other]"
   - Example 4: "Who is your target audience?" -> "...target audience? [OPTIONS: General Public, Professionals, Students, Other]"
   - NEVER skip the OPTIONS block. Users rely on these buttons for every question.
6. Be professional, concise, and helpful.`;

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
