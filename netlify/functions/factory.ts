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
        const { niche, count, userId } = JSON.parse(event.body || "{}");
        console.log(`[Factory] Processing request for user: ${userId}, niche: ${niche}`);

        const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
        const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
        const inngestKey = process.env.INNGEST_EVENT_KEY;
        const openRouterKey = process.env.OPENROUTER_API_KEY;

        console.log(`[Factory] Config: URL=${supabaseUrl}, KeyLength=${supabaseKey?.length}`);

        if (!supabaseUrl || !supabaseKey || !inngestKey || !openRouterKey) {
            console.error("Missing Env Vars in factory.ts");
            return {
                statusCode: 500,
                headers,
                body: JSON.stringify({ error: "Configuration Error: Missing API Keys" })
            };
        }

        // Helper for Supabase Fetch
        const supabaseFetch = async (endpoint: string, options: any = {}) => {
            const url = `${supabaseUrl}/rest/v1/${endpoint}`;
            const res = await fetch(url, {
                ...options,
                headers: {
                    ...options.headers,
                    'apikey': supabaseKey,
                    'Authorization': `Bearer ${supabaseKey}`,
                    'Content-Type': 'application/json',
                    'Prefer': 'return=representation'
                }
            });
            if (!res.ok) {
                const text = await res.text();
                throw new Error(`Supabase Error (${res.status}): ${text}`);
            }
            return res.json();
        };

        // Helper for Auth Admin Fetch
        const authFetch = async (endpoint: string) => {
            const url = `${supabaseUrl}/auth/v1/admin/${endpoint}`;
            const res = await fetch(url, {
                headers: {
                    'apikey': supabaseKey,
                    'Authorization': `Bearer ${supabaseKey}`,
                    'Content-Type': 'application/json'
                }
            });
            if (!res.ok) {
                const text = await res.text();
                console.warn(`Auth Fetch Error (${res.status}): ${text}`);
                return null;
            }
            return res.json();
        };

        // 1. Check Credits (GET profiles)
        const profiles = await supabaseFetch(`profiles?id=eq.${userId}&select=credits,monthly_usage,last_usage_reset,subscription_status,lifetime_prompts`);
        const profile = profiles && profiles.length > 0 ? profiles[0] : null;

        if (!profile) {
            console.warn(`Profile not found for user: ${userId}. Proceeding with default values.`);
        }

        let currentCredits = profile?.credits || 0;
        let monthlyUsage = profile?.monthly_usage || 0;
        const lastReset = new Date(profile?.last_usage_reset || 0);
        const now = new Date();

        // Monthly Reset logic
        const isNewMonth = now.getMonth() !== lastReset.getMonth() || now.getFullYear() !== lastReset.getFullYear();
        if (profile && isNewMonth) {
            monthlyUsage = 0;
            const allowances: Record<string, number> = { 'free': 50, 'lite': 1000, 'pro': 2500 };
            const allowance = allowances[profile.subscription_status || 'free'] || 50;
            currentCredits = Math.max(currentCredits, allowance);

            // Update profile (PATCH)
            await supabaseFetch(`profiles?id=eq.${userId}`, {
                method: 'PATCH',
                body: JSON.stringify({
                    monthly_usage: 0,
                    credits: currentCredits,
                    last_usage_reset: now.toISOString()
                })
            });
        }

        const status = profile?.subscription_status || 'free';
        const isFree = status === 'free';

        // Cost Calculation
        const batchSize = 5;
        const batches = Math.ceil(count / batchSize);
        const baseCost = batches * 5;
        const multiplier = (isFree && monthlyUsage > 100) ? 3 : 1;
        const totalCost = baseCost * multiplier;

        // Dev Bypass
        let isDev = false;
        const isLocalDev = process.env.NETLIFY_DEV === 'true';
        if (isLocalDev) {
            isDev = true;
        } else {
            const userData = await authFetch(`users/${userId}`);
            if (userData && userData.email === 'dev@promptcore.com') {
                isDev = true;
            }
        }

        if (!isDev && currentCredits < totalCost) {
            return { statusCode: 402, headers, body: JSON.stringify({ error: `Insufficient credits. Cost: ${totalCost}, Balance: ${currentCredits}.` }) };
        }

        // 2. Create Pack (POST packs)
        const packs = await supabaseFetch('packs', {
            method: 'POST',
            body: JSON.stringify({
                user_id: userId,
                niche: niche,
                status: 'pending',
                total_count: 0
            })
        });
        const pack = packs[0];

        // 3. Deduct Credits (PATCH profiles)
        if (!isDev && profile) {
            const lifetime = profile.lifetime_prompts || 0;
            await supabaseFetch(`profiles?id=eq.${userId}`, {
                method: 'PATCH',
                body: JSON.stringify({
                    credits: Math.max(0, currentCredits - totalCost),
                    monthly_usage: monthlyUsage + totalCost,
                    lifetime_prompts: lifetime + count
                })
            });
        }

        // 4. Send event to Inngest via HTTP
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
