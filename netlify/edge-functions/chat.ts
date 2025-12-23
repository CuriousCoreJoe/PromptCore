// @ts-ignore
import { GoogleGenerativeAI } from "https://esm.sh/@google/generative-ai@0.21.0";
// @ts-ignore
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.0";
// @ts-ignore
import type { Context } from "https://edge.netlify.com";

// @ts-ignore
declare const Deno: any;

export default async (req: Request, context: Context) => {
    if (req.method !== "POST") {
        return new Response("Method Not Allowed", { status: 405 });
    }

    try {
        const { messages, input, userId } = await req.json();

        // Initialize inside handler to avoid build-time crashes if env vars missing
        const supabase = createClient(
            // @ts-ignore
            Deno.env.get("SUPABASE_URL")!,
            // @ts-ignore
            Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
        );

        // @ts-ignore
        const apiKey = Deno.env.get("GEMINI_API_KEY")!;
        const genAI = new GoogleGenerativeAI(apiKey);

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
    } catch (err: any) {
        return new Response(JSON.stringify({ error: err.message }), { status: 500 });
    }
};
