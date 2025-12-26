import { Handler } from "@netlify/functions";
import Stripe from "stripe";
import { createClient } from "@supabase/supabase-js";

const handler: Handler = async (event, context) => {
    if (event.httpMethod !== "POST") {
        return { statusCode: 405, body: "Method Not Allowed" };
    }

    try {
        const { priceId, userId, type } = JSON.parse(event.body || "{}");

        const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
        const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
        const stripeKey = process.env.STRIPE_SECRET_KEY;

        if (!supabaseUrl || !supabaseKey || !stripeKey) {
            return { statusCode: 500, body: JSON.stringify({ error: "Configuration Error" }) };
        }

        const supabase = createClient(supabaseUrl, supabaseKey);
        const stripe = new Stripe(stripeKey, { apiVersion: "2023-10-16" as any });

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
            success_url: `${event.headers.origin}/?success=true`,
            cancel_url: `${event.headers.origin}/?canceled=true`,
            metadata: {
                userId,
                type,
                credits: type === 'credits' ? getCreditsFromPrice(priceId) : 0
            },
        };

        const session = await stripe.checkout.sessions.create(sessionConfig);

        return {
            statusCode: 200,
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ url: session.url }),
        };
    } catch (err: any) {
        console.error("Checkout Error:", err);
        return { statusCode: 500, body: JSON.stringify({ error: err.message }) };
    }
};

function getCreditsFromPrice(priceId: string) {
    const map: any = {
        'price_starter_pack': 750,
        'price_creator_pack': 1500,
        'price_agency_pack': 5000
    };
    return map[priceId] || 0;
}

export { handler };
