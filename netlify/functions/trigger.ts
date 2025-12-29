import { Handler } from "@netlify/functions";
import { Inngest } from "inngest";
import { createClient } from "@supabase/supabase-js";

const handler: Handler = async (event, context) => {
    if (event.httpMethod !== "POST") {
        return { statusCode: 405, body: "Method Not Allowed" };
    }

    try {
        const { niche, count, userId } = JSON.parse(event.body || "{}");

        const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
        const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
        const inngestKey = process.env.INNGEST_EVENT_KEY;

        if (!supabaseUrl || !supabaseKey || !inngestKey) {
            console.error("Missing Env Vars in trigger.ts:", {
                supabaseUrl: !!supabaseUrl,
                supabaseKey: !!supabaseKey,
                inngestKey: !!inngestKey
            });
            return {
                statusCode: 500,
                body: JSON.stringify({
                    error: "Configuration Error",
                    missing: [
                        !supabaseUrl && "SUPABASE_URL/VITE_SUPABASE_URL",
                        !supabaseKey && "SUPABASE_SERVICE_ROLE_KEY",
                        !inngestKey && "INNGEST_EVENT_KEY"
                    ].filter(Boolean)
                })
            };
        }

        const supabase = createClient(supabaseUrl, supabaseKey);
        const inngest = new Inngest({ id: "promptcore-app", eventKey: inngestKey });

        // 1. Check Credits & Calculate Cost
        const { data: profiles, error: profileError } = await supabase
            .from("profiles")
            .select("credits, last_daily_bonus, lifetime_prompts, subscription_status")
            .eq("id", userId);

        const profile = profiles && profiles.length > 0 ? profiles[0] : null;

        if (profileError) {
            console.error("Profile Fetch Error:", profileError);
            throw new Error(`Database Error: ${profileError.message}`);
        }

        let currentCredits = profile?.credits || 0;
        const lastBonus = new Date(profile?.last_daily_bonus || 0);
        const now = new Date();
        const oneDay = 24 * 60 * 60 * 1000;

        // Daily Refresh
        if ((now.getTime() - lastBonus.getTime() > oneDay) && currentCredits < 100) {
            currentCredits = 100;
            // Fire and forget update for speed, or await if critical
            await supabase.from("profiles").update({
                credits: 100,
                last_daily_bonus: now.toISOString()
            }).eq("id", userId);
        }

        // Dev Bypass
        const { data: devUser } = await supabase.auth.admin.getUserById(userId);
        const isDev = devUser?.user?.email === 'dev@promptcore.com';

        const lifetime = profile?.lifetime_prompts || 0;
        const isPro = profile?.subscription_status === 'pro';

        // Cost Calculation
        // Rule 1: Catch -> If Free AND lifetime >= 500, Base Cost is 2. Else 1.
        // Pro users are EXEMPT from the catch (always 1).
        const baseCost = (lifetime >= 500 && !isPro) ? 2 : 1;

        // Rule 2: Tiered Logic -> First 50 @ Base, Excess @ 1.5x Base
        let totalCost = 0;
        const tier1Limit = 50;

        if (count <= tier1Limit) {
            totalCost = count * baseCost;
        } else {
            const tier1Cost = tier1Limit * baseCost;
            const excessCount = count - tier1Limit;
            const tier2Cost = excessCount * (baseCost * 1.5);
            totalCost = tier1Cost + tier2Cost;
        }

        if (!isDev && currentCredits < totalCost) {
            return { statusCode: 402, body: JSON.stringify({ error: `Insufficient credits. Cost: ${totalCost}, Balance: ${currentCredits}` }) };
        }

        // 2. Create the Pack record immediately
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

        if (dbError) {
            console.error("Pack Insert Error:", dbError);
            throw new Error(`Failed to create pack: ${dbError.message}`);
        }

        // 3. Deduct Credits & Update Lifetime (if not dev)
        if (!isDev) {
            const { error: updateError } = await supabase
                .from("profiles")
                .update({
                    credits: currentCredits - totalCost,
                    lifetime_prompts: lifetime + count
                })
                .eq("id", userId);

            if (updateError) {
                console.error("Credit Deduction Error:", updateError);
                // We don't rollback the pack for now, but good to know
            }
        }

        // 4. Send event to Inngest
        await inngest.send({
            name: "app/pack.requested",
            data: {
                packId: pack.id,
                niche,
                count,
                userId
            },
        });

        return {
            statusCode: 200,
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ packId: pack.id }),
        };

    } catch (error: any) {
        console.error("Trigger Error:", error);
        return { statusCode: 500, body: JSON.stringify({ error: error.message }) };
    }
};

export { handler };
