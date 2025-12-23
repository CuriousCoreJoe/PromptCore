// @ts-ignore
import Stripe from "https://esm.sh/stripe@13.10.0?target=deno";
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
        const signature = req.headers.get("stripe-signature")!;
        const body = await req.text();

        // Initialize inside handler
        const supabase = createClient(
            // @ts-ignore
            Deno.env.get("SUPABASE_URL")!,
            // @ts-ignore
            Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
        );

        // @ts-ignore
        const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY")!, {
            apiVersion: "2023-10-16",
            httpClient: Stripe.createFetchHttpClient(),
        });

        let event;
        try {
            event = stripe.webhooks.constructEvent(
                body,
                signature,
                // @ts-ignore
                Deno.env.get("STRIPE_WEBHOOK_SECRET")!
            );
        } catch (err: any) {
            return new Response(`Webhook Error: ${err.message}`, { status: 400 });
        }

        if (event.type === "checkout.session.completed") {
            const session = event.data.object;
            const userId = session.metadata.userId;
            const type = session.metadata.type;

            if (type === 'credits') {
                const creditsToAdd = parseInt(session.metadata.credits);
                const { data: profile } = await supabase.from("profiles").select("credits").eq("id", userId).single();
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

        return new Response(JSON.stringify({ received: true }), { status: 200 });
    } catch (err: any) {
        return new Response(JSON.stringify({ error: err.message }), { status: 500 });
    }
};
