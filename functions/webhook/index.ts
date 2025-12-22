
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
    const signature = req.headers.get("stripe-signature")!;
    const body = await req.text();

    let event;
    try {
        event = stripe.webhooks.constructEvent(
            body,
            signature,
            Deno.env.get("STRIPE_WEBHOOK_SECRET")!
        );
    } catch (err) {
        return new Response(`Webhook Error: ${err.message}`, { status: 400 });
    }

    if (event.type === "checkout.session.completed") {
        const session = event.data.object;
        const userId = session.metadata.userId;
        const type = session.metadata.type;

        if (type === 'credits') {
            const creditsToAdd = parseInt(session.metadata.credits);
            // Update credits
            const { data: profile } = await supabase.from("profiles").select("credits").eq("id", userId).single();
            await supabase
                .from("profiles")
                .update({ credits: (profile?.credits || 0) + creditsToAdd })
                .eq("id", userId);
        } else if (type === 'subscription') {
            // Update subscription status based on price or product
            // For simplicity, setting it to 'pro' or similar
            await supabase
                .from("profiles")
                .update({ subscription_status: 'pro' })
                .eq("id", userId);
        }
    }

    return new Response(JSON.stringify({ received: true }), { status: 200 });
});
