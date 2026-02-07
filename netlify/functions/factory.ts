import { Handler } from "@netlify/functions";

export const handler: Handler = async (event, context) => {
    console.log(`[Factory] Request received: ${event.httpMethod} ${event.path}`);
    
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
        // Dynamic import to avoid build-time issues
        const { createClient } = await import("@supabase/supabase-js");

        const { niche, count, userId } = JSON.parse(event.body || "{}");
        console.log(`[Factory] Processing request for user: ${userId}, niche: ${niche}`);

        const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
        const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
        const inngestKey = process.env.INNGEST_EVENT_KEY;
        const openRouterKey = process.env.OPENROUTER_API_KEY;

        if (!supabaseUrl || !supabaseKey || !inngestKey || !openRouterKey) {
            console.error("Missing Env Vars in factory.ts:", {
                supabaseUrl: !!supabaseUrl,
                supabaseKey: !!supabaseKey,
                inngestKey: !!inngestKey,
                openRouterKey: !!openRouterKey
            });
            return {
                statusCode: 500,
                headers,
                body: JSON.stringify({
                    error: "Configuration Error",
                    missing: [
                        !supabaseUrl && "SUPABASE_URL/VITE_SUPABASE_URL",
                        !supabaseKey && "SUPABASE_SERVICE_ROLE_KEY",
                        !inngestKey && "INNGEST_EVENT_KEY",
                        !openRouterKey && "OPENROUTER_API_KEY"
                    ].filter(Boolean)
                })
            };
        }

        const supabase = createClient(supabaseUrl, supabaseKey);

        // 1. Check Credits & Calculate Cost
        const { data: profiles, error: profileError } = await supabase
            .from("profiles")
            .select("credits, monthly_usage, last_usage_reset, subscription_status, lifetime_prompts")
            .eq("id", userId);

        const profile = profiles && profiles.length > 0 ? profiles[0] : null;

        if (profileError) {
            console.error("Profile Fetch Error:", profileError);
            throw new Error(`Database Error: ${profileError.message}`);
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
            const allowance = allowances[profile?.subscription_status || 'free'] || 50;
            currentCredits = Math.max(currentCredits, allowance);

            await supabase.from("profiles").update({
                monthly_usage: 0,
                credits: currentCredits,
                last_usage_reset: now.toISOString()
            }).eq("id", userId);
        }

        const status = profile?.subscription_status || 'free';
        const isFree = status === 'free';

        // Cost Calculation
        const batchSize = 5;
        const batches = Math.ceil(count / batchSize);
        const baseCost = batches * 5;

        // Efficiency Logic (Multiplier)
        const multiplier = (isFree && monthlyUsage > 100) ? 3 : 1;
        const totalCost = baseCost * multiplier;

        // Dev Bypass
        const { data: devUser } = await supabase.auth.admin.getUserById(userId);
        const isLocalDev = process.env.NETLIFY_DEV === 'true';
        const isDev = devUser?.user?.email === 'dev@promptcore.com' || isLocalDev;

        if (!isDev && currentCredits < totalCost) {
            return { statusCode: 402, headers, body: JSON.stringify({ error: `Insufficient credits. Standard Rate (3x) applies. Cost: ${totalCost}, Balance: ${currentCredits}. Upgrade to Creator for Preferred Rates.` }) };
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
            const lifetime = profile?.lifetime_prompts || 0;
            const { error: updateError } = await supabase
                .from("profiles")
                .update({
                    credits: Math.max(0, currentCredits - totalCost),
                    monthly_usage: monthlyUsage + totalCost,
                    lifetime_prompts: lifetime + count
                })
                .eq("id", userId);

            if (updateError) {
                console.error("Credit Deduction Error:", updateError);
            }
        }

        // 4. Send event to Inngest via HTTP (No SDK dependency)
        const inngestUrl = `https://inn.gs/e/${inngestKey}`;
        console.log(`[Factory] Sending event to Inngest: ${inngestUrl}`);
        
        const inngestResponse = await fetch(inngestUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                name: "app/pack.requested",
                data: {
                    packId: pack.id,
                    niche,
                    count,
                    userId
                },
                user: { id: userId }
            })
        });

        if (!inngestResponse.ok) {
            const errText = await inngestResponse.text();
            console.error(`Inngest API Error: ${inngestResponse.status} ${errText}`);
        } else {
            console.log("Inngest event sent successfully");
        }

        return {
            statusCode: 200,
            headers,
            body: JSON.stringify({ packId: pack.id }),
        };

    } catch (error: any) {
        console.error("Factory Error:", error);
        return { statusCode: 500, headers, body: JSON.stringify({ error: error.message }) };
    }
};
