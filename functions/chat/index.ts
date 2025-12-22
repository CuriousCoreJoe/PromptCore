
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { GoogleGenAI } from "npm:@google/genai";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.0";

const apiKey = Deno.env.get("GEMINI_API_KEY")!;
const genAI = new GoogleGenAI(apiKey);

const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
);

serve(async (req) => {
    const { messages, input, mode, userId } = await req.json();

    try {
        // 1. Check Credits
        const { data: profile } = await supabase
            .from("profiles")
            .select("credits")
            .eq("id", userId)
            .single();

        if (!profile || profile.credits <= 0) {
            return new Response(JSON.stringify({ error: "Insufficient credits" }), { status: 402 });
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

        // 3. Decrement Credits
        await supabase
            .from("profiles")
            .update({ credits: profile.credits - 1 })
            .eq("id", userId);

        return new Response(JSON.stringify({ text: responseText }), {
            headers: { "Content-Type": "application/json" },
        });
    } catch (err) {
        return new Response(JSON.stringify({ error: err.message }), { status: 500 });
    }
});
