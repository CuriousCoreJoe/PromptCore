import { Handler } from "@netlify/functions";
import Stripe from "stripe";
import { createClient } from "@supabase/supabase-js";

const handler: Handler = async (event, context) => {
    if (event.httpMethod !== "POST") {
        return { statusCode: 405, body: "Method Not Allowed" };
    }

    const signature = event.headers["stripe-signature"];
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
    const stripeKey = process.env.STRIPE_SECRET_KEY;
    const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!signature || !webhookSecret || !stripeKey || !supabaseUrl || !supabaseKey) {
        return { statusCode: 500, body: "Configuration Error" };
    }

    const stripe = new Stripe(stripeKey, { apiVersion: "2023-10-16" as any });
    const supabase = createClient(supabaseUrl, supabaseKey);

    let stripeEvent;
    try {
        // Checking if body is base64 encoded (Netlify sometimes does this)
        const body = event.isBase64Encoded ? Buffer.from(event.body!, 'base64').toString('utf-8') : event.body!;
        stripeEvent = stripe.webhooks.constructEvent(body, signature, webhookSecret);
    } catch (err: any) {
        return { statusCode: 400, body: `Webhook Error: ${err.message}` };
    }

    if (stripeEvent.type === "checkout.session.completed") {
        const session = stripeEvent.data.object as any;
        const userId = session.metadata.userId;
        const type = session.metadata.type;

        if (type === 'credits') {
            const creditsToAdd = parseInt(session.metadata.credits);
            const { data: profile } = await supabase.from("profiles").select("credits").eq("id", userId).maybeSingle();
            await supabase
                .from("profiles")
                .update({ credits: (profile?.credits || 0) + creditsToAdd })
                .eq("id", userId);
        } else if (type === 'subscription') {
            await supabase
                .from("profiles")
                .update({ subscription_status: 'pro' })
                .eq("id", userId);
        }
    }

    return { statusCode: 200, body: JSON.stringify({ received: true }) };
};

export { handler };
