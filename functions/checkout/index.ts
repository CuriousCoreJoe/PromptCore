
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@13.10.0?target=deno";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.0";

const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY")!, {
    apiVersion: "2023-10-16",
    httpClient: Stripe.createFetchHttpClient(),
});

const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
);

serve(async (req) => {
    const { priceId, userId, type } = await req.json();

    try {
        // 1. Get or Create Customer
        const { data: profile } = await supabase
            .from("profiles")
            .select("stripe_customer_id")
            .eq("id", userId)
            .single();

        let customerId = profile?.stripe_customer_id;

        if (!customerId) {
            const { data: user } = await supabase.auth.admin.getUserById(userId);
            const customer = await stripe.customers.create({
                email: user.user?.email,
                metadata: { supabase_uid: userId },
            });
            customerId = customer.id;
            await supabase.from("profiles").update({ stripe_customer_id: customerId }).eq("id", userId);
        }

        // 2. Create Session
        const sessionConfig: any = {
            customer: customerId,
            line_items: [{ price: priceId, quantity: 1 }],
            mode: type === 'subscription' ? 'subscription' : 'payment',
            success_url: `${req.headers.get("origin")}/?success=true`,
            cancel_url: `${req.headers.get("origin")}/?canceled=true`,
            metadata: {
                userId,
                type,
                // If it's a credit pack, we can store the amount here to update in webhook
                credits: type === 'credits' ? getCreditsFromPrice(priceId) : 0
            },
        };

        const session = await stripe.checkout.sessions.create(sessionConfig);

        return new Response(JSON.stringify({ url: session.url }), {
            headers: { "Content-Type": "application/json" },
        });
    } catch (err) {
        return new Response(JSON.stringify({ error: err.message }), { status: 500 });
    }
});

function getCreditsFromPrice(priceId: string) {
    // Mapping price IDs to credit counts
    const map: any = {
        'price_starter_pack': 500,
        'price_creator_pack': 1500,
        'price_agency_pack': 5000
    };
    return map[priceId] || 0;
}
