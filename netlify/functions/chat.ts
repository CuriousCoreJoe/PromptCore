import { Handler } from "@netlify/functions";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { createClient } from "@supabase/supabase-js";

const handler: Handler = async (event, context) => {
    if (event.httpMethod !== "POST") {
        return { statusCode: 405, body: "Method Not Allowed" };
    }

    try {
        const { messages, input, userId } = JSON.parse(event.body || "{}");

        const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
        const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
        const geminiKey = process.env.GEMINI_API_KEY;

        if (!supabaseUrl || !supabaseKey || !geminiKey) {
            console.error("Missing env vars");
            return { statusCode: 500, body: JSON.stringify({ error: "Configuration Error" }) };
        }

        const supabase = createClient(supabaseUrl, supabaseKey);
        const genAI = new GoogleGenerativeAI(geminiKey);

        // 1. Check Credits & Handle Daily Bonus
        // 1. Check Credits & Handle Daily Bonus
        const { data: profile, error: profileError } = await supabase
            .from("profiles")
            .select("credits, last_daily_bonus, lifetime_prompts")
            .eq("id", userId)
            .maybeSingle();

        if (profileError) {
            console.error("Profile Fetch Error:", profileError);
            throw new Error(`Database Error: ${profileError.message}`);
        }

        let currentCredits = profile?.credits || 0;
        const lastBonus = new Date(profile?.last_daily_bonus || 0);
        const now = new Date();
        const oneDay = 24 * 60 * 60 * 1000;

        // Daily Refresh: If 24h passed AND credits < 100, reset to 100
        if ((now.getTime() - lastBonus.getTime() > oneDay) && currentCredits < 100) {
            currentCredits = 100;
            await supabase.from("profiles").update({
                credits: 100,
                last_daily_bonus: now.toISOString()
            }).eq("id", userId);
        }

        const isDev = (await supabase.auth.admin.getUserById(userId)).data.user?.email === 'dev@promptcore.com';

        if (!isDev && currentCredits <= 0) {
            return { statusCode: 402, body: JSON.stringify({ error: "Insufficient credits" }) };
        }

        // 2. Call Gemini
        const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
        const chat = model.startChat({
            history: messages.map((m: any) => ({
                role: m.role === 'model' ? 'model' : 'user',
                parts: [{ text: m.content }]
            }))
        });

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
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ text: responseText }),
        };
    } catch (err: any) {
        console.error("Chat Error:", err);
        return { statusCode: 500, body: JSON.stringify({ error: err.message }) };
    }
};

export { handler };
