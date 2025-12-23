// @ts-ignore
import { Inngest } from "https://esm.sh/inngest@3.26.0?target=deno";
// @ts-ignore
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.0";
// @ts-ignore
import type { Context } from "https://edge.netlify.com";

// @ts-ignore
declare const Deno: any;

export default async (req: Request, context: Context) => {
    if (req.method !== "POST") {
        return new Response("Method not allowed", { status: 405 });
    }

    try {
        const { niche, count, userId } = await req.json();

        // Initialize inside handler
        const inngest = new Inngest({ id: "promptcore-app", eventKey: Deno.env.get("INNGEST_EVENT_KEY")! });

        const supabase = createClient(
            // @ts-ignore
            Deno.env.get("SUPABASE_URL")!,
            // @ts-ignore
            Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
        );

        // 1. Create the Pack record immediately
        const { data: pack, error: dbError } = await supabase
            .from("packs")
            .insert({
                user_id: userId,
                niche: niche,
                status: 'pending',
                total_count: 0
            })
            .select()
            .single();

        if (dbError) throw dbError;

        // 2. Send event to Inngest
        await inngest.send({
            name: "app/pack.requested",
            data: {
                packId: pack.id,
                niche,
                count,
                userId
            },
        });

        return new Response(JSON.stringify({ packId: pack.id }), {
            headers: { "Content-Type": "application/json" },
        });

    } catch (error: any) {
        console.error(error);
        return new Response(JSON.stringify({ error: error.message }), { status: 500 });
    }
};
